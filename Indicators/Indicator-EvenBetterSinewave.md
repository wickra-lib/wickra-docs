# EvenBetterSinewave

> Ehlers' EBSW — a self-normalising cycle oscillator that swings cleanly in
> `[−1, +1]` regardless of price amplitude.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Ehlers / Cycle (DSP) |
| Input type | `f64` |
| Output type | `f64` |
| Output range | `[−1, +1]` |
| Default parameters | `(hp_period = 40, ssf_length = 10)` |
| Warmup period | `3` |
| Interpretation | Cross up `~−0.9`/`0` = buy; cross down `~+0.9`/`0` = sell. |

## Formula

```
alpha1 = (1 − sin(2π/hp_period)) / cos(2π/hp_period)
HP_t   = 0.5·(1 + alpha1)·(price_t − price_{t−1}) + alpha1·HP_{t−1}   (one-pole highpass)
Filt   = SuperSmoother(HP, ssf_length)
Wave   = (Filt_t + Filt_{t−1} + Filt_{t−2}) / 3
Pwr    = (Filt_t² + Filt_{t−1}² + Filt_{t−2}²) / 3
EBSW   = Wave / sqrt(Pwr)
```

Price is highpass-filtered (trend removed), SuperSmoothed (noise removed), then a
3-bar average of the result is divided by its RMS power to normalise the
amplitude. The output behaves like a clean sine wave in `[−1, +1]` on any
instrument — far more stable than the Hilbert-transform
[`SineWave`](/Indicators/Indicator-SineWave) in trends. Source:
`crates/wickra-core/src/indicators/even_better_sinewave.rs`.

## Parameters

| Name         | Type    | Default | Valid range | Source | Description |
|--------------|---------|---------|-------------|--------|-------------|
| `hp_period`  | `usize` | `40`    | `>= 1`      | `even_better_sinewave.rs:69` | One-pole highpass cutoff (removes trend). |
| `ssf_length` | `usize` | `10`    | `>= 1`      | `even_better_sinewave.rs:69` | SuperSmoother length (removes noise). `0` for either errors with `Error::PeriodZero`. |

`params()` returns `(hp_period, ssf_length)`; `value` returns the current output
if ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/even_better_sinewave.rs`:

```rust
use wickra::{Indicator, EvenBetterSinewave};
// EvenBetterSinewave: Input = f64, Output = f64
const _: fn(&mut EvenBetterSinewave, f64) -> Option<f64> =
    <EvenBetterSinewave as Indicator>::update;
```

An `f64` in, an `Option<f64>` out. The Python binding takes a scalar for `update`
and a 1-D numpy array for `batch` (NaN warmup); Node takes `update(value)` and
`batch(values[])`.

## Warmup

`warmup_period() == 3`. Three SuperSmoothed samples are needed for the Wave/Power
window (`first_emission_at_warmup_period` pins this).

## Edge cases

- **Bounded.** The reading is clamped to `[−1, +1]` (`output_in_range` pins this).
- **Cyclic input → both signs.** A sine input swings the oscillator across zero
  (`cyclic_input_swings_both_signs` pins this).
- **Zero power → 0.** A degenerate window with zero power returns `0` (guarded in
  the source).
- **Non-finite input.** A NaN/∞ input is ignored and the last value returned
  (`ignores_non_finite` pins this).
- **Reset.** `e.reset()` clears the highpass, the SuperSmoother, the filter buffer
  and the last value (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, EvenBetterSinewave};
use std::f64::consts::TAU;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut e = EvenBetterSinewave::new(40, 10)?;
    let xs: Vec<f64> = (0..200).map(|i| 100.0 + (TAU * f64::from(i) / 30.0).sin() * 5.0).collect();
    println!("last = {:?}", e.batch(&xs).last().unwrap());
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

e = ta.EvenBetterSinewave(40, 10)
x = 100 + np.sin(2 * np.pi * np.arange(200) / 30) * 5
print(e.batch(x)[-5:])  # in [-1, 1]
```

### Node

```javascript
const ta = require('wickra');

const e = new ta.EvenBetterSinewave(40, 10);
console.log('warmupPeriod:', e.warmupPeriod()); // 3
```

### Streaming

```rust
use wickra::{Indicator, EvenBetterSinewave};

let mut e = EvenBetterSinewave::new(40, 10).unwrap();
let mut last = None;
for i in 0..120 {
    last = e.update(100.0 + (f64::from(i) * 0.3).sin() * 5.0);
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Turning points.** The oscillator peaks near `+1` at cycle tops and `−1` at
   bottoms; act on the turn back through the extreme.
2. **Zero-line.** Crossing zero confirms a shift in the cycle's direction.
3. **Stable in trends.** Because of the normalisation it does not run to the rail
   and stick the way raw sine-wave indicators do.

## Common pitfalls

- **Cycle, not trend.** EBSW measures the de-trended cycle; pair it with a trend
  filter for directional bias.
- **Two lengths to tune.** `hp_period` sets what counts as trend; `ssf_length` sets
  smoothing — adjust both to your timeframe.
- **Not the Hilbert sinewave.** Different construction from
  [`SineWave`](/Indicators/Indicator-SineWave); readings will not match.

## References

Ehlers, J. F. (2013), *Cycle Analytics for Traders*, Wiley, ch. 12 ("The Even
Better Sinewave Indicator").

## See also

- [Indicator-SineWave](/Indicators/Indicator-SineWave) — the Hilbert-transform sinewave.
- [Indicator-BandpassFilter](/Indicators/Indicator-BandpassFilter) — single-band cycle isolator.
- [Indicator-Reflex](/Indicators/Indicator-Reflex) — zero-lag cycle oscillator.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
