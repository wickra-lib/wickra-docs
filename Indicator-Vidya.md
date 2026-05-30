# VIDYA

> Variable Index Dynamic Average — Chande's EMA whose smoothing factor
> is scaled by the absolute Chande Momentum Oscillator (`CMO`).

## Quick reference

| Field | Value |
|-------|-------|
| Family | Moving Averages |
| Input type | `f64` (single close) |
| Output type | `f64` |
| Output range | unbounded; tracks the input price scale |
| Default parameters | `(period = 14, cmo_period = 9)` (Python) |
| Warmup period (`warmup_period()`) | `cmo_period + 1` |
| Interpretation | Adapts to momentum: tight tracking when momentum is strong, coasts when momentum is weak. |

## Formula

```
alpha_base = 2 / (period + 1)                    // standard EMA alpha
alpha_t    = alpha_base · |CMO(cmo_period)| / 100
VIDYA_t    = alpha_t · price_t + (1 − alpha_t) · VIDYA_{t-1}
```

Strong directional momentum (|CMO| near 100) drives `alpha` toward the
EMA-of-`period`'s natural rate; flat or balanced markets (|CMO| near 0)
shrink `alpha` toward zero, so VIDYA freezes on its prior value rather
than chasing noise.

Wickra reuses the existing `Cmo` indicator internally — both the
streaming and the batch path share the same state machine.

## Parameters

| Name         | Type    | Default | Valid range | Description |
|--------------|---------|---------|-------------|-------------|
| `period`     | `usize` | `14` (Python) | `>= 1` | EMA-style smoothing length. |
| `cmo_period` | `usize` | `9` (Python)  | `>= 1` | Lookback for the inner `Cmo`. |

Either parameter being `0` errors with `Error::PeriodZero`.

## Warmup

`warmup_period() == cmo_period + 1`: the inner `Cmo` needs
`cmo_period` price *changes* (i.e. `cmo_period + 1` prices) before it
emits.

## Constant series guarantee

On a flat input `CMO = 0`, so `alpha = 0` and the recurrence reduces
to `VIDYA = VIDYA_{t-1}`. Once seeded with the first close after
warmup, a constant series is reproduced exactly.

## Reference

Tushar Chande, "Variable Index Dynamic Average", *Stocks & Commodities*,
1992. See also `pandas-ta`'s `vidya`.
