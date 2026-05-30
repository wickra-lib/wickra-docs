# TII

> M.H. Pee's Trend Intensity Index — the share of the most recent
> `dev_period` SMA-deviations that sit on the positive side, scaled
> to `[0, 100]`. Saturates at extremes on sustained trends.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trend & Directional |
| Input type | `f64` (single close) |
| Output type | `f64` |
| Output range | `[0, 100]` |
| Default parameters | `(sma_period = 60, dev_period = 30)` |
| Warmup period | `sma_period + dev_period − 1` (89 for the defaults) |
| Interpretation | `> 80` strong uptrend, `< 20` strong downtrend, `50` flat / no trend. |

## Formula

Given an `SMA(close, sma_period)`, for each bar `t` past warmup
compute the deviation `dev_t = close_t − SMA_t`. Then over the most
recent `dev_period` deviations:

```
SD_pos = Σ_{i in window, dev_i > 0}  dev_i
SD_neg = Σ_{i in window, dev_i < 0}  |dev_i|
TII    = 100 · SD_pos / (SD_pos + SD_neg)
```

A perfectly flat window (every `dev_i == 0`) returns the neutral
mid-point `50`. The output is clamped to `[0, 100]` against
floating-point drift in the rolling subtractions.

## Parameters

| Name         | Type    | Default | Valid range | Description |
|--------------|---------|---------|-------------|-------------|
| `sma_period` | `usize` | `60`    | `>= 1`      | Long-horizon SMA reference. |
| `dev_period` | `usize` | `30`    | `>= 1`      | Window of recent deviations. Pee's canonical setup uses `dev_period = sma_period / 2`. |

## Interpretation

- **Pure uptrend.** Every close sits above the lagging SMA, so every
  deviation is positive and `TII == 100`.
- **Pure downtrend.** Every close sits below the SMA → `TII == 0`.
- **Choppy market.** Positive and negative deviations roughly cancel
  and the indicator hovers near `50`.

## Reference

M.H. Pee, "Trend Intensity Index", *Stocks & Commodities*, June 2002.

## See also

- [Adx](Indicator-Adx) — directional-strength complement that does not
  use a moving-average reference.
- [VerticalHorizontalFilter](Indicator-VerticalHorizontalFilter) —
  alternative trend-strength filter, range-based.
- [Warmup Periods](Warmup-Periods) — the `sma_period + dev_period − 1`
  TII entry.
