# LinRegChannel

> Rolling linear-regression line wrapped by `±k·σ` of the residuals.
> Where Bollinger measures dispersion about the *mean*, the LinReg
> Channel measures it about the *trend*.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Bands & Channels |
| Input type | `f64` (typically the close price) |
| Output type | `LinRegChannelOutput { upper, middle, lower }` |
| Output range | unbounded; `lower ≤ middle ≤ upper` |
| Default parameters | `period = 20`, `multiplier = 2.0` |
| Warmup period | `period` |
| Interpretation | Channel breakouts are statistically meaningful in the direction of trend, not just in absolute price. |

## Formula

```
fit y = a + b·x by OLS over the last `period` closes (x = 0..period − 1)
residual_i = y_i − (a + b · x_i)
sigma      = sqrt( Σ residual_i² / period )      // population stddev
middle     = a + b · (period − 1)                // endpoint of the line
upper      = middle + multiplier · sigma
lower      = middle − multiplier · sigma
```

A perfectly linear input has zero residuals, so the channel collapses
onto the regression line — a useful sanity check.

## Parameters

| Name         | Type    | Default | Valid range | Description |
|--------------|---------|---------|-------------|-------------|
| `period`     | `usize` | `20`    | `>= 2`      | OLS window length. |
| `multiplier` | `f64`   | `2.0`   | finite, `> 0` | Multiplier on the residual stddev. |

`period >= 2` is enforced because a regression line is undefined for a
single point.

## Reference

- TA-Lib's `LINEARREG` family for the rolling-OLS endpoint.
- John Bollinger's *Bollinger on Bollinger Bands* (2001) for the
  parallel to the σ-based envelope this channel detrends.

## See also

- [StandardErrorBands](Indicator-StandardErrorBands) — same skeleton
  but uses `n − 2` denominator (OLS standard error).
- [LinearRegression](Indicator-LinearRegression) — the bare endpoint.
- [LinRegSlope](Indicator-LinRegSlope) — the slope component.
