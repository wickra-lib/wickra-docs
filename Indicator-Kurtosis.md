# Kurtosis

> Rolling **excess** kurtosis (fourth standardised central moment
> minus 3) of the last `period` values. Positive readings flag fat
> tails (heavy outliers compared to normal); negative readings flag
> light tails (more concentrated than normal). `0` = Gaussian
> baseline.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Price Statistics                                                     |
| Input type          | `f64`                                                                |
| Output type         | `f64`                                                                |
| Output range        | `[-2, ∞)`                                                            |
| Default parameters  | `period` required                                                    |
| Warmup period       | `period`                                                             |
| Interpretation      | `> 3` very heavy tails; `< 0` light tails; `0` Gaussian               |

## Formula

```
mean     = (1/n) · Σ x
m2       = (1/n) · Σ (x - mean)²
m4       = (1/n) · Σ (x - mean)⁴
Kurtosis = m4 / m2² - 3
```

The unshifted kurtosis `m4/m2²` equals `3` for the normal
distribution; subtracting `3` gives **excess** kurtosis so that
`0` is Gaussian baseline. See
`crates/wickra-core/src/indicators/kurtosis.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `>= 4`     | Rolling window. |

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Standard binding shapes.

## Warmup

`warmup_period() == period`.

## Edge cases

- **Constant input.** m2 = 0; Kurtosis undefined → returns `0.0`.
- **Lower bound.** Mathematical floor for excess kurtosis is
  `-2` (achieved by a 2-point bimodal distribution).
- **Sample size sensitivity.** Kurtosis estimates from small
  windows are noisy; statistics literature warns against
  reading kurtosis on `n < 50`.
- **Reset.** Clears the rolling window.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, Kurtosis};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut returns: Vec<f64> = (0..100)
        .map(|i| (f64::from(i) * 0.2).sin() * 0.01)
        .collect();
    returns[50] = 0.1;  // outlier
    let mut k = Kurtosis::new(50)?;
    println!("row 80 = {:?}", k.batch(&returns)[80]);  // positive (fat tail)
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

returns = np.sin(np.linspace(0, 20, 100)) * 0.01
returns[50] = 0.1  # outlier
k = ta.Kurtosis(50)
print(k.batch(returns)[80])
```

### Node

```javascript
const wickra = require('wickra');
const k = new wickra.Kurtosis(50);
const returns = Array.from({ length: 100 }, (_, i) => Math.sin(i * 0.2) * 0.01);
returns[50] = 0.1;
console.log(k.batch(returns)[80]);
```

### Streaming

```rust
use wickra::{Indicator, Kurtosis};

let mut k = Kurtosis::new(252).unwrap();
for daily_return in return_stream {
    if let Some(v) = k.update(daily_return) {
        if v > 3.0 { /* fat-tail regime — tail-risk premia rising */ }
    }
}
```

## Interpretation

- **Excess kurtosis = 0.** Returns look Gaussian.
- **Excess kurtosis > 3.** Very heavy tails — common in
  financial returns. Risk models that assume normality
  underestimate tail risk in this regime.
- **Excess kurtosis < 0.** Light tails — rare but possible in
  range-bound markets.
- **Pair with Skewness.** Together describe the shape: skewed +
  fat-tailed = highly asymmetric tail risk.

## Common pitfalls

- **Sample-size noise.** Kurtosis is the most-noisy of the four
  moments. Don't read short-window kurtosis as anything more
  than directional.
- **Population vs sample.** Wickra uses population (`n`). Some
  references use sample formulas with bias corrections; ratios
  differ slightly.
- **Outlier sensitivity.** Single large outlier dramatically
  inflates kurtosis. By design — that's how it detects tail
  risk.

## References

- Standard statistics — documented in any introductory text.
- For finance applications: Cont, *Empirical properties of asset
  returns: stylized facts and statistical issues*, *Quantitative
  Finance*, 2001.

## See also

- [Skewness](Indicator-Skewness) — third-moment sibling.
- [Variance](Indicator-Variance) — second-moment.
- [StdDev](Indicator-StdDev) — sqrt of Variance.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
