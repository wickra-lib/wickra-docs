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
| Warmup period | `period` (exact) |
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
onto the regression line — a useful sanity check. The slope/intercept are
fitted by ordinary least squares over the live window each bar (`O(period)`
per update; see the note in `linreg_channel.rs:108`).

## Parameters

| Name         | Type    | Default | Constraint    | Source |
|--------------|---------|---------|---------------|--------|
| `period`     | `usize` | `20`    | `>= 2`        | `LinRegChannel::new` (`linreg_channel.rs:66`) |
| `multiplier` | `f64`   | `2.0`   | finite, `> 0` | `linreg_channel.rs:72` |

`period < 2` returns [`Error::InvalidPeriod`] (a regression line is
undefined for a single point); a non-finite or non-positive `multiplier`
returns [`Error::NonPositiveMultiplier`]. Python defaults come from
`#[pyo3(signature = (period=20, multiplier=2.0))]`; the Node constructor
takes both arguments explicitly.

## Inputs / Outputs

```rust
impl Indicator for LinRegChannel {
    type Input  = f64;
    type Output = LinRegChannelOutput;
    fn update(&mut self, value: f64) -> Option<LinRegChannelOutput>;
}

pub struct LinRegChannelOutput { pub upper: f64, pub middle: f64, pub lower: f64 }
```

- **Python streaming.** `update(value)` returns `(upper, middle, lower)` or `None`.
- **Python batch.** `LinRegChannel.batch(prices)` returns an `(n, 3)`
  `np.ndarray` with columns `[upper, middle, lower]`; warmup rows are `NaN`.
- **Node streaming.** `update(value)` returns a `{ upper, middle, lower }`
  object or `null`.
- **Node batch.** `batch(prices)` returns a flat `Array<number>` of length
  `n * 3`.

## Warmup

`warmup_period()` returns `period`. The window must hold a full `period`
values before the OLS fit and residual stddev are defined, so the first
non-`None` output lands on input `period` (index `period − 1`). Readiness
is `window.len() == period`.

## Edge cases

- **Perfectly linear input.** Zero residuals ⇒ `sigma = 0` ⇒
  `upper == middle == lower` (test `perfect_line_collapses_channel`).
- **Constant series.** A flat line is a degenerate trend; the channel
  collapses onto the constant (test `constant_series_collapses_channel`).
- **Ordering.** `upper >= middle >= lower` always holds (`sigma >= 0`).
- **Reset.** `reset()` clears the window and restarts warmup.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, LinRegChannel};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // period 3 over [1, 2, 9]: fitted line y = 4·x, endpoint 8;
    // residuals 1, −2, 1 → population sigma = sqrt(2).
    let mut lc = LinRegChannel::new(3, 2.0)?;
    if let Some(o) = lc.batch(&[1.0, 2.0, 9.0]).into_iter().flatten().last() {
        println!("middle={:.4} upper={:.4} lower={:.4}", o.middle, o.upper, o.lower);
    }
    Ok(())
}
```

Output:

```
middle=8.0000 upper=10.8284 lower=5.1716
```

`upper = 8 + 2·sqrt(2) ≈ 10.8284`, `lower = 8 − 2·sqrt(2) ≈ 5.1716`
(test `reference_values`).

### Python

```python
import numpy as np
import wickra as ta

lc = ta.LinRegChannel(3, 2.0)
print(lc.batch(np.array([1.0, 2.0, 9.0]))[-1])  # [10.8284  8.  5.1716]
```

### Node

```javascript
const ta = require('wickra');
const lc = new ta.LinRegChannel(3, 2.0);
lc.update(1); lc.update(2);
console.log(lc.update(9)); // { upper: ~10.83, middle: 8, lower: ~5.17 }
```

## Interpretation

The LinReg Channel *detrends* its dispersion measure, so a steady drift
does not inflate the band width the way a sigma-about-the-mean band would:

1. **Trend channel.** The midline is the regression endpoint — a
   least-squares estimate of "fair value" given the recent slope. Closes
   beyond the bands are excursions relative to the *fitted trend*, not the
   flat mean.
2. **Breakout quality.** Because the bands hug the trend, a close outside
   the upper band in an uptrend is a genuine acceleration, whereas a
   mean-based band would already be wide and miss it.

## Common pitfalls

- **Expecting Bollinger-like width in a trend.** A strongly trending series
  has *small* residuals about its regression line, so this channel is much
  narrower than [BollingerBands](Indicator-BollingerBands) on the same data.
- **Reusing `period < 2`.** The constructor rejects it — there is no line
  through one point.

## References

- TA-Lib's `LINEARREG` family for the rolling-OLS endpoint.
- John Bollinger's *Bollinger on Bollinger Bands* (2001) for the
  parallel to the σ-based envelope this channel detrends.

## See also

- [StandardErrorBands](Indicator-StandardErrorBands) — same skeleton but
  uses the `n − 2` OLS standard error instead of the population stddev.
- [LinearRegression](Indicator-LinearRegression) — the bare endpoint.
- [LinRegSlope](Indicator-LinRegSlope) — the slope component.
- [BollingerBands](Indicator-BollingerBands) — dispersion about the mean.
