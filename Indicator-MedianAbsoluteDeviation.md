# Median Absolute Deviation (MAD)

> Robust dispersion estimator — the median of absolute deviations
> from the window's median. The median analogue of standard
> deviation: ignores extreme outliers (a single huge spike barely
> moves the result) and is widely used as a sturdier alternative
> to StdDev for risk reporting on heavy-tailed return distributions.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Price Statistics                                                     |
| Input type          | `f64`                                                                |
| Output type         | `f64`                                                                |
| Output range        | `[0, ∞)`                                                             |
| Default parameters  | `period` required                                                    |
| Warmup period       | `period`                                                             |
| Interpretation      | Outlier-resistant volatility measure                                  |

## Formula

```
med = median(window)
MAD = median( |x_i - med|  for x_i in window )
```

Multiplying MAD by `1.4826` gives a consistent estimator of the
underlying Gaussian standard deviation ("robust σ"). Wickra
returns raw MAD; multiply downstream if you want the σ
equivalent. See
`crates/wickra-core/src/indicators/median_absolute_deviation.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 0`      | Rolling window. |

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Standard binding shapes.

## Warmup

`warmup_period() == period`.

## Edge cases

- **All-identical input.** MAD = 0.
- **Outlier robustness.** Single spike that would inflate StdDev
  by 5x barely changes MAD (~1x).
- **Cost.** Each update is O(period · log period) for the sort;
  acceptable for `period ≤ 252`.
- **Reset.** Clears the rolling window.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, MedianAbsoluteDeviation};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut series: Vec<f64> = (0..50).map(|i| 100.0 + f64::from(i % 5)).collect();
    series[25] = 200.0;  // outlier
    let mut mad = MedianAbsoluteDeviation::new(20)?;
    println!("row 30 MAD = {:?}", mad.batch(&series)[30]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

series = (100 + np.arange(50) % 5).astype(float)
series[25] = 200.0
mad = ta.MedianAbsoluteDeviation(20)
print(mad.batch(series)[30])
```

### Node

```javascript
const wickra = require('wickra');
const mad = new wickra.MedianAbsoluteDeviation(20);
const series = Array.from({ length: 50 }, (_, i) => 100 + i % 5);
series[25] = 200;
console.log(mad.batch(series)[30]);
```

### Streaming

```rust
use wickra::{Indicator, MedianAbsoluteDeviation};

let mut mad = MedianAbsoluteDeviation::new(50).unwrap();
for px in price_stream {
    if let Some(v) = mad.update(px) {
        let robust_sigma = v * 1.4826;
        // Use robust_sigma in place of StdDev for outlier-robust risk
    }
}
```

## Interpretation

- **Robust to outliers.** MAD's breakdown point is 50% (you can
  corrupt half the data and MAD still works). StdDev's breakdown
  point is 0%.
- **Use for heavy-tailed series.** Financial returns are
  notoriously heavy-tailed; MAD-based risk gives more stable
  readings than StdDev-based.
- **Robust σ.** `1.4826 · MAD` ≈ Gaussian σ for a normal
  population; useful when you want the σ-units interpretation
  but with outlier protection.

## Common pitfalls

- **MAD ≠ StdDev.** Don't substitute MAD where σ is expected
  without applying the `1.4826` correction (or document the
  alternative units).
- **Cost on large windows.** O(period · log period). Long
  windows on minute bars can be slow.

## References

- Frederick Hampel, *The Influence Curve and Its Role in Robust
  Estimation*, *Journal of the American Statistical Association*,
  1974.

## See also

- [StdDev](Indicator-StdDev) — non-robust cousin.
- [Variance](Indicator-Variance) — squared cousin.
- [CoefficientOfVariation](Indicator-CoefficientOfVariation) —
  dispersion-normalised-by-mean.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
