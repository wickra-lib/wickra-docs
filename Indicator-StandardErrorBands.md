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
| Warmup period | `period` (exact) |
| Interpretation | Bands describe a prediction interval around the regression line. Closes outside are statistically unusual. |

## Formula

```
fit y = a + b·x by OLS over the last `period` closes (x = 0..period − 1)
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
own smoother (e.g. [`Sma::new(3)`](Indicator-Sma)).

## Parameters

| Name         | Type    | Default | Constraint    | Source |
|--------------|---------|---------|---------------|--------|
| `period`     | `usize` | `21`    | `>= 3`        | `StandardErrorBands::new` (`standard_error_bands.rs:74`) |
| `multiplier` | `f64`   | `2.0`   | finite, `> 0` | `standard_error_bands.rs:80` |

`period < 3` returns [`Error::InvalidPeriod`] (the `n − 2` denominator
needs at least 3 points); a non-finite or non-positive `multiplier`
returns [`Error::NonPositiveMultiplier`]. Python defaults come from
`#[pyo3(signature = (period=21, multiplier=2.0))]`; the Node constructor
takes both arguments explicitly.

## Inputs / Outputs

```rust
impl Indicator for StandardErrorBands {
    type Input  = f64;
    type Output = StandardErrorBandsOutput;
    fn update(&mut self, value: f64) -> Option<StandardErrorBandsOutput>;
}

pub struct StandardErrorBandsOutput { pub upper: f64, pub middle: f64, pub lower: f64 }
```

- **Python streaming.** `update(value)` returns `(upper, middle, lower)` or `None`.
- **Python batch.** `StandardErrorBands.batch(prices)` returns an `(n, 3)`
  `np.ndarray` with columns `[upper, middle, lower]`; warmup rows are `NaN`.
- **Node streaming.** `update(value)` returns a `{ upper, middle, lower }`
  object or `null`.
- **Node batch.** `batch(prices)` returns a flat `Array<number>` of length
  `n * 3`.

## Warmup

`warmup_period()` returns `period`. The window must hold a full `period`
values before the OLS fit and standard error are defined, so the first
non-`None` output lands on input `period` (index `period − 1`). Readiness
is `window.len() == period`.

## Edge cases

- **Perfectly linear input.** Zero residuals ⇒ `stderr = 0` ⇒
  `upper == middle == lower` (test `perfect_line_collapses_bands`).
- **Wider than the population band.** On identical residuals the `n − 2`
  standard error strictly exceeds the population stddev by `sqrt(n/(n−2))`
  (test `standard_error_exceeds_population_stddev`).
- **Ordering.** `upper >= middle >= lower` always holds.
- **Reset.** `reset()` clears the window and restarts warmup.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, StandardErrorBands};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // period 3 over [1, 2, 9]: endpoint 8, SSE = 6, n − 2 = 1 → stderr = sqrt(6).
    let mut seb = StandardErrorBands::new(3, 2.0)?;
    if let Some(o) = seb.batch(&[1.0, 2.0, 9.0]).into_iter().flatten().last() {
        println!("middle={:.4} upper={:.4} lower={:.4}", o.middle, o.upper, o.lower);
    }
    Ok(())
}
```

Output:

```
middle=8.0000 upper=12.8990 lower=3.1010
```

`upper = 8 + 2·sqrt(6) ≈ 12.8990`, `lower = 8 − 2·sqrt(6) ≈ 3.1010`
(test `reference_values`).

### Python

```python
import numpy as np
import wickra as ta

seb = ta.StandardErrorBands(3, 2.0)
print(seb.batch(np.array([1.0, 2.0, 9.0]))[-1])  # [12.899  8.  3.101]
```

### Node

```javascript
const ta = require('wickra');
const seb = new ta.StandardErrorBands(3, 2.0);
seb.update(1); seb.update(2);
console.log(seb.update(9)); // { upper: ~12.90, middle: 8, lower: ~3.10 }
```

## Interpretation

Standard Error Bands describe a *prediction interval* around the regression
endpoint: at `multiplier = 2.0` the bands approximate a 95 % interval for a
new observation given the recent trend (the normal-theory reading). Practical
use mirrors [LinRegChannel](Indicator-LinRegChannel):

1. **Channel width as trend strength.** A tight band means the recent data
   hugs its regression line — a clean trend. A flaring band means the fit is
   poor — choppy, trendless action.
2. **Reversion vs continuation.** Closes outside the band are statistically
   unusual relative to the trend and often revert; sustained closes outside
   warn the trend's slope is changing.

## Common pitfalls

- **Comparing band width to [LinRegChannel](Indicator-LinRegChannel)
  one-for-one.** Standard Error Bands are always wider by `sqrt(n/(n−2))`
  on the same data; do not read the difference as a regime change.
- **Using `period < 3`.** The `n − 2` denominator is undefined; the
  constructor rejects it.

## References

- Jon Andersen, *Standard Error Bands*, *Technical Analysis of Stocks &
  Commodities*, September 1996.

## See also

- [LinRegChannel](Indicator-LinRegChannel) — population-stddev variant.
- [LinearRegression](Indicator-LinearRegression) — the bare endpoint.
- [BollingerBands](Indicator-BollingerBands) — sigma about the mean
  (not the trend).
