# RWI

> Mike Poulos' Random Walk Index — measures how many standard
> deviations the current move is away from a random walk of the same
> length. Higher RWI means the directional move is statistically more
> significant than noise.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trend & Directional |
| Input type | `Candle` |
| Output type | `RwiOutput { high, low }` |
| Output range | `>= 0` (each line) |
| Default parameters | `period = 14` (must be `>= 2`) |
| Warmup period | `period` |
| Interpretation | `RWI_High > 1` and dominant = real uptrend; mirror for downtrend. Both lines below 1 = ranging. |

## Formula

For each lookback `i ∈ [2, period]`:

```
RWI_High_t(i) = (high_t       − low_{t-i+1})  / (ATR_i(t) * sqrt(i))
RWI_Low_t(i)  = (high_{t-i+1} − low_t)        / (ATR_i(t) * sqrt(i))
```

where `ATR_i(t)` is the simple mean of true-range over the most recent
`i` bars. The per-bar emission is the maximum of these ratios across
all lookbacks `i ∈ [2, period]`:

```
RWI_High_t = max_{i ∈ [2, period]} RWI_High_t(i)
RWI_Low_t  = max_{i ∈ [2, period]} RWI_Low_t(i)
```

A flat window (zero ATR) short-circuits each lookback to zero, so the
indicator reports `(0, 0)` on a perfectly motionless market.

## Parameters

| Name     | Type    | Default | Valid range | Description |
|----------|---------|---------|-------------|-------------|
| `period` | `usize` | `14`    | `>= 2`      | Max lookback. `period < 2` returns `Error::InvalidPeriod` because lookback `i = 2` is the shortest meaningful comparison. |

## Interpretation

- **`RWI_High` crossing above `RWI_Low`** signals a fresh uptrend.
- **`RWI_High > 2`** is the typical "strong trend" threshold used by
  Poulos in the original 1991 *Stocks & Commodities* article.
- **Both lines `< 1`** — neither direction beats random-walk noise;
  treat the market as ranging and avoid trend-following signals.

## Reference

E. Michael Poulos, "Of Trends and Random Walks", *Technical Analysis
of Stocks & Commodities*, February 1991 — original publication of the
indicator. The `sqrt(i)` denominator comes from the expectation that a
random walk of `i` steps drifts a distance proportional to `sqrt(i)`.

## See also

- [Adx](Indicator-Adx) — alternative trend-strength gauge, smoothed
  rather than threshold-based.
- [ChoppinessIndex](Indicator-ChoppinessIndex) — log-scaled
  trend-vs.-range complement.
- [Warmup Periods](Warmup-Periods) — the `period` RWI entry.
