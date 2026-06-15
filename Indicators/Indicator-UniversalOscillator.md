# UniversalOscillator

> Ehlers' Universal Oscillator — whitens the price, SuperSmooths it, then
> AGC-normalises to a clean `[−1, +1]` cycle reading on any instrument.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Ehlers / Cycle (DSP) |
| Input type | `f64` |
| Output type | `f64` |
| Output range | `[−1, +1]` |
| Default parameters | `(period = 20)` (Python) |
| Warmup period | `3` |
| Interpretation | Rails = cycle extremes; zero-cross = cycle direction change. |

## Formula

```
WhiteNoise = (price_t − price_{t−2}) / 2
Filt       = SuperSmoother(WhiteNoise, period)
Peak       = max(|Filt|, 0.991 · Peak_{t−1})
Universal  = Filt / Peak        (0 if Peak == 0)
```

Whitening (the two-bar difference) flattens the input's power spectrum so the
SuperSmoother treats all cycles even-handedly rather than being dominated by the
trend. The automatic gain control divides by a slowly-decaying running peak, so
the amplitude is normalised to `[−1, +1]` regardless of volatility — hence
"universal". Source:
`crates/wickra-core/src/indicators/universal_oscillator.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `20` (Python) | `>= 1`      | `universal_oscillator.rs:55` | SuperSmoother length applied to the whitened series. `0` errors with `Error::PeriodZero`. |

The `period` getter returns the smoother length; `value` returns the current
output if ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/universal_oscillator.rs`:

```rust
use wickra::{Indicator, UniversalOscillator};
// UniversalOscillator: Input = f64, Output = f64
const _: fn(&mut UniversalOscillator, f64) -> Option<f64> =
    <UniversalOscillator as Indicator>::update;
```

An `f64` in, an `Option<f64>` out. The Python binding takes a scalar for `update`
and a 1-D numpy array for `batch` (NaN warmup); Node takes `update(value)` and
`batch(values[])`.

## Warmup

`warmup_period() == 3`. A two-bar difference needs two prior prices; the first
value lands on the third bar (`first_emission_at_warmup_period` pins this).

## Edge cases

- **Flat input → 0.** A constant whitens to zero, so the output is `0`
  (`constant_input_is_zero` pins this).
- **Bounded.** The AGC keeps the reading in `[−1, +1]` (`output_in_range` pins
  this).
- **Cyclic input → both signs.** A sine input swings across zero
  (`cyclic_input_swings_both_signs` pins this).
- **Non-finite input.** A NaN/∞ input is ignored and the last value returned
  (`ignores_non_finite` pins this).
- **Reset.** `u.reset()` clears the smoother, the price history, the AGC peak and
  the last value (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, UniversalOscillator};
use std::f64::consts::TAU;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut u = UniversalOscillator::new(20)?;
    let xs: Vec<f64> = (0..200).map(|i| 100.0 + (TAU * f64::from(i) / 20.0).sin() * 5.0).collect();
    println!("last = {:?}", u.batch(&xs).last().unwrap());
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

u = ta.UNIVERSALOSC(20)
x = 100 + np.sin(2 * np.pi * np.arange(200) / 20) * 5
print(u.batch(x)[-5:])  # in [-1, 1]
```

### Node

```javascript
const ta = require('wickra');

const u = new ta.UNIVERSALOSC(20);
console.log('warmupPeriod:', u.warmupPeriod()); // 3
```

### Streaming

```rust
use wickra::{Indicator, UniversalOscillator};

let mut u = UniversalOscillator::new(20).unwrap();
let mut last = None;
for i in 0..80 {
    last = u.update(100.0 + (f64::from(i) * 0.3).sin() * 5.0);
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Cycle timing.** Treat it like a stochastic/RSI bounded oscillator — extremes
   near `±1` are over-extended, zero-crosses mark cycle direction shifts.
2. **Cross-instrument thresholds.** Because of the AGC, the same overbought/oversold
   levels work on any market.
3. **Confirmation.** Pair with a trend filter; the Universal Oscillator times
   pullbacks within the trend.

## Common pitfalls

- **Whitening removes the trend.** This is a cycle tool; it says nothing about
  direction on its own.
- **AGC lag.** After a volatility collapse the peak decays slowly (`0.991`/bar), so
  amplitude normalisation lags a regime change briefly.
- **Period role.** `period` smooths the whitened series; it is not a cycle length.

## References

Ehlers, J. F. (2013), *Cycle Analytics for Traders*, Wiley — the Universal
Oscillator (whitening + SuperSmoother + AGC).

## See also

- [Indicator-EvenBetterSinewave](/Indicators/Indicator-EvenBetterSinewave) — normalised sinewave oscillator.
- [Indicator-Reflex](/Indicators/Indicator-Reflex) — zero-lag cycle oscillator.
- [Indicator-SuperSmoother](/Indicators/Indicator-SuperSmoother) — the smoothing core.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
