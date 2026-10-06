---
description: "Why Wickra's batch API is a loop over Indicator::update: the update contract, bit-identical batch/streaming results, the SIMD fast batch and benchmark numbers."
---

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

The project's BENCHMARKS.md carries the full, current benchmark tables;
`python -m benchmarks.compare_libraries`, `cargo bench -p wickra-bench` and the
.NET harness in `bindings/csharp/cross-library` are the source scripts. In
summary:

- **Python batch** (20 000-bar full pass): the exact `batch` runs each indicator
  in roughly 20–75 µs and beats TA-Lib on RSI, MACD and ATR; the opt-in
  `batch_fast` runs in 9–33 µs and leads TA-Lib and tulipy on every indicator
  measured.
- **Python streaming** (one `update` per tick): Wickra updates in roughly
  0.06–0.10 µs/tick, about 9–56× faster than `talipp`, the only Python library
  with a true incremental API, and thousands of times faster than the libraries
  that recompute the history on every tick.
- **Rust core** (vs the other Rust TA crates `kand`, `ta-rs`, `yata`): the fast
  batch beats `kand` on every indicator and the exact batch on RSI, MACD,
  Bollinger and ATR; streaming is a mixed picture — Wickra leads `kand` on RSI,
  Bollinger and ATR, and `ta-rs`, which skips warmup and validation, leads the
  per-tick table. The per-indicator numbers, including the losses, are in
  BENCHMARKS.md.
- **.NET** (QuanTAlib's own setup, 500 000 bars, period 220): the fast batch
  leads QuanTAlib's span batches on SMA, EMA and correlation and trails them by
  3–20 % on WMA, HMA, ADOSC and skewness; streaming is level on SMA and EMA
  and 1.3–4.2× faster than QuanTAlib's on the other five.

The streaming advantage over batch-only libraries widens linearly with how much
history they must recompute on every new tick.

## Per-binding throughput

Every binding calls the **same** Rust core, so the cost that differs between them
is the FFI boundary, not the algorithm. Each ships a `throughput` benchmark; here
is `SMA(20)` over 200 000 bars (the better of two runs, each the median of 3,
AMD Ryzen 9 9950X, all targets in one session), in million updates per second:

| Target               | streaming | batch | fast batch | fast into a reused buffer |
|----------------------|----------:|------:|-----------:|--------------------------:|
| Rust core (no FFI)   |     1 362 | 1 144 |      3 068 |                     3 068 |
| C / C++              |       397 | 1 131 |      3 140 |                     3 140 |
| C#                   |       345 |   739 |      1 263 |                     3 072 |
| Go                   |      24.5 |   998 |      2 290 |                     2 960 |
| Java                 |       255 |   950 |      1 120 |                     2 778 |
| R                    |       0.4 |   623 |      1 031 |                         — |
| WASM                 |      34.8 |   380 |        402 |                         — |
| Python               |      27.5 |   530 |        752 |                         — |
| Node.js              |       5.4 |    11 |      1 256 |                     3 160 |

The Rust core and the C ABI write their batches into a reused buffer; they have
no allocating form.

This is exactly the streaming-vs-batch story at the binding layer: a per-tick
`update` crosses the boundary once per value, so streaming throughput exposes the
boundary cost (the raw C ABI is nearly free; R's interpreter loop is thousands of
times slower than its own batch). A single `batch` call crosses once and the core
does the rest, so batch stays high for every binding that returns a contiguous
buffer — Node's `batch` still returns a JS `Array` and is the low outlier, while
its `batchFast` returns a `Float64Array`. Writing into a buffer the caller reuses
(C#'s `Span` overloads, Go's `BatchFastInto`, Java's native `MemorySegment`s,
Node's `batchFastInto`, the C ABI itself) takes the page faults of a fresh result
out of the loop and reaches the Rust ceiling. These are machine-dependent FFI-overhead numbers, not a speed
claim — see [BENCHMARKS.md §3](https://github.com/wickra-lib/wickra/blob/main/BENCHMARKS.md).

## The opt-in fast batch

`batch` is bit for bit what `update` gives, and every binding keeps it that way.
Beside it, every language has an opt-in fast batch — `batch_fast` (Rust,
Python, R), `batchFast` (Node, WASM, Java), `BatchFast` (C#, Go),
`wickra_<name>_batch_fast` (C) — with the same arguments and the same return
shape:

- **Where an indicator has a SIMD kernel** (SMA, EMA, WMA, HMA, TRIMA, SMMA,
  DEMA, TEMA, RSI, MACD, MACDFIX, Bollinger Bands, ATR, the Chaikin oscillator, skewness,
  Pearson correlation), the kernel reorders the arithmetic, so each value agrees
  with `batch` to within a few units in the last place rather than bit for bit.
- **`NaN` placement and length are identical,** and so is the state afterwards:
  the indicator streams on exactly as if it had been fed one value at a time.
- **The result is the same on every platform and CPU.** The vector and portable
  paths perform the same operations in the same order; nothing depends on
  which instructions the machine happens to have.
- **Without a kernel it is `batch` exactly,** and so is any input a kernel does
  not take (a non-finite value, a magnitude beyond `1e100`, an indicator that
  has already been fed): the fast batch falls back to the exact one.

Use `batch` wherever you compare against streaming bit for bit (a backtest that
must reproduce a live run, a regression fixture); use `batch_fast` when a
backfill's throughput matters more. The per-language quickstarts show the calls,
including the forms that write into a buffer you reuse.

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
