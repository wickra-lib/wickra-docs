# Pearson Correlation

> Rolling Pearson correlation between two synchronised series.
> Measures linear association on a `[-1, +1]` scale. `+1` = perfect
> positive linear relationship; `-1` = perfect negative; `0` = no
> linear relationship.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Price Statistics                                                     |
| Input type          | `(f64, f64)` — `(x, y)` pair per update                              |
| Output type         | `f64`                                                                |
| Output range        | `[-1, +1]`                                                           |
| Default parameters  | `period` required                                                    |
| Warmup period       | `period`                                                             |
| Interpretation      | Linear association strength                                           |

## Formula

```
cov_xy  = (1/n) · Σ x·y - x̄·ȳ
var_x   = (1/n) · Σ x² - x̄²
var_y   = (1/n) · Σ y² - ȳ²
Pearson = cov_xy / √(var_x · var_y)
```

Each `update` is O(1) via running sums. See
`crates/wickra-core/src/indicators/pearson_correlation.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 1`      | Rolling window. |

## Inputs / Outputs

`Indicator<Input = (f64, f64), Output = f64>`. Python:
`PearsonCorrelation(period).batch(x, y)` returns 1-D `np.ndarray`.

## Warmup

`warmup_period() == period`.

## Edge cases

- **Zero variance.** Either input flat → denominator zero →
  output `0.0` (rather than NaN).
- **Pearson on monotone series.** Returns can be near ±1 even
  if the relationship is nonlinear, as long as ranks are
  monotone — for nonlinear relationships use
  [SpearmanCorrelation](Indicator-SpearmanCorrelation).
- **Reset.** Clears running sums.

## Examples

### Rust

```rust
use wickra::{Indicator, PearsonCorrelation};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut p = PearsonCorrelation::new(50)?;
    for i in 0..100 {
        let x = f64::from(i);
        let y = x * 2.0 + (f64::from(i) * 0.5).sin();
        let _ = p.update((x, y));
    }
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

x = np.arange(100, dtype=float)
y = x * 2 + np.sin(np.linspace(0, 50, 100))
p = ta.PearsonCorrelation(50)
print(p.batch(x, y)[-1])
```

### Node

```javascript
const wickra = require('wickra');
const p = new wickra.PearsonCorrelation(50);
// feed x, y
```

### Streaming

```rust
use wickra::{Indicator, PearsonCorrelation};

let mut p = PearsonCorrelation::new(252).unwrap();
for (asset_a, asset_b) in price_stream {
    if let Some(v) = p.update((asset_a, asset_b)) {
        // v = rolling correlation
    }
}
```

## Interpretation

- **Pearson > 0.7.** Strong positive linear relationship.
- **Pearson 0.3 - 0.7.** Moderate.
- **Pearson < 0.3.** Weak or absent.
- **Diversification.** Negative correlation between asset pairs
  is the basis of portfolio diversification — a -0.5 correlation
  pair smooths the joint equity curve significantly.

## Common pitfalls

- **Linear only.** Detects linear association. Two series with
  perfect nonlinear relationship (e.g. y = x²) can have Pearson
  ≈ 0. Use Spearman for nonlinear.
- **Period choice.** Short windows produce noisy correlation
  estimates. ≥ 50 bars recommended.
- **Pairs of returns vs prices.** Correlation of returns is the
  finance-meaningful measure; correlation of raw prices is
  dominated by joint trends and overstates dependence.

## References

- Karl Pearson, *Notes on Regression and Inheritance in the Case
  of Two Parents*, *Proceedings of the Royal Society of London*,
  1895.

## See also

- [SpearmanCorrelation](Indicator-SpearmanCorrelation) — rank-
  based cousin (handles monotone nonlinearities).
- [Beta](Indicator-Beta) — slope rather than correlation.
- [Autocorrelation](Indicator-Autocorrelation) — single-series
  cousin.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
