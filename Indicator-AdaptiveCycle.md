# Adaptive Cycle

> Returns half the current dominant cycle period — the "best"
> lookback for downstream oscillators like an adaptive RSI or
> adaptive Stochastic. Halving accounts for the fact that an
> oscillator over a half-cycle captures the full peak-to-trough
> swing without aliasing. Wrapper over
> [HilbertDominantCycle](Indicator-HilbertDominantCycle).

## Quick reference

| Item                | Value                                                                  |
|---------------------|------------------------------------------------------------------------|
| Family              | Ehlers / Cycle (DSP)                                                   |
| Input type          | `f64`                                                                  |
| Output type         | `f64` (integer-valued, half the Hilbert cycle period)                  |
| Output range        | `[3, 25]`                                                              |
| Default parameters  | none — `AdaptiveCycle::new()`                                          |
| Warmup period       | ~50 bars (inherited from HilbertDominantCycle)                         |
| Interpretation      | Use as `period` argument for adaptive oscillators                      |

## Formula

```
hilbert_period_t = HilbertDominantCycle.update(x_t)
adaptive_t       = round(hilbert_period_t * 0.5).clamp(3, 25)
```

The clamp `[3, 25]` matches the typical operating range of
period-adaptive oscillators — narrower at the bottom than
`HilbertDominantCycle`'s `[6, 50]` clamp because halving compresses
the range. See `crates/wickra-core/src/indicators/adaptive_cycle.rs`.

## Parameters

No parameters. `AdaptiveCycle::new()` returns a default-constructed
estimator; `Default` is also implemented.

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Output is integer-valued
`f64` (e.g. `7.0`, `12.0`). Python: `AdaptiveCycle().batch(prices)`
returns a 1-D `np.ndarray`. Node: same shape; `update(value)`
returns `number | null`.

## Warmup

Same as [HilbertDominantCycle](Indicator-HilbertDominantCycle):
~50 bars before usable output, ~100 bars before stable. The wrapper
adds no additional state beyond the round/clamp.

## Edge cases

- **Output is integer-valued.** Always a whole number; downstream
  code can `.round() as usize` safely.
- **Lower clamp at `3`.** Hilbert reads of `[6, 50]` become
  `[3, 25]` after halving and clamping.
- **Constant input.** Hilbert reads max period → output reads `25`
  (the upper clamp).
- **Reset.** `reset()` clears the inner Hilbert estimator and the
  last value.

## Examples

### Rust

```rust
use wickra::{AdaptiveCycle, BatchExt, Indicator};

fn main() {
    let prices: Vec<f64> = (0..300)
        .map(|i| 100.0 + (f64::from(i) * 0.4).sin() * 5.0)
        .collect();
    let mut ac = AdaptiveCycle::new();
    println!("row 200 adaptive period = {:?}", ac.batch(&prices)[200]);
}
```

### Python

```python
import numpy as np
import wickra as ta

prices = 100 + np.sin(np.linspace(0, 120, 300)) * 5
ac = ta.AdaptiveCycle()
print('row 200:', ac.batch(prices)[200])
```

### Node

```javascript
const wickra = require('wickra');
const ac = new wickra.AdaptiveCycle();
const prices = Array.from({ length: 300 },
  (_, i) => 100 + Math.sin(i * 0.4) * 5);
console.log('row 200:', ac.batch(prices)[200]);
```

### Streaming — feed into adaptive RSI

```rust
use wickra::{AdaptiveCycle, Indicator, Rsi};

let mut ac = AdaptiveCycle::new();
let mut rsi_cache: Option<(usize, Rsi)> = None;

let price_stream: Vec<f64> = Vec::new(); // your live price feed
for px in price_stream {
    if let Some(period) = ac.update(px) {
        let p = period as usize;
        // Re-instantiate Rsi when the adaptive period changes
        if rsi_cache.as_ref().map(|(prev, _)| *prev) != Some(p) {
            rsi_cache = Some((p, Rsi::new(p).unwrap()));
        }
        if let Some((_, rsi)) = rsi_cache.as_mut() {
            let _r = rsi.update(px);
        }
    }
}
```

## Interpretation

- **Adaptive oscillator period.** The output is *what `period`
  should be* for a cycle-aware oscillator that's tracking the
  current market regime. Feed it into RSI, Stochastic, CCI, or
  similar.
- **Regime indicator.** Output stable in the `7-12` band suggests
  a clean intermediate-cycle market. Output pinned at `3` or `25`
  suggests no clear cycle.
- **Pairs with InverseFisherTransform.** A bounded oscillator
  built on an adaptive-period RSI, with IFT squashing applied,
  produces a consistently scaled signal across regimes — see
  Ehlers' cookbook in *Cycle Analytics for Traders*.

## Common pitfalls

- **Reusing the same oscillator instance.** When the adaptive
  period changes, an existing oscillator with a fixed `period`
  internal buffer can't simply adapt — you must reset or
  re-instantiate. This is the trickiest part of building
  adaptive-oscillator systems.
- **Treating output as price.** It's a *period in bars*, not a
  price. Don't plot it on the same chart panel as price.
- **Warmup masking.** During the ~50-bar warmup, the inner Hilbert
  output is unstable; downstream adaptive systems should also wait
  through this period.

## References

- John F. Ehlers, *Cycle Analytics for Traders*, Wiley (2013),
  ch. 11 — Adaptive Cycle and its use as a period feed.

## See also

- [HilbertDominantCycle](Indicator-HilbertDominantCycle) — the
  underlying period estimator.
- [Mama](Indicator-Mama) — built on the same phase machinery.
- [SineWave](Indicator-SineWave) — visualises the phase that
  AdaptiveCycle measures.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
