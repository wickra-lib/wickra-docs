# Variance

> Rolling population variance of the input series. The second
> central moment of the rolling distribution — the squared sibling
> of [StdDev](Indicator-StdDev). Natural input to risk calculations
> that expect squared returns (portfolio variance, covariance
> matrices).

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Price Statistics                                                     |
| Input type          | `f64`                                                                |
| Output type         | `f64`                                                                |
| Output range        | `[0, ∞)`                                                             |
| Default parameters  | `period` required                                                    |
| Warmup period       | `period`                                                             |
| Interpretation      | Squared dispersion; use StdDev for human-readable units              |

## Formula

```
mean     = (1/n) · Σ price
Variance = (1/n) · Σ price² - mean²
```

Population variance (denominator `n`), not sample variance. See
`crates/wickra-core/src/indicators/variance.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 0`      | Rolling window. |

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Standard binding shapes.

## Warmup

`warmup_period() == period`.

## Edge cases

- **Constant input.** Variance = 0.
- **Catastrophic cancellation.** Wickra uses Welford's online
  formula plus periodic reseeding to keep f64 precision stable on
  long-running streams.
- **Reset.** Clears the rolling buffer and sums.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, Variance};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prices: Vec<f64> = (0..50)
        .map(|i| 100.0 + (f64::from(i) * 0.3).sin() * 5.0)
        .collect();
    let mut v = Variance::new(20)?;
    println!("row 30 = {:?}", v.batch(&prices)[30]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

prices = 100 + np.sin(np.linspace(0, 15, 50)) * 5
v = ta.Variance(20)
print(v.batch(prices)[30])
```

### Node

```javascript
const wickra = require('wickra');
const v = new wickra.Variance(20);
const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i * 0.3) * 5);
console.log(v.batch(prices)[30]);
```

### Streaming

```rust
use wickra::{Indicator, Variance};

let mut v = Variance::new(252).unwrap();
for px in price_stream {
    if let Some(val) = v.update(px) {
        // val is rolling variance in squared price units
    }
}
```

## Interpretation

Variance is the **second central moment**. For human-readable
units, use [StdDev](Indicator-StdDev) instead — it's just the
square root.

Variance is more useful when:

- The downstream calculation is itself squared (portfolio
  variance, covariance matrices).
- You're working with a sum of variances (which only makes
  sense in squared units).

## Common pitfalls

- **Population vs sample variance.** Wickra emits population
  (`/n`); some libraries emit sample (`/(n-1)`). Multiply by
  `n / (n-1)` to convert.
- **Squared units.** Variance is in price-squared units; not
  directly comparable to price. Use StdDev for price-comparable
  volatility.

## References

- Standard statistics text definition.

## See also

- [StdDev](Indicator-StdDev) — square-root sibling.
- [CoefficientOfVariation](Indicator-CoefficientOfVariation) —
  variance-normalised-by-mean.
- [MedianAbsoluteDeviation](Indicator-MedianAbsoluteDeviation) —
  robust alternative.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
