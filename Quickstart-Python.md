# Quickstart: Python

> **Verified against the Rust reference.** Every one of Wickra's 514 indicators is replayed through all 10 languages and checked bit-for-bit against the Rust core's golden fixtures in CI — the math here is provably identical to every other binding ([how](FAQ#do-all-the-language-bindings-compute-the-same-values)).

A five-minute tour of the Wickra Python binding. By the end you will have run
a batch RSI over a list of prices, fed the same indicator one tick at a time,
and read a multi-column MACD result correctly during warmup.

## Install

```bash
pip install wickra
```

The published wheels target Python 3.9 – 3.13 on Linux x86_64, macOS
(Intel + Apple Silicon), and Windows x86_64. Wickra has **zero third-party
dependencies** — `pip install wickra` pulls nothing else, not even NumPy. No
system compiler, no C headers, no Rust toolchain are needed to install; Wickra
ships pre-built native wheels.

NumPy is **optional**. Install it (`pip install wickra[numpy]`) only if you want
to wrap results in NumPy arrays — they expose the buffer protocol, so
`numpy.asarray(result)` is zero-copy for 1-D outputs.

Verify the install:

```python
import wickra as ta
print(ta.__version__)
```

## Batch: RSI over a series

`Indicator.batch(prices)` accepts any sequence or buffer of numbers — a plain
`list`, an `array.array`, a `memoryview`, or a NumPy array — and returns a 1-D
stdlib **`array.array('d')`** of `float64` outputs. Warmup steps come back as
`NaN` so the result aligns 1:1 with your input prices. It supports indexing,
slicing, iteration and `.tolist()`; if you use NumPy, `numpy.asarray(values)`
wraps it zero-copy.

The first 15 prices below are the classic Wilder textbook example. RSI(14)
emits its first value at index 14 (the 15th input) because it needs 14
diffs to seed Wilder's smoothing.

```python
import math
import wickra as ta

prices = [
    44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42,
    45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00,
    46.03, 46.41, 46.22, 45.64,
]

rsi = ta.RSI(14)
values = rsi.batch(prices)

print(values.typecode, len(values))
print("warmup count:", sum(math.isnan(v) for v in values))
print("first value :", values[14])
print("last value  :", values[-1])
```

Running this prints:

```
d 20
warmup count: 14
first value : 70.46413502109705
last value  : 57.91502067008556
```

The exact first value `70.464` matches Wilder's published table; this is the
same input/output pair the Rust test suite pins as `classic_wilder_textbook_values`
in `crates/wickra-core/src/indicators/rsi.rs`.

## Streaming: feed one price at a time

The same `RSI` instance can be driven tick-by-tick with `update()`. Each call
is O(1) and returns either a `float` or `None` while the indicator is still
warming up.

```python
import wickra as ta

rsi = ta.RSI(14)
prices = [
    44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42,
    45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00,
    46.03, 46.41,
]

for tick, price in enumerate(prices, start=1):
    value = rsi.update(price)
    if value is not None:
        print(f"tick {tick:2d}  close={price:.2f}  rsi={value:.4f}")
```

Output:

```
tick 15  close=46.28  rsi=70.4641
tick 16  close=46.00  rsi=66.2496
tick 17  close=46.03  rsi=66.4809
tick 18  close=46.41  rsi=69.3469
```

Tick 15 is the first emission because `RSI(14).warmup_period() == 15`. Before
that, `update()` returns `None`. After warmup the indicator never goes back
to `None`: each subsequent tick produces a steady value.

The full set of streaming-state methods is:

| Method                | Returns        | Notes                                      |
|-----------------------|----------------|--------------------------------------------|
| `update(price)`       | `float`/`None` | O(1) state transition, `None` during warmup |
| `batch(prices)`       | `array.array('d')` | replays `update`, `NaN` during warmup   |
| `reset()`             | `None`         | returns to a freshly-constructed state      |
| `is_ready()`          | `bool`         | `True` once the first value has been emitted |
| `warmup_period()`     | `int`          | inputs required before the first value      |

## MACD: a multi-column indicator and its warmup NaNs

Some indicators emit several values at once. `MACD` returns three: the MACD
line, the signal line, and the histogram. The Python `batch` reflects that
shape directly — instead of a 1-D `array.array` you get a `Matrix`: a
buffer-protocol object with a `(n_rows, n_columns)` `.shape`, integer-row and
`[i, j]` element access, and `.tolist()`. Each warmup row is filled with `NaN`
across every column. (`Stochastic` follows the same pattern with two columns,
`Bollinger Bands` with four, `Keltner`/`Donchian`/`ADX` with three.)

```python
import math
import wickra as ta

prices = [100.0 + 20.0 * i / 39.0 for i in range(40)]
macd = ta.MACD(12, 26, 9)
out = macd.batch(prices)

print("shape       :", out.shape)
print("warmup rows :", sum(math.isnan(out[i, 0]) for i in range(len(out))))
print("row 33      :", list(out[33]))
print("row 39      :", list(out[39]))
```

Output:

```
shape       : (40, 3)
warmup rows : 33
row 33      : [3.589743589743577, 3.5897435897435788, -1.7763568394002505e-15]
row 39      : [3.589743589743591, 3.589743589743585, 6.217248937900877e-15]
```

Two things to notice:

1. `MACD(12, 26, 9).warmup_period()` is `slow + signal - 1 = 34`, and indeed
   row `34 - 1 = 33` is the first row where every column is finite. Earlier
   rows are entirely `NaN`; you should not slice a partial row out and use,
   say, the `signal` column independently of the `macd` column.
2. Columns are positional — `out[i, 0]` is MACD, `out[i, 1]` is signal,
   `out[i, 2]` is histogram, and `out[i]` is the whole row. The streaming form
   returns the same triple as a plain Python tuple: `(macd, signal, histogram)`.

If you use NumPy, `numpy.asarray(out.tolist())` gives a 2-D array you can mask
column-wise — the warmup pattern is identical across all columns:

```python
import numpy as np

arr = np.asarray(out.tolist())          # (40, 3)
clean_rows = arr[~np.isnan(arr[:, 0])]
```

## A deeper example

`examples/python/backtest.py` in the repo runs a full panel of indicators
(RSI, EMA, Bollinger, MACD, ATR, ADX, OBV) over an OHLCV CSV and prints a
summary. It's a good template for "I have historical data on disk, give me a
table of indicator values" workflows; for live workflows, see
`examples/python/live_binance.py`.

## See also

- [Quickstart: Rust](Quickstart-Rust) — same API surface in Rust.
- [Streaming vs Batch](Streaming-vs-Batch) — why the streaming path is
  the primary one, not a convenience.
- [Warmup Periods](Warmup-Periods) — the full table of warmup counts.
- Source: <https://github.com/wickra-lib/wickra>
