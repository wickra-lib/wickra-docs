# Sine Wave

> John Ehlers' Hilbert-transform-based phase visualiser. Uses the
> same Hilbert-transform machinery as
> [HilbertDominantCycle](/Indicators/Indicator-HilbertDominantCycle) to derive
> the instantaneous phase, then returns `sin(phase)` and the 45°
> lead `sin(phase + 45°)`. The two lines cross deep in trends but
> oscillate rapidly during cycles, providing a visual lead/lag
> signal.

## Quick reference

| Item                | Value                                                                  |
|---------------------|------------------------------------------------------------------------|
| Family              | Ehlers / Cycle (DSP)                                                   |
| Input type          | `f64`                                                                  |
| Output type         | `f64` — the primary `sin(phase)` line                                 |
| Output range        | `[-1, +1]`                                                             |
| Default parameters  | none — `SineWave::new()`                                               |
| Warmup period       | ~50 bars (Hilbert chain stabilisation)                                 |
| Interpretation      | `sin(phase)` for chart panel; pair with `lead` for cross signal       |

## Formula

```
phase_t  = atan2(im, re)               (from HilbertDominantCycle internals)
sine_t   = sin(phase_t)
lead_t   = sin(phase_t + π/4)           (45° lead)
```

Only the primary `sine` is exposed via `update`; the 45° lead is
available via the `lead()` accessor after each update. See
`crates/wickra-core/src/indicators/sine_wave.rs`.

## Parameters

No parameters. `SineWave::new()` returns a default-constructed
indicator; `Default` is also implemented.

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>` — returns the
`sin(phase)` value:

```rust
use wickra::{Indicator, SineWave};

let mut sw = SineWave::new();
let px = 100.0;
let sine = sw.update(px); // Option<f64>
```

Python: `SineWave().batch(prices)` returns a 1-D `np.ndarray` of the
sine line. Node and WASM return the same single sine line.

## Warmup

~50 bars before stable output (inherits the Hilbert chain warmup).
Early outputs are noisy until the phase estimator settles.

## Edge cases

- **Trending input.** Phase rotates slowly; `sine` and `lead`
  closely match each other.
- **Cyclical input.** Phase rotates rapidly; `sine` and `lead` cross
  frequently, providing the canonical Ehlers cycle-state visual.
- **Lead accessor before warmup.** `lead()` returns `0.0` until the
  indicator has emitted at least one value — it is *not* `None` /
  `null`, just zero.
- **Reset.** `reset()` clears the inner cycle estimator, the
  smoothing buffers, the phase memory, and the lead value.

## Examples

### Rust

```rust
use wickra::{Indicator, SineWave};

fn main() {
    let prices: Vec<f64> = (0..200)
        .map(|i| 100.0 + (f64::from(i) * 0.4).sin() * 5.0)
        .collect();
    let mut sw = SineWave::new();
    for &p in &prices {
        if let Some(s) = sw.update(p) {
            let l = sw.lead();
            // s, l in [-1, +1]; cross detects momentum shift in cycle regime
        }
    }
}
```

### Python

```python
import numpy as np
import wickra as ta

t = np.arange(200)
prices = 100 + np.sin(t * 0.4) * 5
sw = ta.SineWave()
out = sw.batch(prices)
print('row 100:', out[100])
```

### Node

```javascript
const wickra = require('wickra');
const sw = new wickra.SineWave();
const prices = Array.from({ length: 200 }, (_, i) => 100 + Math.sin(i * 0.4) * 5);
console.log('row 100:', sw.batch(prices)[100]);
```

### Streaming with lead access

```rust
use wickra::{Indicator, SineWave};

let mut sw = SineWave::new();
let mut prev_diff: Option<f64> = None;
let price_stream: Vec<f64> = Vec::new(); // your live price feed
for px in price_stream {
    if let Some(s) = sw.update(px) {
        let l = sw.lead();
        let diff = l - s;
        if let Some(p) = prev_diff {
            if p < 0.0 && diff > 0.0 { /* lead crossed above sine — bullish */ }
            if p > 0.0 && diff < 0.0 { /* lead crossed below sine — bearish */ }
        }
        prev_diff = Some(diff);
    }
}
```

## Interpretation

- **Cycle vs trend regime.** When `sine` and `lead` track close to
  each other, the market is trending; when they oscillate independently
  and cross frequently, the market is in a cycle.
- **Cross direction.** `lead` crossing above `sine` is a bullish
  cycle-momentum signal (the cycle is bottoming); `lead` below
  `sine` is bearish.
- **Saturation.** When both lines saturate near ±1 for an extended
  period, the market is in a strong trend and cycle-based signals
  shouldn't be used.

## Common pitfalls

- **Trading the primary sine alone.** The point of the indicator is
  the `sine`/`lead` *pair*. Reading the bindings, only `sine` is
  emitted from `batch` — for cross signals you must use streaming
  `update` + `lead()` in Rust, not the binding APIs.
- **Treating it like an oscillator.** This is a *phase-state
  visualiser*, not an overbought/oversold tool. ±0.8 is not
  "extreme" — it's just where the phase is right now.
- **Warmup expectations.** Early outputs are noisy. Wait at least
  50 bars before treating signals as actionable.

## References

- John F. Ehlers, *Rocket Science for Traders* (2001), ch. 9 —
  original Sine Wave indicator.
- John F. Ehlers, *Cybernetic Analysis for Stocks and Futures*
  (2004) — refinements and practical usage.

## See also

- [HilbertDominantCycle](/Indicators/Indicator-HilbertDominantCycle) — phase
  source.
- [Mama](/Indicators/Indicator-Mama) — uses the same phase for adaptive
  smoothing.
- [FisherTransform](/Indicators/Indicator-FisherTransform) — different
  visualisation of cycle state.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
