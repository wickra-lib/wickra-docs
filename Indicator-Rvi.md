# RVI

> Relative Vigor Index — Donald Dorsey's ratio of intra-bar drive
> `(close − open)` to intra-bar range `(high − low)`, averaged over a
> `period`-bar window.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Momentum Oscillators |
| Input type | `Candle` (uses `open`, `high`, `low`, `close`) |
| Output type | `f64` |
| Output range | unbounded; for clean OHLC the ratio sits in `(−1, 1)` |
| Default parameters | `period` (10 in Python) |
| Warmup period (`warmup_period()`) | `period` |
| Interpretation | Positive on average-bullish windows, negative on average-bearish. |

## Formula

```
num_t = close_t − open_t
den_t = high_t  − low_t
RVI_t = SMA(num, period)_t / SMA(den, period)_t
```

Equivalently — and this is what Wickra computes — `RVI` is the ratio of
the rolling sums (the per-window divisor `period` cancels). If the
denominator sum is non-positive (every bar in the window had zero
range), the indicator holds its previous value rather than emit `NaN`.

## Parameters

| Name     | Type    | Default | Valid range | Description |
|----------|---------|---------|-------------|-------------|
| `period` | `usize` | `10` (Python) | `>= 1` | Window length. `0` errors with `Error::PeriodZero`. |

## Warmup

`warmup_period() == period`. The first non-`None` output lands on
input `period`.

## Reference

Donald Dorsey, *Stocks & Commodities*, also `pandas-ta`'s `rvi`. The
4-bar weighted "vigor" variant (`(a + 2·a₋₁ + 2·a₋₂ + a₋₃) / 6`) is
not implemented; the consumer can compose it via `Chain` if needed.
