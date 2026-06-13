# Quickstart: C#

A five-minute tour of the Wickra C# binding — the first language shim on the
C ABI hub. By the end you will have streamed an RSI, run a batch SMA, and read a
multi-output MACD, all as idiomatic C#.

## Install

The binding ships on NuGet as `Wickra` with the native library prebuilt for every
supported platform (Linux, macOS, Windows — x64 and arm64); there is nothing to
compile.

```bash
dotnet add package Wickra
```

It targets .NET 8 and later.

## The class shape

Every indicator is an `IDisposable` class over an opaque native handle, with the
same five operations as the C ABI underneath:

```csharp
using Wickra;

using var sma = new Sma(14);     // throws ArgumentException on invalid params
double v = sma.Update(42.0);     // NaN while warming up
sma.Reset();                     // back to a fresh state
// disposed (freed) at the end of the using scope
```

`Update` is O(1) per call. Prefer `using` for deterministic cleanup; a
`SafeHandle` also frees the handle from the finalizer, so a missed `Dispose`
never leaks permanently.

## Streaming and batch side by side

```csharp
using Wickra;

// 1. Streaming: feed Wilder's textbook example into RSI(14).
using var rsi = new Rsi(14);
double[] prices =
{
    44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42,
    45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00,
};
for (var i = 0; i < prices.Length; i++)
{
    var r = rsi.Update(prices[i]);
    if (double.IsFinite(r)) // NaN during the 15-bar warmup
    {
        Console.WriteLine($"tick {i + 1,2}  rsi={r:F4}");
    }
}

// 2. Batch: one SMA(3) call over five prices writes NaN at warmup.
using var sma = new Sma(3);
double[] outValues = sma.Batch(new double[] { 1, 2, 3, 4, 5 });
// outValues -> { NaN, NaN, 2.0, 3.0, 4.0 }
```

The first RSI value lands on tick 15. Batch output is bit-for-bit identical to
feeding the same inputs through `Update` one at a time.

## Multi-output indicators

Indicators with several outputs (MACD, Bollinger, ADX, …) return a nullable
`record struct` — `null` while warming up, a value once one is ready:

```csharp
using var macd = new MacdIndicator(12, 26, 9);
foreach (var price in feed)
{
    if (macd.Update(price) is { } m)
    {
        Console.WriteLine($"macd={m.Macd:F4} signal={m.Signal:F4} hist={m.Histogram:F4}");
    }
}
```

Candle-input indicators (ATR, ADX, OBV, …) take the OHLCV fields plus a
timestamp, e.g. `atr.Update(open, high, low, close, volume, timestamp)`.

## A deeper example

[`examples/csharp/backtest`](https://github.com/wickra-lib/wickra/blob/main/examples/csharp/backtest/Program.cs)
runs a basket of indicators over an OHLCV series; the `examples/csharp/`
directory also has a multi-indicator streaming demo, multi-timeframe resampling,
a `Parallel.For` fan-out, three strategy examples, and Binance fetch/live
examples. Build the C ABI once, then run any of them:

```bash
cargo build -p wickra-c --release
dotnet run --project examples/csharp/streaming
```

## See also

- [Quickstart: C](Quickstart-C) — the C ABI hub the C# binding links against.
- [Streaming vs Batch](Streaming-vs-Batch) — the `batch == repeated update`
  contract that holds across every binding.
- [Indicators overview](Indicators-Overview) — the full catalogue.
- Source: <https://github.com/wickra-lib/wickra>
