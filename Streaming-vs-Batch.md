# Streaming vs Batch

Wickra has one engine, not two. Every indicator is a state machine driven by
a single method, `Indicator::update`, and the batch API is a thin loop over
that method. This page is the concept doc for why that matters, and what
contracts you can rely on when you mix the two in real code.

## The `update` contract

`Indicator::update` is the only state transition. From `crates/wickra-core/src/traits.rs`:

```rust
pub trait Indicator {
    type Input;
    type Output;

    /// Feed one new data point into the indicator and return the freshly computed
    /// output, or `None` if the indicator is still warming up.
    fn update(&mut self, input: Self::Input) -> Option<Self::Output>;

    fn reset(&mut self);
    fn warmup_period(&self) -> usize;
    fn is_ready(&self) -> bool;
    fn name(&self) -> &'static str;
}
```

Three properties hold by contract:

1. **O(1) in the input length.** `update` may touch some pre-existing
   buffered state, but it must never recompute over the entire history. The
   `wickra-core` crate is `#![forbid(unsafe_code)]`, and the standard
   indicator implementations all carry rolling sums, single recursive
   accumulators, or fixed-size `VecDeque` windows.
2. **`None` during warmup, `Some` thereafter.** An indicator returns `None`
   while it doesn't yet have enough data to produce a defined value. After
   the first `Some`, it never goes back to `None` (short of a `reset()`).
3. **`reset()` restores construction-time state.** The state-machine is
   fully encapsulated, so resetting and replaying produces bit-identical
   results to a fresh instance.

## The `BatchExt` blanket implementation

The batch API is a blanket extension on top of every `Indicator`. The whole
implementation is six lines:

```rust
use wickra::Indicator;

pub trait BatchExt: Indicator {
    fn batch(&mut self, inputs: &[Self::Input]) -> Vec<Option<Self::Output>>
    where Self::Input: Clone,
    {
        let mut out = Vec::with_capacity(inputs.len());
        for x in inputs {
            out.push(self.update(x.clone()));
        }
        out
    }
}

impl<T: Indicator> BatchExt for T {}
```

Two consequences:

- **`batch == repeated update`, exactly.** There is no separate "vectorised"
  code path that might disagree numerically with the streaming one. A unit
  test pinning this invariant — `batch_equals_streaming` — lives in nearly
  every `crates/wickra-core/src/indicators/<name>.rs` file. You can rely on
  the batch results in your backtest matching the streaming results that
  your live bot will see.
- **Implementing one trait is enough.** Adding a new indicator means
  implementing `Indicator` in Rust; every binding plus every batch helper
  comes along for free.

You can verify the equivalence yourself in Python:

```python
import numpy as np
import wickra as ta

np.random.seed(0)
prices = np.cumsum(np.random.randn(100)) + 100.0

# Batch path. `batch` hands back an `array.array('d')`, which NumPy reads
# through the buffer protocol; wrap it to index with a boolean mask below.
batch_out = np.asarray(ta.RSI(14).batch(prices))

# Streaming path: same inputs, fresh indicator, fed one at a time.
rsi = ta.RSI(14)
stream_out = np.array(
    [np.nan if (v := rsi.update(p)) is None else v for p in prices]
)

b_nan = np.isnan(batch_out)
s_nan = np.isnan(stream_out)
assert np.array_equal(b_nan, s_nan)
assert np.array_equal(batch_out[~b_nan], stream_out[~s_nan])
```

This passes; the last three values of both arrays are
`[69.64533252, 70.00767057, 71.18111330]`.

## Why batch-only libraries fall behind live

Suppose a strategy looks at RSI(14) on each new minute-bar of a market. A
classical batch-only library (TA-Lib, pandas-ta, finta, ...) gives you a
single function `rsi(prices)` that recomputes the indicator over the entire
input array. To use it inside a streaming loop, you concatenate each new
tick onto your history and call `rsi(history)` again. That's
`O(n)` work for every new bar, and the gap widens linearly as `n` grows.

Wickra's `update` is the opposite: a new bar costs the same whether it is the
tenth or the ten-millionth, because the state it needs is already inside the
indicator. You never carry history just to recompute it.

The project README carries the full, current benchmark tables;
`python -m benchmarks.compare_libraries` and `cargo bench -p wickra-bench` are
the source scripts. In summary:

- **Python batch** (20 000-bar full pass): Wickra runs each indicator in
  roughly 22–130 µs — about 6–47× faster than `finta`, the fastest pure-Python
  peer that installs cleanly on a desktop.
- **Python streaming** (one `update` per tick): Wickra updates in roughly
  0.06–0.11 µs/tick, about 11–56× faster than `talipp`, the only Python library
  with a true incremental API.
- **Rust core** (vs the other Rust TA crates `kand`, `ta-rs`, `yata`): an
  honest mixed picture — Wickra leads RSI, Bollinger and ATR, and trails the
  leaner crates on the pure recurrences (EMA, MACD) and SMA. The per-indicator
  numbers, including the losses, are in the README.

The streaming advantage over batch-only libraries widens linearly with how much
history they must recompute on every new tick.

## Per-binding throughput

Every binding calls the **same** Rust core, so the cost that differs between them
is the FFI boundary, not the algorithm. Each ships a `throughput` benchmark; here
is `SMA(20)` over 200 000 bars (median of 3, AMD Ryzen 9 9950X), in million
updates per second:

| Target               | streaming (Mupd/s) | batch (Mupd/s) |
|----------------------|-------------------:|---------------:|
| Rust core (no FFI)   |                380 |            498 |
| C / C++              |                365 |            358 |
| C#                   |                348 |            259 |
| Python               |                 31 |             46 |
| Java                 |                 38 |            173 |
| Go                   |                 23 |            394 |
| WASM                 |                 21 |            169 |
| Node.js              |                 16 |              9 |
| R                    |                0.1 |            279 |

This is exactly the streaming-vs-batch story at the binding layer: a per-tick
`update` crosses the boundary once per value, so streaming throughput exposes the
boundary cost (the raw C ABI sits just under the FFI-free Rust ceiling; R's
interpreter loop is ~2800× slower than its own batch). A single `batch` call
crosses once and the core does the rest, so batch stays high for the bindings that
return a contiguous buffer; Node (a JS `Array`) and Python (a stdlib `array.array`,
now that NumPy is optional) copy on the way out and are the two low outliers. These
are machine-dependent FFI-overhead numbers, not a speed claim —
see [BENCHMARKS.md §3](https://github.com/wickra-lib/wickra/blob/main/BENCHMARKS.md).

## Practical consequences

- **Mix freely.** A common pattern is "warm up the indicator on historical
  bars in one `batch` call, then drive it tick-by-tick with `update` for
  live data". This is correct because the two paths share state.
- **`is_ready()` is the safe gate.** Don't use a `len(prices) > warmup_period`
  check; trust the indicator's `is_ready()` method, which is `true` exactly
  when at least one `Some` value has been emitted.
- **Multi-output indicators NaN/None together.** Every column of a MACD or
  Bollinger batch transitions from `NaN` to a real value on the same row.
  Use `~np.isnan(out[:, 0])` (Python) or `Number.isFinite(row[0])`
  (Node) as a single mask across all columns.

## See also

- [Quickstart: Python](Quickstart-Python) — concrete Python usage of both
  paths.
- [Quickstart: Rust](Quickstart-Rust) — the `BatchExt` trait and `?`
  error handling.
- [Warmup Periods](Warmup-Periods) — the exact `warmup_period()` for
  every indicator.
- [Per-binding throughput](https://github.com/wickra-lib/wickra/blob/main/BENCHMARKS.md)
  — BENCHMARKS.md §3: raw updates/sec for each language binding (C, C++, C#, Go, Java,
  Python, R, WASM and the Rust core baseline), measuring FFI overhead rather than
  a cross-library comparison.
- Source: <https://github.com/wickra-lib/wickra>
