# Instantaneous Trendline

> John Ehlers' near-zero-lag trend extractor. Uses a fixed
> 5-coefficient recurrence tuned by `period` to estimate the trend
> component of price almost instantaneously — at the cost of some
> noise compared to slower smoothers. Designed to be paired with a
> faster oscillator for early trend-change detection.

## Quick reference

| Item                | Value                                                                  |
|---------------------|------------------------------------------------------------------------|
| Family              | Ehlers / Cycle (DSP)                                                   |
| Input type          | `f64`                                                                  |
| Output type         | `f64`                                                                  |
| Output range        | unbounded; tracks input price scale                                    |
| Default parameters  | `period` is required (typical `20`)                                    |
| Warmup period       | `period`                                                               |
| Interpretation      | Near-zero-lag trend line; cleaner than EMA at equivalent period        |

## Formula

```
alpha = (cos(2π/period) + sin(2π/period) - 1) / cos(2π/period)

iTrend_t = (alpha - alpha²/4) · price_t
         + 0.5 · alpha² · price_{t-1}
         - (alpha - 0.75 · alpha²) · price_{t-2}
         + 2 · (1 - alpha) · iTrend_{t-1}
         - (1 - alpha)² · iTrend_{t-2}
```

The coefficients are tuned to remove the in-phase oscillation at
the specified period while preserving the trend. See
`crates/wickra-core/src/indicators/instantaneous_trendline.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `>= 2`     | Cycle period the trendline is tuned to suppress. |

`InstantaneousTrendline::new` returns `Error::PeriodZero` for
`period == 0` and `Error::InvalidPeriod` for `period == 1`.

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Python:
`InstantaneousTrendline(period).batch(prices)` returns a 1-D
`np.ndarray` with `NaN` in the warmup prefix. Node: same shape;
`update(value)` returns `number | null`.

## Warmup

`warmup_period() == period`. The first `period - 1` inputs use a
seeded SMA initial condition (Ehlers' standard); from input
`period` onward the proper 5-term recurrence runs.

## Edge cases

- **Constant input.** iTrend converges to the constant.
- **Step input.** Some overshoot then settles; the trend tracking
  is fast but not perfectly damped (this is the noise / speed
  tradeoff Ehlers warns about).
- **Pure sinusoid at `period`.** The cosine-tuned coefficients
  suppress it; iTrend tracks the slow-trend component (i.e. the
  baseline of the sinusoid).
- **Reset.** `reset()` clears all internal state.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, InstantaneousTrendline};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prices: Vec<f64> = (0..100)
        .map(|i| 100.0 + f64::from(i) * 0.5 + (f64::from(i) * 0.4).sin() * 5.0)
        .collect();
    let mut it = InstantaneousTrendline::new(20)?;
    println!("row 50 = {:?}", it.batch(&prices)[50]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

t = np.arange(100)
prices = 100 + t * 0.5 + np.sin(t * 0.4) * 5
it = ta.InstantaneousTrendline(20)
print('warmup:', it.warmup_period())  # 20
print('row 50:', it.batch(prices)[50])
```

### Node

```javascript
const wickra = require('wickra');
const it = new wickra.InstantaneousTrendline(20);
const prices = Array.from({ length: 100 },
  (_, i) => 100 + i * 0.5 + Math.sin(i * 0.4) * 5);
console.log('row 50:', it.batch(prices)[50]);
```

### Streaming

```rust
use wickra::{Indicator, InstantaneousTrendline};

let mut it = InstantaneousTrendline::new(20).unwrap();
let price_stream: Vec<f64> = Vec::new(); // your live price feed
for px in price_stream {
    if let Some(v) = it.update(px) {
        // Price crossings of iTrend = trend-change signals
        if px > v { /* potential uptrend */ }
    }
}
```

## Interpretation

Instantaneous Trendline is the **near-zero-lag trend line** in
Ehlers' framework:

- **Price crossings of iTrend** are faster trend-change signals than
  price-vs-EMA / price-vs-SMA. Use as an early entry trigger,
  confirmed by a slower indicator.
- **Less smoothing than Decycler** at the same period — sharper
  response, slightly more noise.
- **Pairs with the Sine Wave indicator.** When SineWave shows a
  cycle regime, use iTrend's slope as the cycle-vs-trend
  classifier; when iTrend slopes consistently, the cycle component
  is small.

Use when you need to detect trend turns fast and can tolerate some
noise.

## Common pitfalls

- **Mistaking the period semantics.** Like all Ehlers DSP, the
  `period` here is the cycle to suppress, not the SMA-equivalent
  smoothing window. iTrend(20) is much faster than SMA(20).
- **Stacking iTrend on iTrend.** Doesn't kill more lag — it just
  introduces phase distortion. Use a slow Decycler or SuperSmoother
  if you need more smoothing.
- **Treating crossover as a hard signal.** iTrend is fast enough
  that crossover-based trades whip in choppy markets. Pair with a
  trend filter (slope, slow Decycler).

## References

- John F. Ehlers, *Rocket Science for Traders* (2001), ch. 7 —
  original Instantaneous Trendline derivation.
- John F. Ehlers, *Cybernetic Analysis for Stocks and Futures*
  (2004) — refinements and pairing strategies.

## See also

- [Decycler](/Indicators/Indicator-Decycler) — slower trend extractor.
- [SuperSmoother](/Indicators/Indicator-SuperSmoother) — pure 2-pole lowpass.
- [Mama](/Indicators/Indicator-Mama) — adaptive sibling.
- [SineWave](/Indicators/Indicator-SineWave) — cycle-state companion.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
