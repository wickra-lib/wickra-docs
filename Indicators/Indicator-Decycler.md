# Decycler

> John Ehlers' trend extractor — `decycler = input - HighPass(input)`.
> Subtracts a 2-pole high-pass filter from the raw price, leaving
> the slow component: equivalent to a smoothed trend line with no
> group delay at low frequencies. The natural complement to
> [SuperSmoother](/Indicators/Indicator-SuperSmoother) for cycle/trend
> decomposition.

## Quick reference

| Item                | Value                                                                  |
|---------------------|------------------------------------------------------------------------|
| Family              | Ehlers / Cycle (DSP)                                                   |
| Input type          | `f64`                                                                  |
| Output type         | `f64`                                                                  |
| Output range        | unbounded (price-units)                                                |
| Default parameters  | `period` is required (typical `20`)                                    |
| Warmup period       | `2` (uses input directly until recursion fills)                        |
| Interpretation      | Trend line; no group delay at low frequencies                          |

## Formula

```
alpha = (cos(.707·2π/period) + sin(.707·2π/period) - 1) / cos(.707·2π/period)

HP_t = (1 - α/2)² · (x_t - 2·x_{t-1} + x_{t-2})
     + 2·(1 - α) · HP_{t-1}
     - (1 - α)² · HP_{t-2}

decycler_t = x_t - HP_t
```

The first two outputs simply equal the input (warmup buffering),
the conventional Ehlers initialisation. See
`crates/wickra-core/src/indicators/decycler.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 1`      | Critical period of the inner high-pass filter. |

`Decycler::new` returns `Error::PeriodZero` for `period == 0` and
`Error::InvalidPeriod` for `period == 1`.

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Python:
`Decycler(period).batch(prices)` returns a 1-D `np.ndarray` (the
first 2 bars pass through input unchanged). Node: same shape;
`update(value)` returns `number`.

## Warmup

`warmup_period() == 2`. The first two inputs pass through unchanged;
from input 3 onward the proper high-pass recursion runs. By input
~`2 · period` the initial transient has decayed.

## Edge cases

- **Constant input.** High-pass output decays to zero; decycler
  converges to the input.
- **Step input.** Critically damped — no overshoot. Roughly
  `period` bars to converge after a step.
- **Pure cyclical input at exactly `period`.** Filtered out almost
  entirely; decycler tracks the long-term level only.
- **Reset.** `reset()` clears the recursion state.

## Examples

### Rust

```rust
use wickra::{BatchExt, Decycler, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prices: Vec<f64> = (0..100)
        .map(|i| {
            let trend = 100.0 + f64::from(i) * 0.5;
            let cycle = (f64::from(i) * 0.6).sin() * 5.0;
            trend + cycle
        })
        .collect();
    let mut dc = Decycler::new(20)?;
    let out = dc.batch(&prices);
    println!("row 50 decycler={:?}  raw={}", out[50], prices[50]);
    // decycler ≈ trend component only
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

t = np.arange(100)
trend = 100 + t * 0.5
cycle = np.sin(t * 0.6) * 5
prices = trend + cycle
dc = ta.Decycler(20)
out = dc.batch(prices)
print('row 50:', out[50], 'vs trend:', trend[50])
```

### Node

```javascript
const wickra = require('wickra');
const dc = new wickra.Decycler(20);
const prices = Array.from({ length: 100 },
  (_, i) => 100 + i * 0.5 + Math.sin(i * 0.6) * 5);
console.log('row 50:', dc.batch(prices)[50]);
```

### Streaming

```rust
use wickra::{Decycler, Indicator};

let mut dc = Decycler::new(20).unwrap();
let price_stream: Vec<f64> = Vec::new(); // your live price feed
for px in price_stream {
    let trend = dc.update(px).unwrap();
    // Use `trend` as the de-cycled price reference for slow-moving systems
}
```

## Interpretation

- **Trend line.** Use Decycler as a low-lag trend reference — it
  matches an SMA at roughly the same period but with much less
  group delay at low frequencies.
- **Vs SuperSmoother.** They are duals: SuperSmoother is a lowpass
  (passes long cycles), Decycler is `input − highpass` (also
  passes long cycles, but with different phase response).
  SuperSmoother has tighter cutoff; Decycler has zero phase lag at
  DC.
- **Pair with DecyclerOscillator.** Subtracting a fast Decycler
  from a slow one gives the
  [DecyclerOscillator](/Indicators/Indicator-DecyclerOscillator), an MACD-like
  cycle-band indicator.

## Common pitfalls

- **Treating `period` as SMA period.** The Decycler's critical
  period defines the *boundary* between trend and cycle, not the
  length of any averaging window. `Decycler(20)` is faster than
  `SMA(20)` in the trend regime.
- **Expecting bounded output.** Decycler tracks price scale; it's
  not an oscillator.
- **Warmup misconception.** The pass-through-input initial
  condition means the first 2 outputs equal the inputs — they look
  "correct" but carry no smoothing yet.

## References

- John F. Ehlers, *Cycle Analytics for Traders*, Wiley (2013),
  ch. 4 — derives the Decycler from the high-pass complement.

## See also

- [DecyclerOscillator](/Indicators/Indicator-DecyclerOscillator) — MACD-like
  oscillator built on the Decycler difference.
- [SuperSmoother](/Indicators/Indicator-SuperSmoother) — lowpass alternative.
- [RoofingFilter](/Indicators/Indicator-RoofingFilter) — bandpass dual.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
