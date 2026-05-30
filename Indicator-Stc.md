# STC

> Doug Schaff's Trend Cycle — a doubly-`Stochastic`-smoothed MACD that
> produces a bounded `[0, 100]` reading reacting faster than `MACD`
> itself.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Oscillators |
| Input type | `f64` (single close) |
| Output type | `f64` |
| Output range | `[0, 100]` (clamped) |
| Default parameters | `(fast = 23, slow = 50, schaff_period = 10, factor = 0.5)` |
| Warmup period (`warmup_period()`) | `slow + 2 · (schaff_period − 1)` |
| Interpretation | Cross above `25` = bullish entry; cross below `75` = bearish exit. |

## Formula

```
macd_t  = EMA(close, fast)_t − EMA(close, slow)_t
%K_t    = 100 · (macd − LL(macd, schaff_period)) / (HH(macd, schaff_period) − LL(macd, schaff_period))
%D_t    = %D_{t-1} + factor · (%K_t − %D_{t-1})       // half-EMA when factor = 0.5
%K2_t   = 100 · (%D − LL(%D, schaff_period)) / (HH(%D, schaff_period) − LL(%D, schaff_period))
STC_t   = STC_{t-1} + factor · (%K2_t − STC_{t-1})
```

The output is clamped to `[0, 100]` to absorb floating-point rounding.
The stochastic stages clamp to `0` when the rolling range collapses
(perfectly flat input or a strictly monotone uptrend where both EMAs
settle into a constant lag offset), so degenerate series produce a
deterministic `0` rather than `NaN` or `±inf`.

## Parameters

| Name            | Type    | Default | Valid range          | Description |
|-----------------|---------|---------|----------------------|-------------|
| `fast`          | `usize` | `23`    | `>= 1`, `< slow`     | Fast EMA period inside the MACD. |
| `slow`          | `usize` | `50`    | `>= 1`, `> fast`     | Slow EMA period inside the MACD. |
| `schaff_period` | `usize` | `10`    | `>= 1`               | Lookback for both stochastic stages. |
| `factor`        | `f64`   | `0.5`   | `(0, 1]`             | Half-EMA smoothing factor for `%D` and `STC`. |

## Reference

Doug Schaff, *Schaff Trend Cycle*, late-1990s — published by FX Studies.
