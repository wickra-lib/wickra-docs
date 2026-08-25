# Hilbert Dominant Cycle

> John Ehlers' Hilbert Transform–based Dominant Cycle period
> estimator. Decomposes price into in-phase and quadrature components
> via a truncated Hilbert transform, derives the instantaneous phase,
> and recovers the dominant cycle period from the phase rate of
> change. The result is clamped to the `[6, 50]` bar band Ehlers
> identifies as the meaningful tradable cycle range.

## Quick reference

| Item                | Value                                                                  |
|---------------------|------------------------------------------------------------------------|
| Family              | Ehlers / Cycle (DSP)                                                   |
| Input type          | `f64`                                                                  |
| Output type         | `f64` — the estimated dominant cycle period in bars                    |
| Output range        | `[6, 50]`                                                              |
| Default parameters  | none — `HilbertDominantCycle::new()` takes no arguments                |
| Warmup period       | ~50 bars (chain of smoothers must fill)                                |
| Interpretation      | Adaptive period estimate for downstream cycle-aware oscillators        |

## Formula

The truncated Hilbert transform pipeline (Ehlers' canonical form,
matching TA-Lib's `HT_DCPERIOD`):

```
1. smooth   = WMA-4 of input
2. detrender = HT operator applied to smooth      (in-phase)
3. q1, i1   = HT-derived quadrature / in-phase
4. j_i, j_q = phase rotations
5. i2 = i1 - j_q;  q2 = q1 + j_i
6. re, im = smoothed in-phase/quadrature products
7. phase  = atan(im / re)
8. dp     = phase_{t-1} - phase_t   (clamped >= 1, <= 60)
9. period = median-smoothed dp
10. period = clamp(period, 6, 50)
```

The smoothers and detrenders need ~6 bars of history each, so the
chain takes ~50 inputs to stabilise. See
`crates/wickra-core/src/indicators/hilbert_dominant_cycle.rs`.

## Parameters

No parameters. `HilbertDominantCycle::new()` returns a default-
constructed estimator; `Default` is also implemented.

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Python:
`HilbertDominantCycle().batch(prices)` returns an `array.array('d')`
with `NaN` in the long warmup prefix. Node: same shape; `update`
returns `number | null`.

## Warmup

Conservative `warmup_period()` ~50 bars. The first non-`None`
emission typically lands earlier, but the early outputs are noisy
until the median smoothing settles.

## Edge cases

- **Constant input.** Phase is undefined; `dp` clamps to its lower
  bound and the period reads at the upper clamp (`50`).
- **Pure sinusoid.** The estimator locks to the sinusoid's period
  within ~2 cycles of warmup; on a 20-bar sinusoid the output
  hovers near `20`.
- **Trending input.** Phase rotates slowly; period reads near the
  upper end of `[6, 50]`.
- **Output clamp.** Values outside `[6, 50]` are clamped — Ehlers'
  rationale is that periods outside this band are not tradable
  cycles (too noisy below 6, indistinguishable from trend above
  50).
- **Reset.** `reset()` clears all internal buffers and the last
  value.

## Examples

### Rust

```rust
use wickra::{BatchExt, HilbertDominantCycle, Indicator};

fn main() {
    let prices: Vec<f64> = (0..300)
        .map(|i| 100.0 + (f64::from(i) * 2.0 * std::f64::consts::PI / 20.0).sin() * 5.0)
        .collect();
    let mut ht = HilbertDominantCycle::new();
    let out = ht.batch(&prices);
    println!("row 200 (expected ~20): {:?}", out[200]);
}
```

### Python

```python
import numpy as np
import wickra as ta

# 20-bar sinusoid
t = np.arange(300)
prices = 100 + np.sin(t * 2 * np.pi / 20) * 5
ht = ta.HilbertDominantCycle()
out = ht.batch(prices)
print('row 200 period estimate:', out[200])  # expected ~20
```

### Node

```javascript
const wickra = require('wickra');

const ht = new wickra.HilbertDominantCycle();
const prices = Array.from({ length: 300 },
  (_, i) => 100 + Math.sin(i * 2 * Math.PI / 20) * 5);
console.log('row 200:', ht.batch(prices)[200]);
```

### Streaming

```rust
use wickra::{HilbertDominantCycle, Indicator, Rsi};

let mut ht = HilbertDominantCycle::new();
let mut period_history: Vec<f64> = Vec::new();
let price_stream: Vec<f64> = Vec::new(); // your live price feed
for px in price_stream {
    if let Some(p) = ht.update(px) {
        period_history.push(p);
        // Feed half-period into an adaptive oscillator
        let adapt = (p * 0.5).round() as usize;
        // ... e.g. recreate Rsi::new(adapt.max(3))
    }
}
```

## Interpretation

- **Adaptive period estimator.** The standard use is to feed half
  the dominant period into a period-adaptive oscillator
  (RSI, Stoch, CCI). See [AdaptiveCycle](/Indicators/Indicator-AdaptiveCycle)
  for a wrapper that does exactly this.
- **Regime indicator.** A period reading at the `50` clamp signals a
  trending or aperiodic market; a stable period in the `15-30`
  range indicates a cyclical regime where mean-reversion strategies
  work.
- **Reference for backtesting.** Pinning the period at, say, `20`
  in a backtest then comparing to the live HilbertDominantCycle
  reading shows whether the parameter was actually well-tuned for
  the market state.

## Common pitfalls

- **Treating it as a price indicator.** The output is *period*,
  not price. Don't plot it on a price chart's main panel.
- **Long warmup expectations.** ~50 bars before usable, ~100 bars
  before stable. Backtests under 200 bars get only transient
  output.
- **Clamp masking.** Many cycle-detection failures end up at the
  `50` clamp. If your output is always `50`, the price probably
  isn't periodic — don't read the clamp value as a meaningful
  cycle.

## References

- John F. Ehlers, *Rocket Science for Traders* (2001), ch. 7 —
  the truncated Hilbert transform construction.
- John F. Ehlers, *Cybernetic Analysis for Stocks and Futures*
  (2004) — refined median-smoothing approach used here.

## See also

- [AdaptiveCycle](/Indicators/Indicator-AdaptiveCycle) — half-period wrapper for
  adaptive oscillators.
- [Mama](/Indicators/Indicator-Mama) — uses the same phase machinery for
  adaptive smoothing.
- [SineWave](/Indicators/Indicator-SineWave) — sine + leadsine from the same
  phase estimate.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
