# Spearman Rank Correlation

> Rolling Spearman rank correlation between two synchronised series.
> Captures **monotonic** rather than linear association — values
> in each channel are replaced by their ranks (mid-ranks for ties),
> and the Pearson correlation of those ranks is reported. Robust to
> nonlinearities that defeat Pearson.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Price Statistics                                                     |
| Input type          | `(f64, f64)` — `(x, y)` pair per update                              |
| Output type         | `f64`                                                                |
| Output range        | `[-1, +1]`                                                           |
| Default parameters  | `period` required                                                    |
| Warmup period       | `period`                                                             |
| Interpretation      | Strength of monotonic relationship (linear or nonlinear)              |

## Formula

```
rx = rank(x_i)  with mid-rank tie handling
ry = rank(y_i)  with mid-rank tie handling
Spearman = Pearson(rx, ry)
```

Mid-rank tie handling assigns the average rank to tied values
(matches scipy's default). See
`crates/wickra-core/src/indicators/spearman_correlation.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 1`      | Rolling window. |

## Inputs / Outputs

`Indicator<Input = (f64, f64), Output = f64>`. Standard binding
shapes.

## Warmup

`warmup_period() == period`.

## Edge cases

- **All-tied input.** Variance of ranks zero → output `0.0`.
- **Monotone but nonlinear relationship.** Pearson may show low
  correlation; Spearman shows `±1`.
- **Cost.** Each update is O(period · log period) due to sort.
- **Reset.** Clears the rolling window.

## Examples

### Rust

```rust
use wickra::{Indicator, SpearmanCorrelation};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut s = SpearmanCorrelation::new(50)?;
    for i in 0..100 {
        let x = f64::from(i);
        let y = x.powi(2);  // monotone nonlinear
        let _ = s.update((x, y));
    }
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

x = np.arange(100, dtype=float)
y = x ** 2
s = ta.SpearmanCorrelation(50)
print(s.batch(x, y)[-1])  # +1.0 (perfectly monotone)
```

### Node

```javascript
const wickra = require('wickra');
const s = new wickra.SpearmanCorrelation(50);
// feed x, y
```

### Streaming

```rust
use wickra::{Indicator, SpearmanCorrelation};

let mut s = SpearmanCorrelation::new(252).unwrap();
let price_stream: Vec<(f64, f64)> = Vec::new(); // your paired (a, b) feed
for (asset_a, asset_b) in price_stream {
    if let Some(v) = s.update((asset_a, asset_b)) {
        // v is rolling rank correlation — robust to nonlinearity
    }
}
```

## Interpretation

- **Spearman ≈ +1.** Perfect monotone increasing relationship
  (linear OR nonlinear).
- **Spearman ≈ -1.** Perfect monotone decreasing.
- **Vs Pearson.** Pearson detects only linear; Spearman detects
  any monotone relationship. For two series related by `y = x²`
  (positive x): Pearson ≈ 0.97; Spearman = 1.0.
- **Outlier robustness.** Ranks bound outliers — Spearman is
  more robust than Pearson to extreme values.

## Common pitfalls

- **Slower than Pearson.** O(n log n) per update vs O(1).
- **Tie handling.** Series with many tied values produce
  ambiguous ranks; mid-rank handling is standard but other
  conventions exist.
- **Confusing with Kendall's tau.** Kendall's tau is another
  rank correlation; computationally more expensive, slightly
  different formula. Wickra implements Spearman.

## References

- Charles Spearman, *The Proof and Measurement of Association
  between Two Things*, *American Journal of Psychology*, 1904.

## See also

- [PearsonCorrelation](/Indicators/Indicator-PearsonCorrelation) — linear
  cousin.
- [Beta](/Indicators/Indicator-Beta) — regression slope (related but different).
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
