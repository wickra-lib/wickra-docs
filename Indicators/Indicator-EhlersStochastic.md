# Ehlers Stochastic

> John Ehlers' Adaptive Stochastic. Pre-filters price through a
> [RoofingFilter](/Indicators/Indicator-RoofingFilter) (high-pass + SuperSmoother
> bandpass) to isolate the tradable cycle band, then applies the
> classic Stochastic %K formula to the filtered output over `period`
> bars and re-smooths with a 2-bar SuperSmoother. Output is on the
> Ehlers `[-1, +1]` convention rather than the conventional
> `[0, 100]`.

## Quick reference

| Item                | Value                                                                  |
|---------------------|------------------------------------------------------------------------|
| Family              | Ehlers / Cycle (DSP)                                                   |
| Input type          | `f64`                                                                  |
| Output type         | `f64`                                                                  |
| Output range        | `[-1, +1]`                                                             |
| Default parameters  | `period` is required (Ehlers' typical `20`)                            |
| Warmup period       | `period + roofing_warmup` (~`period + 50`)                             |
| Interpretation      | `> 0.5` overbought; `< -0.5` oversold; near-zero-lag at cycle band     |

## Formula

```
filtered_t = RoofingFilter(10, 48).update(x_t)

over `period` bars of filtered values:
    raw_stoch_t = 2 · (filtered_t - min(filtered)) / (max - min) - 1

stoch_t = SuperSmoother-2-bar(raw_stoch)
```

The `2 · (X − MinX) / (MaxX − MinX) - 1` rescale puts the output in
`[-1, +1]` instead of the classic `[0, 100]`. See
`crates/wickra-core/src/indicators/ehlers_stochastic.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 0`      | Rolling-window length for the inner stochastic. |

`EhlersStochastic::new` returns `Error::PeriodZero` for `period == 0`.
The inner Roofing Filter uses fixed `(10, 48)` periods — Ehlers'
canonical defaults; not user-tunable.

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Python:
`EhlersStochastic(period).batch(prices)` returns a 1-D
`np.ndarray` with `NaN` in the warmup prefix. Node: same shape;
`update(value)` returns `number | null`.

## Warmup

`warmup_period()` accounts for Roofing-Filter warmup (~50 bars) plus
the rolling window (`period`). For `period = 20`, expect ~70 bars
before stable output.

## Edge cases

- **Constant input.** Roofing Filter outputs zero; stochastic
  denominator is zero; the indicator returns `None` until variation
  appears.
- **Saturation in trends.** Even with Roofing Filter pre-processing,
  strong trends can leak residual signal that saturates the
  stochastic at `±1`. Combine with a trend filter.
- **Reset.** `reset()` clears the Roofing Filter, the rolling
  window, and the 2-tap smoother.

## Examples

### Rust

```rust
use wickra::{BatchExt, EhlersStochastic, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prices: Vec<f64> = (0..200)
        .map(|i| 100.0 + (f64::from(i) * 0.3).sin() * 5.0)
        .collect();
    let mut es = EhlersStochastic::new(20)?;
    println!("row 100 = {:?}", es.batch(&prices)[100]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

prices = 100 + np.sin(np.linspace(0, 60, 200)) * 5
es = ta.EhlersStochastic(20)
print('warmup:', es.warmup_period())  # ~70
print('row 100:', es.batch(prices)[100])
```

### Node

```javascript
const wickra = require('wickra');
const es = new wickra.EhlersStochastic(20);
const prices = Array.from({ length: 200 },
  (_, i) => 100 + Math.sin(i * 0.3) * 5);
console.log('row 100:', es.batch(prices)[100]);
```

### Streaming

```rust
use wickra::{EhlersStochastic, Indicator};

let mut es = EhlersStochastic::new(20).unwrap();
let price_stream: Vec<f64> = Vec::new(); // your live price feed
for px in price_stream {
    if let Some(v) = es.update(px) {
        if v > 0.5 { /* overbought */ }
        if v < -0.5 { /* oversold */ }
    }
}
```

## Interpretation

- **Bandpass-prefiltered Stochastic.** The Roofing Filter strips out
  trend and noise before the stochastic computes; what's left is
  the genuine cycle component, so overbought / oversold readings
  are meaningful rather than just "we're trending up".
- **Near-zero-lag.** The Roofing Filter has minimal phase lag in
  the cycle band; the stochastic on top adds typical
  rolling-window lag (`period / 2`).
- **±0.5 thresholds.** Use as standard overbought / oversold; the
  `[-1, +1]` scale makes thresholds universal across markets.

## Common pitfalls

- **Treating it as a regular Stochastic.** The output range is
  `[-1, +1]`, not `[0, 100]`. Direct threshold comparisons against
  classical Stochastic levels (`80`, `20`) won't work.
- **Short warmup expectations.** ~70 bars before stable on
  `period = 20`. Backtests on short data will underperform.
- **Trend masking.** Strong trends do leak into the cycle band;
  Ehlers Stochastic does *not* completely eliminate trend bias.
  Pair with a trend filter.

## References

- John F. Ehlers, *Cycle Analytics for Traders*, Wiley (2013),
  ch. 7 — Adaptive Stochastic on Roofing Filter output.

## See also

- [RoofingFilter](/Indicators/Indicator-RoofingFilter) — the underlying
  pre-filter.
- [Stochastic](/Indicators/Indicator-Stochastic) — classical Stochastic on
  raw price.
- [SuperSmoother](/Indicators/Indicator-SuperSmoother) — final smoothing
  stage.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
