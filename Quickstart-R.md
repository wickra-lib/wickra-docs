# Quickstart: R

> **Verified against the Rust reference.** Every one of Wickra's 514 indicators is replayed through all 10 languages and checked bit-for-bit against the Rust core's golden fixtures in CI — the math here is provably identical to every other binding ([how](FAQ#do-all-the-language-bindings-compute-the-same-values)).

A five-minute tour of the Wickra R binding — a `.Call` shim on the C ABI hub.
By the end you will have streamed an RSI, run a batch SMA, and read a
multi-output MACD, all from idiomatic R.

## Install

The package compiles a thin `.Call` glue layer against the prebuilt Wickra C ABI
library, so a C toolchain (Rtools on Windows) is required, plus the C ABI header
and library. Build the library from the workspace, then install the package
pointing at it:

```bash
cargo build -p wickra-c --release
WICKRA_INCLUDE_DIR="$PWD/bindings/c/include" \
WICKRA_LIB_DIR="$PWD/target/release" \
R CMD INSTALL bindings/r
```

On Windows the C ABI DLL is bundled into the package and put on the load path
automatically; on Linux and macOS the library path is baked in via rpath.

## The object shape

Every indicator is a constructor returning a `wickra_indicator` object over an
opaque native handle, with the same operations as the C ABI underneath:

```r
library(wickra)

sma <- Sma(14)             # stops with an error on invalid params
w <- warmup_period(sma)    # updates until ready: 14
v <- update(sma, 42)       # NA while warming up
ready <- is_ready(sma)     # FALSE until warmed up
reset(sma)                 # back to a fresh state
# the native handle is freed automatically when `sma` is garbage-collected
```

The alt-chart bar builders (`RenkoBars()`, `KagiBars()`, …) have no
`warmup_period()` / `is_ready()` — a candle can complete 0..n bars, so they have
no warmup.

`update()` never revisits the history behind the tick. Handles are released by
a registered finalizer, so
there is nothing to free by hand.

## Streaming and batch side by side

```r
library(wickra)

# 1. Streaming: feed Wilder's textbook example into RSI(14).
rsi <- Rsi(14)
prices <- c(
  44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42,
  45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00
)
for (i in seq_along(prices)) {
  r <- update(rsi, prices[i])
  if (!is.na(r)) {           # NA during the 15-bar warmup
    cat(sprintf("tick %2d  rsi=%.4f\n", i, r))
  }
}

# 2. Batch: one SMA(3) call over five prices writes NA at warmup.
batch(Sma(3), c(1, 2, 3, 4, 5))
# -> NA NA 2 3 4
```

The first RSI value lands on tick 15. Batch output is bit-for-bit identical to
feeding the same inputs through `update()` one at a time.

## Multi-output indicators

Indicators with several outputs (MACD, Bollinger, ADX, …) return a named numeric
vector — `NA` while warming up, real values once one is ready:

```r
macd <- MacdIndicator(12, 26, 9)
for (price in feed) {
  m <- update(macd, price)
  if (!is.na(m[["macd"]])) {
    cat(sprintf("macd=%.4f signal=%.4f hist=%.4f\n",
                m[["macd"]], m[["signal"]], m[["histogram"]]))
  }
}
```

Candle-input indicators (ATR, ADX, OBV, …) take the OHLCV fields plus a
timestamp, e.g. `update(atr, open, high, low, close, volume, timestamp)`. Bar
builders return a matrix of completed bars; profile indicators return a list.

## A deeper example

[`examples/r/backtest.R`](https://github.com/wickra-lib/wickra/blob/main/examples/r/backtest.R)
runs a basket of indicators over an OHLCV series; the `examples/r/` directory
also has a multi-indicator streaming demo, multi-timeframe resampling, an
`mclapply` fan-out, three strategy examples, and Binance fetch/live examples.
Build and install once, then run any of them:

```bash
cargo build -p wickra-c --release
WICKRA_INCLUDE_DIR="$PWD/bindings/c/include" WICKRA_LIB_DIR="$PWD/target/release" \
  R CMD INSTALL bindings/r
cd examples/r && Rscript streaming.R
```

## See also

- [Quickstart: C](Quickstart-C) — the C ABI hub the R binding links against.
- [Streaming vs Batch](Streaming-vs-Batch) — the `batch == repeated update`
  contract that holds across every binding.
- [Indicators overview](Indicators-Overview) — the full catalogue.
- Source: <https://github.com/wickra-lib/wickra>
