# HtPhasor

> Hilbert Transform Phasor (`HT_PHASOR`) — the in-phase (`I1`) and quadrature
> (`Q1`) components of the analytic signal from Ehlers' Hilbert-transform engine.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Ehlers / Cycle (DSP) |
| Input type | `f64` (single close) |
| Output type | `HtPhasorOutput { inphase, quadrature }` |
| Output range | unbounded; the two components are 90° out of phase |
| Default parameters | none (no parameters) |
| Warmup period | `19` |
| Interpretation | The raw quadrature pair whose ratio tracks the instantaneous phase of the dominant cycle. |

## Formula

`HtPhasor` runs the same adaptive Hilbert-transform engine as
[`HilbertDominantCycle`](/Indicators/Indicator-HilbertDominantCycle) — a 4-bar weighted
smoother, a Hilbert-transform detrender, and the in-phase/quadrature mixing that
produces the analytic signal `I1 + jQ1`. Instead of collapsing that signal into a
cycle period, it reports the raw components:

```
inphase    = I1   (real part of the analytic signal)
quadrature = Q1   (imaginary part, 90° out of phase)
```

Because `I1` and `Q1` are a quarter-cycle apart, `atan2(Q1, I1)` is the
instantaneous phase and `√(I1² + Q1²)` the amplitude. From *Rocket Science for
Traders* (Ehlers 2001), aligned with TA-Lib's `HT_PHASOR`. See
`crates/wickra-core/src/indicators/ht_phasor.rs`.

## Parameters

`HtPhasor` takes **no parameters** — `HtPhasor::new()` in Rust,
`wickra.HtPhasor()` in Python, `new ta.HtPhasor()` in Node. The transform's
coefficients are fixed.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/ht_phasor.rs`:

```rust
use wickra::{Indicator, HtPhasor};
use wickra::HtPhasorOutput;
// HtPhasor: Input = f64, Output = HtPhasorOutput
const _: fn(&mut HtPhasor, f64) -> Option<HtPhasorOutput> = <HtPhasor as Indicator>::update;
```

In Python `update` returns an `(inphase, quadrature)` tuple (or `None` during
warmup) and `batch` returns an `(n, 2)` `Matrix`. In Node `update` returns
a `{ inphase, quadrature }` object (camelCase keys) and `batch` a flat
`Array<number>` of length `n · 2`.

## Warmup

`HtPhasor::new().warmup_period() == 19`. The first value is emitted once the
transform's tap buffers fill — at or before index `19`. The unit tests
`accessors_and_metadata` (pins `warmup_period() == 19`) and
`emits_after_warmup_and_stays_finite` (pins `out[0] == None` and the first value
at an index `<= 19`) pin this.

## Edge cases

- **Components stay finite.** After warmup both `inphase` and `quadrature` are
  always finite for finite input. The unit test
  `emits_after_warmup_and_stays_finite` pins this.
- **Non-finite input.** `NaN` / infinity inputs are ignored and return `None`
  without advancing the engine. The unit test `ignores_non_finite_input` pins
  this.
- **Batch equals streaming.** `batch(xs)` is identical to feeding `xs` one at a
  time through `update`. The unit test `batch_equals_streaming` pins this.
- **Reset.** `ht.reset()` clears every tap buffer and the recursive state. The
  unit test `reset_clears_state` pins this.

## Examples

### Rust

```rust
use wickra::{BatchExt, HtPhasor, Indicator};

fn main() {
    // 20-bar sinusoid.
    let prices: Vec<f64> = (0..120)
        .map(|i| 100.0 + (f64::from(i) * 2.0 * std::f64::consts::PI / 20.0).sin() * 5.0)
        .collect();
    let mut ht = HtPhasor::new();
    let out = ht.batch(&prices);
    // After warmup each row is a finite (inphase, quadrature) pair ~90° apart.
    println!("row 60: {:?}", out[60]);
}
```

### Python

```python
import numpy as np
import wickra as ta

t = np.arange(120)
prices = 100 + np.sin(t * 2 * np.pi / 20) * 5
ht = ta.HT_PHASOR()
out = ht.batch(prices)          # (120, 2): columns inphase, quadrature
print('row 60 (inphase, quadrature):', out[60])
```

### Node

```javascript
const ta = require('wickra');
const ht = new ta.HT_PHASOR();
const prices = Array.from({ length: 120 },
  (_, i) => 100 + Math.sin(i * 2 * Math.PI / 20) * 5);
let last = null;
for (const p of prices) last = ht.update(p);
console.log(last);   // { inphase, quadrature }
```

### Streaming

```rust
use wickra::{HtPhasor, Indicator};

let mut ht = HtPhasor::new();
let price_stream: Vec<f64> = Vec::new(); // your live price feed
for px in price_stream {
    if let Some(p) = ht.update(px) {
        // Instantaneous phase and amplitude from the quadrature pair:
        let phase = p.quadrature.atan2(p.inphase).to_degrees();
        let amplitude = (p.inphase * p.inphase + p.quadrature * p.quadrature).sqrt();
        let _ = (phase, amplitude);
    }
}
```

## Interpretation

`HtPhasor` is the low-level building block of the Hilbert-transform family.
Rarely traded directly, it exposes the analytic signal so you can derive whatever
you need: `atan2(quadrature, inphase)` gives the instantaneous phase (the basis
of [`HtDcPhase`](/Indicators/Indicator-HtDcPhase) and [`HtTrendMode`](/Indicators/Indicator-HtTrendMode)),
its rate of change gives the dominant cycle period
([`HilbertDominantCycle`](/Indicators/Indicator-HilbertDominantCycle)), and the magnitude
gives the cycle amplitude. Reach for it when you want to build a custom
cycle-phase study rather than consume a pre-packaged one.

## Common pitfalls

- **Reading a single component in isolation.** `inphase` and `quadrature` are
  only meaningful as a pair; the information is in their ratio (phase) and
  magnitude (amplitude), not in either component alone.
- **Expecting calibrated units.** The components are in the transform's internal
  scale, not price units; normalise via the amplitude if you need a comparable
  magnitude.

## References

John F. Ehlers, *Rocket Science for Traders* (2001); matches TA-Lib's
`HT_PHASOR`.

## See also

- [Indicator-HtDcPhase](/Indicators/Indicator-HtDcPhase) — the dominant-cycle phase derived from this pair.
- [Indicator-HtTrendMode](/Indicators/Indicator-HtTrendMode) — trend/cycle classification.
- [Indicator-HilbertDominantCycle](/Indicators/Indicator-HilbertDominantCycle) — the cycle period.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
