# StandardErrorBands

> Linear-regression line wrapped by the OLS standard error (`n − 2`
> denominator). Statistically-correct prediction-interval bands;
> slightly wider than [LinRegChannel](Indicator-LinRegChannel).

## Quick reference

| Field | Value |
|-------|-------|
| Family | Bands & Channels |
| Input type | `f64` (typically the close price) |
| Output type | `StandardErrorBandsOutput { upper, middle, lower }` |
| Output range | unbounded; `lower ≤ middle ≤ upper` |
| Default parameters | `period = 21`, `multiplier = 2.0` |
| Warmup period | `period` |
| Interpretation | Bands describe a prediction interval around the regression line. Closes outside are statistically unusual. |

## Formula

```
fit y = a + b·x by OLS over the last `period` closes
residual_i = y_i − (a + b · x_i)
stderr     = sqrt( Σ residual_i² / (period − 2) )   // OLS standard error
middle     = a + b · (period − 1)
upper      = middle + multiplier · stderr
lower      = middle − multiplier · stderr
```

The `n − 2` divisor (two degrees of freedom consumed by the slope and
intercept) gives a slightly wider channel than the population stddev
used by [LinRegChannel](Indicator-LinRegChannel) — exactly by a factor
`sqrt(n / (n − 2))` (≈ `1.054` at `n = 20`).

Jon Andersen's original publication pairs the bands with a default
`multiplier = 2.0` and a 3-bar SMA smoothing of all three outputs;
Wickra reports the *raw* bands so callers can pipe them through their
own smoother (e.g. `Sma::new(3)`).

## Parameters

| Name         | Type    | Default | Valid range | Description |
|--------------|---------|---------|-------------|-------------|
| `period`     | `usize` | `21`    | `>= 3`      | OLS window length. The `n − 2` denominator needs at least 3 points. |
| `multiplier` | `f64`   | `2.0`   | finite, `> 0` | Multiplier on the standard error. |

## Reference

- Jon Andersen, *Standard Error Bands*, *Technical Analysis of Stocks &
  Commodities*, September 1996.

## See also

- [LinRegChannel](Indicator-LinRegChannel) — population-stddev variant.
- [LinearRegression](Indicator-LinearRegression) — the bare endpoint.
- [BollingerBands](Indicator-BollingerBands) — sigma about the mean
  (not the trend).
