# Quickstart: Java

A five-minute tour of the Wickra Java binding — a language stecker on the C ABI
hub built on the Java Foreign Function & Memory API (Panama). By the end you
will have streamed an RSI, run a batch SMA, and read a multi-output MACD, all as
idiomatic Java.

## Requirements

Java 22 or later (the FFM API is final since Java 22; no preview flag). The FFM
API is *restricted*, so pass `--enable-native-access=ALL-UNNAMED` when you run
your application.

## Install

The binding ships on Maven Central as `org.wickra:wickra` with the native
library prebuilt for every supported platform (Linux, macOS, Windows — x64 and
arm64); there is nothing to compile.

Maven:

```xml
<dependency>
  <groupId>org.wickra</groupId>
  <artifactId>wickra</artifactId>
  <version>0.8.5</version>
</dependency>
```

Gradle:

```kotlin
implementation("org.wickra:wickra:0.8.5")
```

## The class shape

Every indicator is an `AutoCloseable` class over an opaque native handle, with
the same five operations as the C ABI underneath:

```java
import org.wickra.Sma;

try (Sma sma = new Sma(14)) {   // throws IllegalArgumentException on invalid params
    double v = sma.update(42.0); // NaN while warming up
    sma.reset();                 // back to a fresh state
} // freed at the end of the try-with-resources scope
```

`update` is O(1) per call. Prefer try-with-resources for deterministic cleanup;
a `Cleaner` also frees the handle once the wrapper becomes unreachable, so a
missed `close()` never leaks permanently.

## Streaming and batch side by side

```java
import org.wickra.Rsi;
import org.wickra.Sma;

// 1. Streaming: feed Wilder's textbook example into RSI(14).
double[] prices = {
    44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42,
    45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00,
};
try (Rsi rsi = new Rsi(14)) {
    for (int i = 0; i < prices.length; i++) {
        double r = rsi.update(prices[i]);
        if (Double.isFinite(r)) { // NaN during the 15-bar warmup
            System.out.printf("tick %2d  rsi=%.4f%n", i + 1, r);
        }
    }
}

// 2. Batch: one SMA(3) call over five prices writes NaN at warmup.
try (Sma sma = new Sma(3)) {
    double[] out = sma.batch(new double[] {1, 2, 3, 4, 5});
    // out -> { NaN, NaN, 2.0, 3.0, 4.0 }
}
```

The first RSI value lands on tick 15. Batch output is bit-for-bit identical to
feeding the same inputs through `update` one at a time.

## Multi-output indicators

Indicators with several outputs (MACD, Bollinger, ADX, …) return a `record` —
`null` while warming up, a value once one is ready:

```java
import org.wickra.MacdIndicator;
import org.wickra.MacdOutput;

try (MacdIndicator macd = new MacdIndicator(12, 26, 9)) {
    for (double price : feed) {
        MacdOutput m = macd.update(price);
        if (m != null) {
            System.out.printf("macd=%.4f signal=%.4f hist=%.4f%n",
                m.macd(), m.signal(), m.histogram());
        }
    }
}
```

Candle-input indicators (ATR, ADX, OBV, …) take the OHLCV fields plus a
timestamp, e.g. `atr.update(open, high, low, close, volume, timestamp)`.

## A deeper example

[`examples/java`](https://github.com/wickra-lib/wickra/tree/main/examples/java)
runs a basket of indicators over an OHLCV series; the directory also has a
multi-indicator streaming demo, multi-timeframe resampling, a parallel-streams
fan-out, three strategy examples, and Binance fetch/live examples. Build the C
ABI once, install the binding, then run any of them:

```bash
cargo build -p wickra-c --release
mvn -f bindings/java install -DskipTests
mvn -f examples/java exec:exec -Dexec.mainClass=org.wickra.examples.Streaming
```

## See also

- [Quickstart: C](Quickstart-C) — the C ABI hub the Java binding links against.
- [Streaming vs Batch](Streaming-vs-Batch) — the `batch == repeated update`
  contract that holds across every binding.
- [Indicators overview](Indicators-Overview) — the full catalogue.
- Source: <https://github.com/wickra-lib/wickra>
