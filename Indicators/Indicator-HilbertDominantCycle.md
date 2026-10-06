# Hilbert Dominant Cycle

> John Ehlers' Hilbert Transform–based Dominant Cycle period
> estimator. Decomposes price into in-phase and quadrature components
> via a truncated Hilbert transform, measures the bar-to-bar phase
> rotation with a homodyne discriminator, and converts it to a
> period. The raw period is clamped to the `[6, 50]` bar band Ehlers
> identifies as the meaningful tradable cycle range, then smoothed.

## Quick reference

| Item                | Value                                                                  |
|---------------------|------------------------------------------------------------------------|
| Family              | Ehlers / Cycle (DSP)                                                   |
| Input type          | `f64`                                                                  |
| Output type         | `f64` — the estimated dominant cycle period in bars                    |
| Output range        | `[6, 50]`                                                              |
| Default parameters  | none — `HilbertDominantCycle::new()` takes no arguments                |
| Warmup period       | `50` bars (chain of smoothers must fill)                               |
| Interpretation      | Adaptive period estimate for downstream cycle-aware oscillators        |

## Formula

The truncated Hilbert transform pipeline (Ehlers' canonical form,
matching TA-Lib's `HT_DCPERIOD`):

```
HT(v)_t  = (0.0962·v_t + 0.5769·v_{t−2} − 0.5769·v_{t−4} − 0.0962·v_{t−6}) · adj
adj      = 0.075 · clamp(Period_{t−1}, 6, 50) + 0.54

1. smooth    = (4·x_t + 3·x_{t−1} + 2·x_{t−2} + x_{t−3}) / 10      (WMA-4)
2. detrender = HT(smooth)
3. Q1 = HT(detrender);  I1 = detrender_{t−3}
4. jI = HT(I1);  jQ = HT(Q1)                         (advance phase 90°)
5. I2 = I1 − jQ;  Q2 = Q1 + jI
   I2 = 0.2·I2 + 0.8·I2_{t−1};  Q2 = 0.2·Q2 + 0.8·Q2_{t−1}
6. Re = I2·I2_{t−1} + Q2·Q2_{t−1}                    (homodyne discriminator)
   Im = I2·Q2_{t−1} − Q2·I2_{t−1}
   Re = 0.2·Re + 0.8·Re_{t−1};  Im = 0.2·Im + 0.8·Im_{t−1}
7. Period = 360 / atan(Im / Re)    (degrees; previous Period if Im or Re ≈ 0)
8. Period = clamp(Period, 0.67·Period_{t−1}, 1.5·Period_{t−1})
9. Period = clamp(Period, 6, 50)
10. Period = 0.2·Period + 0.8·Period_{t−1}
11. SmoothPeriod = 0.33·Period + 0.67·SmoothPeriod_{t−1}       → output
```

The homodyne discriminator multiplies the current phasor `(I2, Q2)`
by the complex conjugate of the previous one; the angle of that
product is the phase advanced in one bar, so `360° / Δphase` is the
cycle length. Step 8 limits how fast the period may change (at most
+50% / −33% per bar), step 9 enforces the `[6, 50]` band, and steps
10–11 are the 0.2 / 0.8 and 0.33 / 0.67 smoothers from TA-Lib's
`HT_DCPERIOD`. In code the angle is taken as `2π / atan2(Im, Re)`.
As in TA-Lib and Ehlers, all four detrender taps (`t`, `t−2`, `t−4`,
`t−6`) read the WMA-4 `smooth` history, not the raw input. The output
is reported from input `50` on, once the chain has filled. See
`crates/wickra-core/src/indicators/hilbert_dominant_cycle.rs`
(lines ~75–165).

**TA-Lib parity.** `HilbertDominantCycle` is identical to TA-Lib `HT_DCPERIOD`
(to `1e-9`) from bar 186 on the 3000-bar TA-Lib reference series. Before that
the two start-ups differ — TA-Lib primes its Hilbert state with zeros after a
WMA burn-in, Wickra waits for its tap buffers to fill — and the shared recursion
then converges.

## Parameters

No parameters. `HilbertDominantCycle::new()` returns a default-
constructed estimator; `Default` is also implemented.

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Python:
`HilbertDominantCycle().batch(prices)` returns an `array.array('d')`
with `NaN` in the long warmup prefix. Node: same shape; `update`
returns `number | null`.

## Warmup

`warmup_period() == 50` (`accessors_and_metadata`). The first
non-`None` emission lands on input `50` exactly; the early outputs
are still noisy until the 0.2 / 0.8 and 0.33 / 0.67 period smoothers
settle (on a clean sinusoid they lock on within a few dozen more
bars).

## Edge cases

- **Constant input.** `Re` and `Im` stay at zero, so no phase is
  measured; the period never leaves the lower clamp and reads `6`
  (after warmup the smoothers converge to exactly `6`; the very
  first outputs sit a hair below it while they fill).
- **Pure sinusoid.** The estimator locks to the sinusoid's period
  within ~2 cycles of warmup; on a 20-bar sinusoid the output
  hovers near `20`.
- **Trending input.** Phase rotates slowly; period reads near the
  upper end of `[6, 50]`.
- **Output clamp.** Raw periods outside `[6, 50]` are clamped
  (`output_within_clamp_band`) — Ehlers'
  rationale is that periods outside this band are not tradable
  cycles (too noisy below 6, indistinguishable from trend above
  50).
- **Non-finite input.** `NaN` / `±inf` returns `None` without
  touching state (`ignores_non_finite_input`).
- **Reset.** `reset()` clears all internal buffers and the last
  value (`reset_clears_state`).

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
print('row 200 period estimate:', out[200])  # ≈ 20.013
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
- **Long warmup expectations.** 50 bars before usable, ~100 bars
  before stable. Backtests under 200 bars get only transient
  output.
- **Clamp masking.** Many cycle-detection failures end up at a
  clamp: flat input pins the output at `6`, strong trends push it
  toward `50`. If your output sits at either edge, the price
  probably isn't periodic — don't read the clamp value as a
  meaningful cycle.

## References

- John F. Ehlers, *Rocket Science for Traders* (2001), ch. 7 —
  the truncated Hilbert transform construction and the homodyne
  discriminator period measurement used here.
- TA-Lib, `HT_DCPERIOD` — the 0.2 / 0.8 and 0.33 / 0.67 period
  smoothing chain this implementation follows.

## See also

- [AdaptiveCycle](/Indicators/Indicator-AdaptiveCycle) — half-period wrapper for
  adaptive oscillators.
- [Mama](/Indicators/Indicator-Mama) — uses the same phase machinery for
  adaptive smoothing.
- [SineWave](/Indicators/Indicator-SineWave) — sine + leadsine from the same
  phase estimate.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
