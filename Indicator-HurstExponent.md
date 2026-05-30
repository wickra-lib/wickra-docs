# Hurst Exponent

> Rolling rescaled-range (R/S) estimator of the Hurst exponent.
> Distinguishes between trending (H > 0.5), random walk (H = 0.5),
> and mean-reverting (H < 0.5) regimes. Classic long-memory /
> long-range-dependence measure.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Price Statistics                                                     |
| Input type          | `f64`                                                                |
| Output type         | `f64`                                                                |
| Output range        | typically `(0, 1)`                                                    |
| Default parameters  | `period`, `chunks` both required                                     |
| Warmup period       | `period`                                                             |
| Interpretation      | `> 0.5` persistence; `0.5` random walk; `< 0.5` mean reversion        |

## Formula

```
For each chunk size m in {period/2, period/3, ..., period/chunks}:
    mean_m = (1/m) · Σ x_i over the chunk
    cumdev = cumulative deviation from mean
    R(m)   = max(cumdev) - min(cumdev)            (range)
    S(m)   = stddev of chunk
    log_RS = log(R(m) / S(m))
    log_m  = log(m)

Hurst = OLS slope of (log_m, log_RS) points
```

Streaming-friendly variant of the classic Hurst-Mandelbrot
estimator. See
`crates/wickra-core/src/indicators/hurst_exponent.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `>= 50`    | Rolling window. |
| `chunks` | `usize` | none    | `>= 2`     | Number of chunk sizes for the regression. |

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Standard binding shapes.

## Warmup

`warmup_period() == period`.

## Edge cases

- **Insufficient variability.** Constant input → S = 0 → log
  undefined. Returns NaN or `0.5` depending on implementation;
  Wickra returns NaN on degenerate inputs.
- **Period too small.** Hurst estimation needs ≥ 50 bars for
  reliability; smaller windows produce noisy estimates.
- **Reset.** Clears the rolling window.

## Examples

### Rust

```rust
use wickra::{BatchExt, HurstExponent, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let series: Vec<f64> = (0..200)
        .map(|i| f64::from(i) * 0.1 + (f64::from(i) * 0.3).sin() * 2.0)
        .collect();
    let mut h = HurstExponent::new(100, 4)?;
    println!("row 150 = {:?}", h.batch(&series)[150]);  // ~0.5 - 0.7 for trending
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

# Trending series
series = np.arange(200) * 0.1 + np.sin(np.linspace(0, 60, 200)) * 2
h = ta.HurstExponent(100, 4)
print(h.batch(series)[150])
```

### Node

```javascript
const wickra = require('wickra');
const h = new wickra.HurstExponent(100, 4);
const series = Array.from({ length: 200 }, (_, i) => i * 0.1 + Math.sin(i * 0.3) * 2);
console.log(h.batch(series)[150]);
```

### Streaming

```rust
use wickra::{HurstExponent, Indicator};

let mut h = HurstExponent::new(252, 5).unwrap();
for px in price_stream {
    if let Some(v) = h.update(px) {
        if v > 0.55 { /* trending regime */ }
        if v < 0.45 { /* mean-reverting regime */ }
    }
}
```

## Interpretation

- **H > 0.5 (persistence).** Series is trending — same-direction
  moves more likely than reversal. Long-memory / autocorrelation
  is positive.
- **H = 0.5 (random walk).** No memory; pure Brownian. The
  efficient-market null hypothesis.
- **H < 0.5 (anti-persistence).** Series mean-reverts — moves
  reverse more often than continue. Common in spread series and
  some FX pairs.
- **Strategy gate.** Use H to select between trend-following and
  mean-reversion systems dynamically.

## Common pitfalls

- **Short windows = noise.** Hurst on `period = 30` is barely
  signal. Use ≥ 100 for stable estimates.
- **Treating H as exact.** R/S has known biases (overestimates H
  in finite samples). Use as direction signal, not as precise
  parameter.
- **Non-stationarity.** Mixed regimes within the window blur the
  estimate.

## References

- Harold E. Hurst, *Long-Term Storage Capacity of Reservoirs*,
  *Transactions of the American Society of Civil Engineers*, 1951
  — original Hurst exponent.
- Benoit Mandelbrot & James Wallis, *Robustness of the rescaled
  range R/S in the measurement of noncyclic long-run statistical
  dependence*, 1969 — R/S analysis.

## See also

- [Autocorrelation](Indicator-Autocorrelation) — single-lag
  cousin.
- [DetrendedStdDev](Indicator-DetrendedStdDev) — regression-
  residual volatility.
- [Variance](Indicator-Variance) — short-horizon dispersion.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
