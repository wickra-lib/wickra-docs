# Detrended StdDev

> Standard deviation of the **OLS residuals** over the rolling
> window. Detrends the input by fitting a linear regression, then
> measures the typical deviation from the fit. A pure
> "noise around the trend" measure, separating volatility from
> directional movement.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Volatility & Bands                                                   |
| Input type          | `f64`                                                                |
| Output type         | `f64`                                                                |
| Output range        | `[0, ∞)`                                                             |
| Default parameters  | `period` required                                                    |
| Warmup period       | `period`                                                             |
| Interpretation      | Residual-only volatility; trending markets have low DetrendedStdDev   |

## Formula

```
1. Fit OLS line y = a + b·x over the rolling window
2. residual_i = y_i - (a + b·x_i)
3. DetrendedStdDev = √( (1/n) · Σ residual² )
```

Mathematically equivalent to
[StandardError](Indicator-StandardError) using a different
denominator. See
`crates/wickra-core/src/indicators/detrended_stddev.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 2`      | Rolling window. |

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Standard binding shapes.

## Warmup

`warmup_period() == period`.

## Edge cases

- **Perfect linear fit.** Residuals all zero → output `0.0`.
- **Pure noise.** Output approximates the same as plain StdDev
  (no trend to remove).
- **Reset.** Clears running sums.

## Examples

### Rust

```rust
use wickra::{BatchExt, DetrendedStdDev, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let series: Vec<f64> = (0..50)
        .map(|i| f64::from(i) * 0.5 + (f64::from(i) * 0.3).sin())
        .collect();
    let mut d = DetrendedStdDev::new(20)?;
    println!("row 30 = {:?}", d.batch(&series)[30]);
    // Much lower than plain StdDev which includes the trend
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

series = np.arange(50, dtype=float) * 0.5 + np.sin(np.linspace(0, 15, 50))
d = ta.DetrendedStdDev(20)
print(d.batch(series)[30])
```

### Node

```javascript
const wickra = require('wickra');
const d = new wickra.DetrendedStdDev(20);
const series = Array.from({ length: 50 }, (_, i) => i * 0.5 + Math.sin(i * 0.3));
console.log(d.batch(series)[30]);
```

### Streaming

```rust
use wickra::{DetrendedStdDev, Indicator};

let mut d = DetrendedStdDev::new(20).unwrap();
let price_stream: Vec<f64> = Vec::new(); // your live price feed
for px in price_stream {
    if let Some(v) = d.update(px) {
        // v is pure noise around the trend
    }
}
```

## Interpretation

- **Vs plain StdDev.** On the same window, plain StdDev includes
  the trend's contribution to variance; DetrendedStdDev removes
  it. A trending series can have high StdDev and low
  DetrendedStdDev — meaning the trend is real, not noise.
- **Volatility-of-residuals.** Use to size noise-based stops:
  a Bollinger-style band of `±2 · DetrendedStdDev` around the
  regression line catches mean-reverting moves while ignoring
  the trend.
- **Regime classifier.** Low DetrendedStdDev with high R² =
  clean trend; high DetrendedStdDev = noisy regime.

## Common pitfalls

- **Confused with StdDev.** Different units of measurement; not
  interchangeable. Detrended is always ≤ StdDev for the same
  window.
- **Period choice.** Same as StdDev — short windows are noisy.

## References

- Standard regression-residual statistic; documented in any
  statistics text.

## See also

- [StandardError](Indicator-StandardError) — close cousin (uses
  `n - 2` denominator).
- [StdDev](Indicator-StdDev) — non-detrended baseline.
- [Variance](Indicator-Variance) — squared cousin.
- [LinearRegression](Indicator-LinearRegression) — the fit being
  used.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
