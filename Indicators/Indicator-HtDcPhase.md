# HtDcPhase

> Hilbert Transform Dominant Cycle Phase (`HT_DCPHASE`) — the phase angle, in
> degrees, of the dominant cycle recovered by Ehlers' Hilbert-transform engine.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Ehlers / Cycle (DSP) |
| Input type | `f64` (single close) |
| Output type | `f64` (degrees) |
| Output range | a bounded phase band (roughly `−45°` to `315°`) |
| Default parameters | none (no parameters) |
| Warmup period | `50` |
| Interpretation | Where in its cycle the dominant wave currently is; advances steadily through a clean cycle, stalls in a trend. |

## Formula

`HtDcPhase` runs the adaptive Hilbert-transform engine (the same as
[`HilbertDominantCycle`](/Indicators/Indicator-HilbertDominantCycle)) to find the dominant
cycle period, then integrates the smoothed price over one dominant-cycle window
against a unit phasor to recover the instantaneous phase:

```
real = Σ sin(2π·i / dc_period) · smooth_price[i]
imag = Σ cos(2π·i / dc_period) · smooth_price[i]
phase = atan(real / imag)              // in degrees, then unwrapped
```

The phase is then offset by `+90°`, corrected for the 4-bar smoother's group
delay (`+360 / smooth_period`), and unwrapped into a bounded band. When the
imaginary part is within `±0.001` of zero (the `atan` is undefined) the phase
collapses to `±90°` by the sign of the real part — a degenerate guard pinned by
the `near_zero_imaginary_collapses_to_signed_ninety` unit test. See
`crates/wickra-core/src/indicators/ht_dcphase.rs`.

## Parameters

`HtDcPhase` takes **no parameters** — `HtDcPhase::new()` in Rust,
`wickra.HtDcPhase()` in Python, `new ta.HtDcPhase()` in Node.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/ht_dcphase.rs`:

```rust
use wickra::{Indicator, HtDcPhase};
// HtDcPhase: Input = f64, Output = f64
const _: fn(&mut HtDcPhase, f64) -> Option<f64> = <HtDcPhase as Indicator>::update;
```

Python streams as `float | None`, batches as a 1-D `numpy.ndarray` (`NaN` for
warmup). Node streams as `number | null`, batches as `Array<number>` with `NaN`
placeholders.

## Warmup

`HtDcPhase::new().warmup_period() == 50`. The engine's moving-average chain must
fill before a phase is emitted (`count < 50` returns `None`). The unit tests
`accessors_and_metadata` (pins `warmup_period() == 50`) and
`emits_after_warmup_within_phase_band` pin this.

## Edge cases

- **Phase stays in band.** After warmup the emitted phase stays within the
  unwrapped degree band. The unit test `emits_after_warmup_within_phase_band`
  pins this.
- **Near-zero imaginary part.** When the homodyne integration's imaginary part is
  within `±0.001` of zero, the phase collapses to `+90°` (non-negative real) or
  `−90°` (negative real) instead of dividing by ~zero. The unit test
  `near_zero_imaginary_collapses_to_signed_ninety` pins this.
- **Non-finite input.** `NaN` / infinity inputs are ignored; the last emitted
  value is returned. The unit test `ignores_non_finite_input` pins this.
- **Batch equals streaming.** The unit test `batch_equals_streaming` pins this.
- **Reset.** `ht.reset()` clears every tap buffer and recursive accumulator. The
  unit test `reset_clears_state` pins this.

## Examples

### Rust

```rust
use wickra::{BatchExt, HtDcPhase, Indicator};

fn main() {
    // 20-bar sinusoid: the phase should advance ~linearly through each cycle.
    let prices: Vec<f64> = (0..200)
        .map(|i| 100.0 + (f64::from(i) * 2.0 * std::f64::consts::PI / 20.0).sin() * 5.0)
        .collect();
    let mut ht = HtDcPhase::new();
    let out = ht.batch(&prices);
    println!("row 120 phase (deg): {:?}", out[120]);
}
```

### Python

```python
import numpy as np
import wickra as ta

t = np.arange(200)
prices = 100 + np.sin(t * 2 * np.pi / 20) * 5
ht = ta.HT_DCPHASE()
out = ht.batch(prices)
print('row 120 phase (deg):', out[120])
```

### Node

```javascript
const ta = require('wickra');
const ht = new ta.HT_DCPHASE();
const prices = Array.from({ length: 200 },
  (_, i) => 100 + Math.sin(i * 2 * Math.PI / 20) * 5);
console.log('row 120:', ht.batch(prices)[120]);
```

### Streaming

```rust
use wickra::{HtDcPhase, Indicator};

let mut ht = HtDcPhase::new();
let mut prev: Option<f64> = None;
let price_stream: Vec<f64> = Vec::new(); // your live price feed
for px in price_stream {
    if let Some(phase) = ht.update(px) {
        // A phase that jumps backwards by ~360° marks the start of a new cycle.
        if let Some(p) = prev {
            let new_cycle = phase < p - 180.0;
            let _ = new_cycle;
        }
        prev = Some(phase);
    }
}
```

## Interpretation

`HtDcPhase` tells you *where in the cycle* price currently sits. In a clean cyclic
market the phase advances steadily — a sawtooth that wraps once per dominant
cycle — so its slope is roughly constant. In a trend the phase stalls or drifts,
because there is no dominant cycle to rotate through; that stalling is exactly
what [`HtTrendMode`](/Indicators/Indicator-HtTrendMode) keys on. Use the phase to time
entries within a cycle (e.g. act near a phase that corresponds to a cycle trough)
or to detect cycle resets when the phase wraps.

## Common pitfalls

- **Treating the phase as price-predictive in a trend.** When the market is
  trending the dominant-cycle phase is unreliable — pair it with
  [`HtTrendMode`](/Indicators/Indicator-HtTrendMode) and only act on the phase in cycle mode.
- **Forgetting the wrap.** The phase is cyclic; a large negative jump is a normal
  cycle reset, not a discontinuity to be smoothed away.

## References

John F. Ehlers, *Rocket Science for Traders* (2001); matches TA-Lib's
`HT_DCPHASE`.

## See also

- [Indicator-HtPhasor](/Indicators/Indicator-HtPhasor) — the quadrature pair the phase is derived from.
- [Indicator-HtTrendMode](/Indicators/Indicator-HtTrendMode) — trend/cycle classification built on the phase.
- [Indicator-HilbertDominantCycle](/Indicators/Indicator-HilbertDominantCycle) — the dominant cycle period.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
