# Coefficient of Variation (CV)

> Dimensionless dispersion measure: the rolling population standard
> deviation divided by the rolling mean. Scales `StdDev` by the
> price level so two assets at very different price magnitudes can
> be compared directly. Higher CV = more relative variability.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Price Statistics                                                     |
| Input type          | `f64`                                                                |
| Output type         | `f64`                                                                |
| Output range        | `[0, ∞)`                                                             |
| Default parameters  | `period` required                                                    |
| Warmup period       | `period`                                                             |
| Interpretation      | Cross-instrument-comparable volatility measure                        |

## Formula

```
mean = (1/n) · Σ price
sd   = √( (1/n) · Σ price² - mean² )      (population StdDev)
CV   = sd / mean
```

Returns `0.0` when mean is zero (avoids NaN). See
`crates/wickra-core/src/indicators/coefficient_of_variation.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 1`      | Rolling window. |

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Standard binding shapes.

## Warmup

`warmup_period() == period`.

## Edge cases

- **Mean = 0.** Returns `0.0`.
- **Constant input.** SD = 0 → CV = 0.
- **Negative mean.** CV uses raw mean, so result can be
  negative if you're feeding signed data with negative mean
  (rare with prices).
- **Reset.** Clears running sums.

## Examples

### Rust

```rust
use wickra::{BatchExt, CoefficientOfVariation, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prices: Vec<f64> = (0..50)
        .map(|i| 100.0 + (f64::from(i) * 0.3).sin() * 5.0)
        .collect();
    let mut cv = CoefficientOfVariation::new(20)?;
    println!("row 30 = {:?}", cv.batch(&prices)[30]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

prices = 100 + np.sin(np.linspace(0, 15, 50)) * 5
cv = ta.CoefficientOfVariation(20)
print(cv.batch(prices)[30])
```

### Node

```javascript
const wickra = require('wickra');
const cv = new wickra.CoefficientOfVariation(20);
const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i * 0.3) * 5);
console.log(cv.batch(prices)[30]);
```

### Streaming

```rust
use wickra::{CoefficientOfVariation, Indicator};

let mut cv = CoefficientOfVariation::new(252).unwrap();
let price_stream: Vec<f64> = Vec::new(); // your live price feed
for px in price_stream {
    if let Some(v) = cv.update(px) {
        // v is comparable across instruments with different price scales
    }
}
```

## Interpretation

- **Cross-instrument comparison.** `CV = 0.05` on a $10 stock
  (SD = $0.50) is the same volatility as `CV = 0.05` on a $1000
  stock (SD = $50). Unlike raw StdDev, CV is comparable.
- **Volatility regime.** Rising CV = increasing relative
  volatility. Falling CV = compressing volatility (often
  precedes a breakout).
- **Pair with mean.** A high CV with low mean = noisy and going
  nowhere; high CV with high mean trend = volatile trend.

## Common pitfalls

- **Negative-mean inputs.** CV on signed return series with
  negative mean is misleading. Use absolute price for CV;
  StdDev / mean of returns gives a different statistic
  (volatility-to-drift ratio).
- **Period choice.** Same as StdDev — too-short windows are
  noisy.

## References

- Standard statistics textbook measure; documented in any
  introductory statistics text.

## See also

- [StdDev](/Indicators/Indicator-StdDev) — the numerator.
- [Variance](/Indicators/Indicator-Variance) — squared cousin.
- [HistoricalVolatility](/Indicators/Indicator-HistoricalVolatility) —
  return-based volatility alternative.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
