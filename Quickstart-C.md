# Quickstart: C / C++

> **Verified against the Rust reference.** Every one of Wickra's 514 indicators is replayed through all 10 languages and checked bit-for-bit against the Rust core's golden fixtures in CI — the math here is provably identical to every other binding ([how](FAQ#do-all-the-language-bindings-compute-the-same-values)).

A five-minute tour of the Wickra C ABI — the hub every C-capable language links
against. By the end you will have streamed an RSI, run a batch SMA, and read a
multi-output MACD across the FFI boundary.

## Install

The C ABI ships as a pre-built shared/static library plus a generated header,
`wickra.h`. Grab the archive for your platform from the
[GitHub releases](https://github.com/wickra-lib/wickra/releases) (it contains
`wickra.h`, the optional `wickra.hpp` C++ wrapper, and the library), or build it
from source:

```bash
cargo build -p wickra-c --release
# -> target/release/libwickra.{so,dylib} or wickra.dll (+ import lib) + a staticlib
```

Then compile against the header and link the library:

```bash
# Linux / macOS
cc app.c -I path/to/include -L path/to/lib -lwickra -lm -o app

# Windows (MinGW gcc, linking the DLL directly)
gcc app.c -I path\to\include path\to\wickra.dll -lm -o app.exe
```

## The handle shape

Every indicator is an opaque handle with the same set of functions:

```c
#include "wickra.h"

struct Sma *sma = wickra_sma_new(14);      /* NULL on invalid params  */
size_t w = wickra_sma_warmup_period(sma);  /* updates until ready: 14  */
double v = wickra_sma_update(sma, 42.0);   /* NaN while warming up     */
bool ready = wickra_sma_is_ready(sma);     /* false until warmed up    */
wickra_sma_reset(sma);                     /* back to a fresh state    */
wickra_sma_free(sma);                      /* exactly once per _new    */
```

`update` never revisits the history behind the tick. There is no RAII across
the C boundary, so every
`wickra_<ind>_new` must be paired with exactly one `wickra_<ind>_free`. Every
function is NULL-safe: a NULL handle yields `NaN` (or a no-op), never a crash.
The alt-chart bar builders (`renko_bars`, `kagi_bars`, …) omit
`warmup_period` / `is_ready` — a candle can complete 0..n bars, so they have no
warmup.

## Streaming and batch side by side

```c
#include "wickra.h"
#include <math.h>
#include <stdio.h>

int main(void) {
    /* 1. Streaming: feed Wilder's textbook example into RSI(14). */
    struct Rsi *rsi = wickra_rsi_new(14);
    double prices[] = {44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42,
                       45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00};
    size_t n = sizeof(prices) / sizeof(prices[0]);
    for (size_t i = 0; i < n; ++i) {
        double r = wickra_rsi_update(rsi, prices[i]);
        if (isfinite(r)) {            /* NaN during the 15-bar warmup */
            printf("tick %2zu  rsi=%.4f\n", i + 1, r);
        }
    }
    wickra_rsi_free(rsi);

    /* 2. Batch: one SMA(3) call over five prices writes NaN at warmup. */
    struct Sma *sma = wickra_sma_new(3);
    double in[5] = {1.0, 2.0, 3.0, 4.0, 5.0};
    double out[5];
    wickra_sma_batch(sma, in, out, 5);
    /* out -> {nan, nan, 2.0, 3.0, 4.0} */
    wickra_sma_free(sma);
    return 0;
}
```

The first RSI value lands on tick 15 (`Rsi::new(14)` needs 14 diffs to seed
Wilder's smoothing). Batch output is bit-for-bit identical to feeding the same
inputs through `update` one at a time.

## Multi-output indicators

Indicators with several outputs (MACD, Bollinger, ADX, …) take a pointer to a
`#[repr(C)]` result struct and return a `bool` that is `true` once a value is
ready:

```c
struct MacdIndicator *macd = wickra_macd_indicator_new(12, 26, 9);
WickraMacdOutput m;
if (wickra_macd_indicator_update(macd, price, &m)) {
    printf("macd=%.4f signal=%.4f hist=%.4f\n", m.macd, m.signal, m.histogram);
}
wickra_macd_indicator_free(macd);
```

Candle-input indicators (ATR, ADX, OBV, …) take the OHLCV fields plus a
timestamp, e.g. `wickra_atr_update(h, open, high, low, close, volume, timestamp)`.

## C++ — RAII over the same library

The optional `wickra.hpp` wraps any handle in a move-only `wickra::Handle` that
frees it automatically, so you get exception-safe lifetimes without giving up
the C ABI:

```cpp
#include "wickra.hpp"

wickra::Handle<Sma, wickra_sma_free> sma{wickra_sma_new(14)};
double v = wickra_sma_update(sma.get(), 42.0);
// freed when `sma` goes out of scope — no explicit wickra_sma_free
```

## A deeper example

[`examples/c/backtest.c`](https://github.com/wickra-lib/wickra/blob/main/examples/c/backtest.c)
runs a basket of indicators (RSI, EMA, Bollinger, MACD, ATR, ADX, OBV) over an
OHLCV CSV; the `examples/c/` directory also has a multi-indicator streaming demo,
multi-timeframe resampling, an OpenMP parallel fan-out, three strategy examples,
and Binance fetch/live examples. Build and run them all with CMake:

```bash
cmake -S examples/c -B examples/c/build -DWICKRA_LIB_DIR="$PWD/target/release"
cmake --build examples/c/build
ctest --test-dir examples/c/build --output-on-failure
```

## See also

- [Quickstart: Rust](Quickstart-Rust) — the native core the C ABI wraps.
- [Streaming vs Batch](Streaming-vs-Batch) — the `batch == repeated update`
  contract that holds across every binding.
- [Indicators overview](Indicators-Overview) — the full catalogue.
- Source: <https://github.com/wickra-lib/wickra>
