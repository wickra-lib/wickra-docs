# Standard Error

> Standard error of the rolling OLS regression line. Measures the
> typical deviation of input values from the fitted trend line —
> a residual-based volatility measure that filters out the trend
> component first.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Price Statistics                                                     |
| Input type          | `f64`                                                                |
| Output type         | `f64`                                                                |
| Output range        | `[0, ∞)`                                                             |
| Default parameters  | `period` required                                                    |
| Warmup period       | `period`                                                             |
| Interpretation      | Trend-detrended typical deviation                                     |

## Formula

```
slope    = (n·Σxy - Σx·Σy) / (n·Σxx - (Σx)²)
SS_total = Σy² - n·ȳ²
RSS      = SS_total - slope² · S_xx     (residual sum of squares)
StdErr   = √(RSS / (n - 2))             (n - 2 residual d.o.f.)
```

where `S_xx = (n·Σxx - (Σx)²) / n`. See
`crates/wickra-core/src/indicators/standard_error.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 2`      | Rolling window length. |

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Standard binding shapes.

## Warmup

`warmup_period() == period`.

## Edge cases

- **Perfect fit.** RSS = 0 → StdErr = 0.
- **Flat input.** SS_total = 0 → StdErr = 0.
- **Constant input.** Same as flat.
- **Reset.** Clears running sums.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, StandardError};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let series: Vec<f64> = (0..50)
        .map(|i| f64::from(i) * 0.5 + (f64::from(i) * 0.3).sin())
        .collect();
    let mut se = StandardError::new(20)?;
    println!("row 30 = {:?}", se.batch(&series)[30]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

series = np.arange(50, dtype=float) * 0.5 + np.sin(np.linspace(0, 15, 50))
se = ta.StandardError(20)
print(se.batch(series)[30])
```

### Node

```javascript
const wickra = require('wickra');
const se = new wickra.StandardError(20);
const series = Array.from({ length: 50 }, (_, i) => i * 0.5 + Math.sin(i * 0.3));
console.log(se.batch(series)[30]);
```

### Streaming

```rust
use wickra::{Indicator, StandardError};

let mut se = StandardError::new(20).unwrap();
let price_stream: Vec<f64> = Vec::new(); // your live price feed
for px in price_stream {
    if let Some(v) = se.update(px) {
        // v is the trend-detrended volatility
    }
}
```

## Interpretation

- **Trend-detrended volatility.** Unlike StdDev, StandardError
  removes the linear trend component first. Useful when you
  want to measure "noise around the trend" rather than "noise +
  trend".
- **Standard Error Bands.** Stack `±2 · StandardError` around the
  fitted linear regression line to form regression-residual
  bands — see [StandardErrorBands](/Indicators/Indicator-StandardErrorBands).
- **Vs StdDev.** Same data with strong trend: StdDev high
  (driven by trend), StandardError low (residual after detrending).

## Common pitfalls

- **Period interpretation.** The `period` argument here is the
  number of bars in the regression window, not the order of
  polynomial fit (which is fixed at linear).
- **Cost.** Running sums make each update O(1) — well-suited
  for streaming.

## References

- Standard regression statistic; documented in any statistics
  text.

## See also

- [StandardErrorBands](/Indicators/Indicator-StandardErrorBands) — band
  visualisation.
- [LinearRegression](/Indicators/Indicator-LinearRegression) — the line itself.
- [LinRegSlope](/Indicators/Indicator-LinRegSlope) — slope alone.
- [RSquared](/Indicators/Indicator-RSquared) — explained-variance ratio.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
