# R² (Coefficient of Determination)

> R² of the rolling OLS fit — the fraction of total variance
> explained by the regression line on `(x = 0..period-1, y =
> input)`. Bounded in `[0, 1]`; high R² means the input has a
> strong linear trend within the window.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Price Statistics                                                     |
| Input type          | `f64`                                                                |
| Output type         | `f64`                                                                |
| Output range        | `[0, 1]`                                                             |
| Default parameters  | `period` required                                                    |
| Warmup period       | `period`                                                             |
| Interpretation      | Trend strength: `> 0.7` strong trend, `< 0.3` choppy                  |

## Formula

```
slope        = (n·Σxy - Σx·Σy) / (n·Σxx - (Σx)²)
SS_total     = Σy² - n·ȳ²
SS_explained = slope² · (denom / n)
R²           = SS_explained / SS_total      if SS_total > 0
             = 1                            otherwise (flat window)
```

See `crates/wickra-core/src/indicators/r_squared.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 1`      | Rolling window length. |

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Standard binding shapes.

## Warmup

`warmup_period() == period`.

## Edge cases

- **Flat window.** R² = 1 by convention (no variance to explain
  → 100% explained).
- **Pure trend.** R² → 1.
- **Pure noise.** R² → 0.
- **Reset.** Clears running sums.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, RSquared};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let series: Vec<f64> = (0..100)
        .map(|i| f64::from(i) * 0.5 + (f64::from(i) * 0.4).sin() * 1.0)
        .collect();
    let mut r = RSquared::new(20)?;
    println!("row 50 = {:?}", r.batch(&series)[50]);  // high (~0.9) — trend dominates
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

series = np.arange(100, dtype=float) * 0.5 + np.sin(np.linspace(0, 40, 100))
r = ta.RSquared(20)
print(r.batch(series)[50])
```

### Node

```javascript
const wickra = require('wickra');
const r = new wickra.RSquared(20);
const series = Array.from({ length: 100 }, (_, i) => i * 0.5 + Math.sin(i * 0.4));
console.log(r.batch(series)[50]);
```

### Streaming

```rust
use wickra::{Indicator, RSquared};

let mut r = RSquared::new(20).unwrap();
for px in price_stream {
    if let Some(v) = r.update(px) {
        if v > 0.7 { /* strong trend regime */ }
        if v < 0.3 { /* choppy / no-trend regime */ }
    }
}
```

## Interpretation

- **R² > 0.7.** Strong linear trend — trend-following systems
  should be on.
- **R² 0.3 - 0.7.** Noisy trend — mixed regime, neither
  trend-following nor mean-reversion has clear edge.
- **R² < 0.3.** Choppy / range-bound — mean-reversion systems
  should be on.
- **Regime classifier.** Use R² as a *gate* on price strategies:
  enable trend rules when R² > threshold.

## Common pitfalls

- **Direction-blind.** R² doesn't tell you trend direction;
  pair with slope sign ([LinRegSlope](Indicator-LinRegSlope))
  for full picture.
- **Sensitive to outliers.** A single spike can inflate
  numerator and either inflate or destroy R² depending on
  where it sits relative to the line.
- **Window size matters.** Short windows produce high R² on
  almost any data; longer windows give more honest trend
  strength.

## References

- Standard linear-regression statistic; documented in any
  introductory statistics text.

## See also

- [LinearRegression](Indicator-LinearRegression) — the fitted
  line itself.
- [LinRegSlope](Indicator-LinRegSlope) — slope of the line.
- [LinRegAngle](Indicator-LinRegAngle) — slope as an angle.
- [StandardError](Indicator-StandardError) — residual measure.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
