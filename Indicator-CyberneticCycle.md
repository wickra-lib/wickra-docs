# Cybernetic Cycle Component

> John Ehlers' Cybernetic Cycle Component (CCC). Detrends price via
> a 4-tap pre-smoother and an alpha-parameterised second-order
> high-pass recursion, leaving a near-zero-mean oscillator that
> tracks the dominant cycle component while filtering trend.
> Classic EasyLanguage construct from *Cybernetic Analysis for
> Stocks and Futures* (Ehlers 2004, ch. 4).

## Quick reference

| Item                | Value                                                                  |
|---------------------|------------------------------------------------------------------------|
| Family              | Ehlers / Cycle (DSP)                                                   |
| Input type          | `f64`                                                                  |
| Output type         | `f64`                                                                  |
| Output range        | unbounded; centred near zero                                           |
| Default parameters  | `period` is required (Ehlers' typical `10`)                            |
| Warmup period       | `6`                                                                    |
| Interpretation      | Cycle oscillator; zero crossings = cycle-momentum reversals             |

## Formula

Pre-smoother + second-order recursion:

```
smooth_t = (x_t + 2·x_{t-1} + 2·x_{t-2} + x_{t-3}) / 6

alpha    = 2 / (period + 1)

cycle_t  = (1 - α/2)² · (smooth_t - 2·smooth_{t-1} + smooth_{t-2})
         + 2 · (1 - α) · cycle_{t-1}
         - (1 - α)² · cycle_{t-2}
```

The first six outputs follow Ehlers' "use the input directly"
initial condition so downstream consumers stay reactive. See
`crates/wickra-core/src/indicators/cybernetic_cycle.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 0`      | Dominant cycle period (`α = 2 / (period + 1)`). |

`CyberneticCycle::new` returns `Error::PeriodZero` for `period == 0`.

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Python:
`CyberneticCycle(period).batch(prices)` returns a 1-D
`np.ndarray`. Node: same shape; `update(value)` returns `number`.

## Warmup

`warmup_period() == 6`. The first 6 outputs use the input directly;
from bar 7 the recursion runs in earnest.

## Edge cases

- **Constant input.** Smoother converges to the constant; cycle
  output decays to zero.
- **Period vs alpha.** Larger `period` → smaller alpha → slower
  cycle. `period = 10` is Ehlers' typical EasyLanguage example.
- **Pre-smoother coefficients.** The `1, 2, 2, 1` 4-tap filter is
  fixed (not configurable) — it's an Ehlers signature step.
- **Reset.** `reset()` clears all internal buffers and the bar
  counter.

## Examples

### Rust

```rust
use wickra::{BatchExt, CyberneticCycle, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prices: Vec<f64> = (0..120)
        .map(|i| 100.0 + (f64::from(i) * 0.3).sin() * 5.0)
        .collect();
    let mut cc = CyberneticCycle::new(10)?;
    println!("row 30 = {:?}", cc.batch(&prices)[30]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

prices = 100 + np.sin(np.linspace(0, 36, 120)) * 5
cc = ta.CyberneticCycle(10)
print('row 30:', cc.batch(prices)[30])
```

### Node

```javascript
const wickra = require('wickra');
const cc = new wickra.CyberneticCycle(10);
const prices = Array.from({ length: 120 },
  (_, i) => 100 + Math.sin(i * 0.3) * 5);
console.log('row 30:', cc.batch(prices)[30]);
```

### Streaming

```rust
use wickra::{CyberneticCycle, Indicator};

let mut cc = CyberneticCycle::new(10).unwrap();
let price_stream: Vec<f64> = Vec::new(); // your live price feed
for px in price_stream {
    if let Some(v) = cc.update(px) {
        // Zero crossings = cycle-momentum reversals
    }
}
```

## Interpretation

- **Cycle-band oscillator.** Captures the cycle component while
  filtering both trend (via the high-pass-like second-order
  difference) and noise (via the 4-tap pre-smoother).
- **Zero crossings.** Mark cycle-momentum reversals — bullish on
  cross up, bearish on cross down.
- **Vs RoofingFilter / DecyclerOscillator.** Cybernetic Cycle is
  more responsive (less lag) but slightly noisier. Roofing Filter
  has cleaner band-isolation; Decycler Oscillator has
  zero-phase-lag at trend frequencies.

## Common pitfalls

- **Treating output as bounded.** Output amplitude scales with
  price-cycle amplitude; thresholds are instrument-dependent.
- **Period mismatch with cycle.** If the actual dominant cycle is
  far from `period`, the response is attenuated. Pair with
  [HilbertDominantCycle](Indicator-HilbertDominantCycle) to
  adapt the period dynamically (or use
  [AdaptiveCycle](Indicator-AdaptiveCycle)).
- **Warmup transients.** The first 6 outputs aren't smoothed —
  consider them placeholder values, not signal.

## References

- John F. Ehlers, *Cybernetic Analysis for Stocks and Futures*
  (2004), ch. 4 — Cybernetic Cycle definition.

## See also

- [CenterOfGravity](Indicator-CenterOfGravity) — near-zero-lag
  sibling.
- [DecyclerOscillator](Indicator-DecyclerOscillator) —
  zero-phase-lag alternative.
- [RoofingFilter](Indicator-RoofingFilter) — band-isolation
  alternative.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
