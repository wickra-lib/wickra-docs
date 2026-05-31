# Skewness

> Rolling Pearson skewness (third standardised central moment) of
> the last `period` values. Positive skewness means the right tail
> is heavier than the left; negative skewness flags the opposite. A
> symmetric distribution has skewness `0`.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Price Statistics                                                     |
| Input type          | `f64`                                                                |
| Output type         | `f64`                                                                |
| Output range        | unbounded                                                            |
| Default parameters  | `period` required                                                    |
| Warmup period       | `period`                                                             |
| Interpretation      | Distribution asymmetry; financial returns typically `-0.5 to -2`     |

## Formula

```
mean = (1/n) · Σ x
m2   = (1/n) · Σ (x - mean)²        (population variance)
m3   = (1/n) · Σ (x - mean)³        (third central moment)
Skew = m3 / m2^(3/2)
```

Population formula with divisor `n`. See
`crates/wickra-core/src/indicators/skewness.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `>= 3`     | Rolling window. |

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Standard binding shapes.

## Warmup

`warmup_period() == period`.

## Edge cases

- **m2 = 0.** Constant input; skew undefined → returns `0.0`.
- **Sample size.** Skew is noisy on small windows; ≥ 50 bars
  recommended.
- **Reset.** Clears the rolling window.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, Skewness};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut series: Vec<f64> = (0..100).map(|i| f64::from(i) * 0.1).collect();
    series[50] = 50.0;  // positive outlier
    let mut s = Skewness::new(50)?;
    println!("row 80 = {:?}", s.batch(&series)[80]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

series = np.arange(100, dtype=float) * 0.1
series[50] = 50.0
s = ta.Skewness(50)
print(s.batch(series)[80])  # positive skew
```

### Node

```javascript
const wickra = require('wickra');
const s = new wickra.Skewness(50);
const series = Array.from({ length: 100 }, (_, i) => i * 0.1);
series[50] = 50.0;
console.log(s.batch(series)[80]);
```

### Streaming

```rust
use wickra::{Indicator, Skewness};

let mut s = Skewness::new(252).unwrap();
let return_stream: Vec<f64> = Vec::new(); // your stream of periodic returns
for daily_return in return_stream {
    if let Some(v) = s.update(daily_return) {
        if v < -1.0 { /* heavy left tail — drawdown risk elevated */ }
    }
}
```

## Interpretation

- **Positive skew.** Right tail heavier — occasional large
  positive moves. Trend-following / momentum strategies tend to
  produce positively skewed returns.
- **Negative skew.** Left tail heavier — occasional large
  negative moves. Typical for equity index returns; mean-reversion
  strategies often produce negative skew.
- **Skew = 0.** Symmetric — likely Gaussian or symmetric
  bimodal.
- **Pair with Kurtosis.** Skewness tells you which tail is
  heavier; kurtosis tells you how heavy the tails are overall.

## Common pitfalls

- **Sample-size noise.** Same caveat as Kurtosis — small windows
  give noisy estimates. Use ≥ 50 bars.
- **Population vs sample.** Wickra uses population (`n` divisor).
  pandas uses sample with bias correction (Fisher-Pearson). The
  two differ by ~5% for `n = 50`.
- **Outlier sensitivity.** Single large outlier dramatically
  inflates skew. Intentional — that's what it measures.

## References

- Standard statistics; documented in any introductory text.
- For finance applications: Mandelbrot, *The Variation of
  Certain Speculative Prices*, *Journal of Business*, 1963 —
  first formal recognition of non-Gaussian return distributions
  in finance.

## See also

- [Kurtosis](Indicator-Kurtosis) — fourth-moment sibling.
- [Variance](Indicator-Variance) — second-moment.
- [StdDev](Indicator-StdDev) — sqrt of Variance.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
