# Autocorrelation

> Rolling lag-`k` Pearson autocorrelation of the input series.
> Quantifies linear dependence between the series and itself shifted
> by `lag` bars. `+1` = perfectly repeating pattern at that lag;
> `-1` = perfect alternation; near `0` = no linear relationship —
> a clean white-noise proxy.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Price Statistics                                                     |
| Input type          | `f64`                                                                |
| Output type         | `f64`                                                                |
| Output range        | `[-1, +1]`                                                           |
| Default parameters  | `period`, `lag` both required                                        |
| Warmup period       | `period`                                                             |
| Interpretation      | Linear self-dependence at the given lag                               |

## Formula

```
y_i  for i in window
ȳ    = mean(y)
ACF(lag) = Σ ((y_i - ȳ)(y_{i+lag} - ȳ))
         / Σ (y_i - ȳ)²
```

See `crates/wickra-core/src/indicators/autocorrelation.rs`.

## Parameters

| Name     | Type    | Default | Constraint            | Description |
|----------|---------|---------|-----------------------|-------------|
| `period` | `usize` | none    | `> 1 + lag`           | Rolling window. |
| `lag`    | `usize` | none    | `> 0`, `< period`     | Bar lag for the correlation. |

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Standard binding shapes.

## Warmup

`warmup_period() == period`.

## Edge cases

- **Constant input.** Variance zero; ACF undefined → returns
  `0.0`.
- **Lag = 1.** Common choice for mean-reversion detection;
  `lag = 5` for weekly seasonality, etc.
- **Boundary effects.** Short windows produce noisy ACF
  estimates; use ≥ 50 bars for stable signals.
- **Reset.** Clears the rolling window.

## Examples

### Rust

```rust
use wickra::{Autocorrelation, BatchExt, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let series: Vec<f64> = (0..100)
        .map(|i| (f64::from(i) * 0.4).sin())
        .collect();
    let mut ac = Autocorrelation::new(50, 1)?;
    println!("row 80 = {:?}", ac.batch(&series)[80]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

series = np.sin(np.linspace(0, 40, 100))
ac = ta.Autocorrelation(50, 1)
print(ac.batch(series)[80])
```

### Node

```javascript
const wickra = require('wickra');
const ac = new wickra.Autocorrelation(50, 1);
const series = Array.from({ length: 100 }, (_, i) => Math.sin(i * 0.4));
console.log(ac.batch(series)[80]);
```

### Streaming

```rust
use wickra::{Autocorrelation, Indicator};

let mut ac = Autocorrelation::new(50, 1).unwrap();
let price_stream: Vec<f64> = Vec::new(); // your live price feed
for px in price_stream {
    if let Some(v) = ac.update(px) {
        if v > 0.5 { /* persistence regime — trend-following may work */ }
        if v < -0.3 { /* anti-persistence — mean reversion may work */ }
    }
}
```

## Interpretation

- **Positive lag-1 ACF.** Persistence — same-direction moves tend
  to repeat. Trend-following has edge.
- **Negative lag-1 ACF.** Anti-persistence — moves tend to
  reverse. Mean-reversion has edge.
- **Near-zero ACF.** Random walk — neither trend nor MR has
  obvious edge from autocorrelation alone.
- **Lag pattern.** Sweep multiple lags to find seasonality
  (e.g. lag-5 for weekly cycles in daily data).

## Common pitfalls

- **Single-lag overinterpretation.** ACF at one lag is one data
  point; sweep multiple lags to get the picture.
- **Returns vs prices.** ACF on raw prices is dominated by the
  trend; usually you want ACF on returns or detrended prices.
- **Stationarity assumption.** Pearson correlation assumes
  stationarity. Non-stationary series (e.g. random walks)
  produce misleading ACF.

## References

- Box, Jenkins & Reinsel, *Time Series Analysis* (4th ed., 2008)
  — canonical reference for ACF and time-series analysis.

## See also

- [PearsonCorrelation](Indicator-PearsonCorrelation) — two-series
  correlation sibling.
- [HurstExponent](Indicator-HurstExponent) — long-memory measure.
- [Variance](Indicator-Variance) — uses similar deviation math.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
