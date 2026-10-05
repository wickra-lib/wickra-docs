---
description: "Wickra FAQ — batch vs streaming parity, the exact fast batch, binding parity, warmup and NaN handling, thread safety, speed, custom indicators and how Wickra differs from TA-Lib."
---

# FAQ

Frequently asked questions about Wickra. If yours is not here, check the
[issue tracker](https://github.com/wickra-lib/wickra/issues) or open a new
issue.

## Will batch and streaming produce the same result?

Yes — bit-identical. For most indicators `batch(prices)` simply calls
`update(p)` for every `p` in the input; the hot ones (SMA, EMA, RSI, MACD,
Bollinger Bands, ATR, the Chaikin oscillator, Pearson correlation and a few
more) run a fused path instead, written to perform the same arithmetic in the
same order. The unit test `batch_equals_streaming` pins the equality for every
indicator, an adversarial-input test replays every scalar indicator both ways
and compares the bits, and the fuzz target does the same on arbitrary input.
See [Streaming vs Batch](Streaming-vs-Batch) for the full contract.

## What is the fast batch, and is it exact?

`batch_fast` (`batchFast` / `BatchFast` in the camel- and Pascal-case bindings)
is an opt-in batch for throughput. Where an indicator has a SIMD kernel —
moving averages, RSI, ATR, MACD, Bollinger Bands, the Chaikin oscillator,
skewness, Pearson correlation and more — it reorders the arithmetic, so each
value agrees with `batch` to within a few units in the last place rather than
bit for bit. `NaN` placement and length are identical, the result is the same
on every platform and CPU (the vector and portable paths compute identically),
and afterwards the indicator streams on from the same state. Where there is no
kernel it is `batch` exactly. Use `batch` when you need bit-for-bit agreement
with streaming; use `batch_fast` when a backfill's speed matters more. See
[Streaming vs Batch](Streaming-vs-Batch#the-opt-in-fast-batch).

## Do all the language bindings compute the same values?

Yes — proven, not promised. The Rust core emits a shared golden fixture (a
deterministic input series plus its reference output) for every one of the 514
indicators, and **all 10 languages** — Rust, Python, Node.js, WASM, C, C++, C#,
Go, Java and R — replay that input and are checked **bit-for-bit against the
Rust reference in CI**. There is one implementation; every binding is verified
to match it exactly (this check has already caught and fixed real cross-language
marshalling bugs).

## What does `warmup_period()` mean?

It's the number of inputs an indicator needs before it emits its first
non-`None` value. For RSI(14) that's 15 (14 diffs plus the seed); for
SMA(20) it's 20; for MACD(12, 26, 9) it's 34 (`slow + signal − 1`). After
warmup the indicator never goes back to `None`. The complete table lives
at [Warmup Periods](Warmup-Periods).

## Why am I getting `None` / `NaN` for the first N values?

That's the warmup. Use `is_ready()` (or the corresponding `isReady()` in
Node, `is_ready()` in Python) to gate your code on "do I have a real
value yet?" rather than counting inputs yourself:

```python
import wickra as ta
rsi = ta.RSI(14)
for price in feed:
    rsi.update(price)
    if rsi.is_ready():
        ...
```

## Which indicator should I use for X?

A short cheat-sheet (full version at the bottom of
[Indicators Overview](Indicators-Overview)):

- **trend direction** → MA family (`SMA`, `EMA`, `HMA`, `T3`, `KAMA`)
- **trend strength** → `ADX`, `ChoppinessIndex`, `VerticalHorizontalFilter`
- **overbought / oversold** → `RSI`, `Stochastic`, `Williams %R`, `MFI`
- **volatility** → `ATR`, `TrueRange`, `ChaikinVolatility`, `StdDev`
- **breakout level** → `Donchian`, `BollingerBands`
- **trailing stop** → `PSAR`, `SuperTrend`, `ChandelierExit`,
  `AtrTrailingStop`
- **volume confirmation** → `OBV`, `ChaikinMoneyFlow`, `VWAP`

## Is a single indicator instance thread-safe?

No. `update` mutates state, so a single instance must not be shared across
threads. Each thread should own its own indicator. For multi-asset
parallelism, the Rust crate provides `BatchExt::batch_parallel`, which
fans out over many series each with its own fresh instance behind the
default `parallel` feature (rayon). Node's `worker_threads` gives the
same shape from JavaScript — see `examples/node/parallel_assets.js`.

## Does Wickra need a system compiler to install?

No. Every published wheel (PyPI), npm package, and crate ships pre-built
artefacts. `pip install wickra` and `npm install wickra` are
no-prerequisite installs on Linux, macOS, and Windows x64 / arm64. The
only time you need a toolchain is when you are building Wickra from
source.

## How do I handle non-finite inputs (NaN / Inf)?

The scalar indicators (`SMA`, `EMA`, `WMA`, `RSI`, `ROC`, …) return the
most recent valid value when fed a non-finite input, leaving their state
untouched. That lets a missing price in your feed pass through without
poisoning the rest of the series. `ATR` and the volume-aware indicators
reject non-finite volume at the `Candle::new` boundary, so an aggregator
that overflows surfaces an error instead of producing a corrupted candle
(see [Data Layer](Data-Layer)).

## How fast is Wickra?

The streaming path is O(1) in the input length — the per-tick cost does not
grow with how much history you have already seen. It is bounded by the window
you configure instead: most indicators do constant work, and the ones that need
an order statistic or a full-window pass scale with the period, never with the
series. In Python the exact batch beats TA-Lib on RSI, MACD and ATR, and the
opt-in fast batch leads TA-Lib and tulipy on every indicator measured; per tick
Wickra is 9–56× faster than `talipp` (the only incremental Python peer) and
thousands of times faster than the libraries that recompute. Against the other
Rust TA crates (`kand`, `ta-rs`, `yata`) the fast batch wins every indicator and
the exact batch RSI, MACD, Bollinger and ATR; per tick `ta-rs`, which skips
warmup and validation, leads. In .NET, on QuanTAlib's own benchmark setup, the
fast batch leads SMA, EMA and correlation and comes within 3–20 % on the
other four, and streaming is 1.3–4.2× faster than QuanTAlib's on five of
seven indicators. BENCHMARKS.md has the full tables.

## How do I add a custom indicator?

Implement the `Indicator` trait in
`crates/wickra-core/src/indicators/<your_name>.rs`, wire it through the
bindings, and add reference-value plus `batch == streaming` equivalence
tests. The complete how-to and the project's standards are in
[CONTRIBUTING.md](https://github.com/wickra-lib/wickra/blob/main/CONTRIBUTING.md).

## Where do I get historical OHLCV data to test with?

The repo ships seven real BTCUSDT datasets at
`examples/data/btcusdt-{1m,5m,15m,1h,12h,1d,1month}.csv` (50 000 / 10 000 /
10 000 / 10 000 / 5 000 / 3 200 / 105 candles respectively). Refresh them
with the latest market history via
`cargo run -p wickra-examples --bin fetch_btcusdt`. See
[Data Layer](Data-Layer) for the full story.

## How is Wickra different from TA-Lib / pandas-ta / talipp?

- TA-Lib and pandas-ta are batch-only — every new tick triggers a full
  recomputation. Wickra never revisits the history behind the tick. The
  numerical results are the
  same; the speed gap shows up in live trading and large backtests.
- talipp is streaming-first like Wickra but Python-only and slower per
  update.
- `finta` is batch-only and pure-Python.
- `ta-lib-python` and TA-Lib both require C build tooling on Windows;
  Wickra ships pre-built native wheels.

See the [TA-Lib Migration](TA-Lib-Migration) guide for a direct
function-by-function mapping.

## See also

- [Home](./) — documentation home.
- [Streaming vs Batch](Streaming-vs-Batch) — the central design idea.
- [TA-Lib Migration](TA-Lib-Migration) — function-by-function mapping
  table.
- [Cookbook](Cookbook) — practical strategy recipes.
