# Quickstart: Go

A five-minute tour of the Wickra Go binding — a cgo stecker on the C ABI hub. By
the end you will have streamed an RSI, run a batch SMA, and read a multi-output
MACD, all as idiomatic Go.

## Install

```bash
go get github.com/wickra-lib/wickra/bindings/go
```

The binding uses cgo, so a C compiler is required, and it links against the
prebuilt Wickra C ABI library. Build that library from the workspace and stage it
under the package's `lib/` directory:

```bash
cargo build -p wickra-c --release
cp target/release/libwickra.so    bindings/go/lib/   # Linux
cp target/release/libwickra.dylib bindings/go/lib/   # macOS
cp target/release/wickra.dll      bindings/go/lib/   # Windows (also on PATH at run time)
```

On Linux and macOS the library path is baked in via rpath; on Windows the DLL
must be discoverable at run time (next to the executable or on `PATH`).

## The type shape

Every indicator is a type over an opaque native handle, with the same operations
as the C ABI underneath:

```go
import wickra "github.com/wickra-lib/wickra/bindings/go"

sma, err := wickra.NewSma(14) // err is ErrInvalidParams on invalid params
if err != nil {
	panic(err)
}
defer sma.Close() // frees the handle (a finalizer is a backstop)

v := sma.Update(42.0) // NaN while warming up
sma.Reset()           // back to a fresh state
```

`Update` is O(1) per call. Prefer `defer x.Close()` for prompt cleanup; a
`runtime.SetFinalizer` also frees the handle, so a missed `Close` never leaks
permanently.

## Streaming and batch side by side

```go
package main

import (
	"fmt"
	"math"

	wickra "github.com/wickra-lib/wickra/bindings/go"
)

func main() {
	// 1. Streaming: feed Wilder's textbook example into RSI(14).
	rsi, _ := wickra.NewRsi(14)
	defer rsi.Close()
	prices := []float64{
		44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42,
		45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00,
	}
	for i, p := range prices {
		r := rsi.Update(p)
		if !math.IsNaN(r) { // NaN during the 15-bar warmup
			fmt.Printf("tick %2d  rsi=%.4f\n", i+1, r)
		}
	}

	// 2. Batch: one SMA(3) call over five prices writes NaN at warmup.
	sma, _ := wickra.NewSma(3)
	defer sma.Close()
	out := sma.Batch([]float64{1, 2, 3, 4, 5})
	// out -> { NaN, NaN, 2.0, 3.0, 4.0 }
	_ = out
}
```

The first RSI value lands on tick 15. Batch output is bit-for-bit identical to
feeding the same inputs through `Update` one at a time.

## Multi-output indicators

Indicators with several outputs (MACD, Bollinger, ADX, …) return a value plus a
`bool` — `false` while warming up, `true` once a value is ready:

```go
macd, _ := wickra.NewMacdIndicator(12, 26, 9)
defer macd.Close()
for _, price := range feed {
	if m, ok := macd.Update(price); ok {
		fmt.Printf("macd=%.4f signal=%.4f hist=%.4f\n", m.Macd, m.Signal, m.Histogram)
	}
}
```

Candle-input indicators (ATR, ADX, OBV, …) take the OHLCV fields plus a
timestamp, e.g. `atr.Update(open, high, low, close, volume, timestamp)`.

## A deeper example

[`examples/go/backtest`](https://github.com/wickra-lib/wickra/blob/main/examples/go/backtest/main.go)
runs a basket of indicators over an OHLCV series; the `examples/go/` directory
also has a multi-indicator streaming demo, multi-timeframe resampling, a
goroutine fan-out, three strategy examples, and Binance fetch/live examples.
Build and stage the C ABI once, then run any of them:

```bash
cargo build -p wickra-c --release
cp target/release/libwickra.so bindings/go/lib/   # .dylib on macOS, wickra.dll on Windows
cd examples/go && go run ./streaming
```

## See also

- [Quickstart: C](Quickstart-C) — the C ABI hub the Go binding links against.
- [Streaming vs Batch](Streaming-vs-Batch) — the `batch == repeated update`
  contract that holds across every binding.
- [Indicators overview](Indicators-Overview) — the full catalogue.
- Source: <https://github.com/wickra-lib/wickra>
