# BandpassFilter

> Ehlers' two-pole bandpass resonator — isolates the cyclic component around a
> target period, rejecting both trend and high-frequency noise.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Ehlers / Cycle (DSP) |
| Input type | `f64` |
| Output type | `f64` |
| Output range | zero-mean oscillator (price units) |
| Default parameters | `(period = 20, bandwidth = 0.3)` |
| Warmup period | `1` |
| Interpretation | Peaks/troughs mark the dominant cycle near `period`. |

## Formula

```
beta  = cos(2π / period)
gamma = 1 / cos(4π · bandwidth / period)
alpha = gamma − sqrt(gamma² − 1)
BP_t  = 0.5·(1 − alpha)·(price_t − price_{t−2})
        + beta·(1 + alpha)·BP_{t−1} − alpha·BP_{t−2}
```

The bandpass filter passes frequencies in a band centred on `1/period` and
attenuates everything else. `bandwidth` controls the band's width: a small value
gives a sharp, ringing filter tuned tightly to `period`; a larger value admits a
broader slice of the spectrum. The output is a zero-mean wave that grows when the
market's dominant cycle matches `period`. Source:
`crates/wickra-core/src/indicators/bandpass_filter.rs`.

## Parameters

| Name        | Type    | Default | Valid range | Source | Description |
|-------------|---------|---------|-------------|--------|-------------|
| `period`    | `usize` | `20`    | `>= 1`      | `bandpass_filter.rs:62` | Centre period of the passband. `0` errors with `Error::PeriodZero`. |
| `bandwidth` | `f64`   | `0.3`   | `(0, 1)`    | `bandpass_filter.rs:62` | Fractional bandwidth. Outside `(0, 1)` or non-finite errors with `Error::InvalidParameter`. |

`params()` returns `(period, bandwidth)`; `value` returns the current output if
ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/bandpass_filter.rs`:

```rust
use wickra::{Indicator, BandpassFilter};
// BandpassFilter: Input = f64, Output = f64
const _: fn(&mut BandpassFilter, f64) -> Option<f64> = <BandpassFilter as Indicator>::update;
```

An `f64` in, an `Option<f64>` out. The Python binding takes a scalar for `update`
and a 1-D numpy array for `batch`; Node takes `update(value)` and `batch(values[])`.
With `warmup_period == 1` a value is produced every bar (zeros until the recursion
fills).

## Warmup

`warmup_period() == 1`. The first two bars emit `0` (the recursion needs two prior
prices/outputs), then the filter is live (`first_bars_are_zero` pins this).

## Edge cases

- **Flat input → 0.** A trend-free constant carries no cycle, so the output stays
  `0` (`constant_input_stays_zero` pins this).
- **Cyclic input → zero-mean wave.** A sine at `period` produces a symmetric
  oscillation about `0` (`cyclic_input_oscillates_around_zero` pins this).
- **Non-finite input.** A NaN/∞ input is ignored and the last value returned
  (`ignores_non_finite` pins this).
- **Reset.** `bp.reset()` clears the price/output history and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, BandpassFilter};
use std::f64::consts::PI;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut bp = BandpassFilter::new(20, 0.3)?;
    let xs: Vec<f64> = (0..200).map(|i| 100.0 + (2.0 * PI * f64::from(i) / 20.0).sin() * 5.0).collect();
    let out = bp.batch(&xs);
    println!("last = {:?}", out.last().unwrap());
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

bp = ta.BANDPASS(20, 0.3)
x = 100 + np.sin(2 * np.pi * np.arange(200) / 20) * 5
print(bp.batch(x)[-5:])  # zero-mean oscillation
```

### Node

```javascript
const ta = require('wickra');

const bp = new ta.BANDPASS(20, 0.3);
console.log('warmupPeriod:', bp.warmupPeriod()); // 1
```

### Streaming

```rust
use wickra::{Indicator, BandpassFilter};

let mut bp = BandpassFilter::new(20, 0.3).unwrap();
let mut last = None;
for i in 0..80 {
    last = bp.update(100.0 + (f64::from(i) * 0.3).sin() * 5.0);
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Cycle isolation.** Tune `period` to the dominant cycle (e.g. from an
   autocorrelation periodogram) and read peaks/troughs as cycle turning points.
2. **Phase and amplitude.** The bandpass is the front end for cycle-phase
   measurement and amplitude/AGC work in Ehlers' toolkit.
3. **Lead vs. lag.** A narrow bandwidth rings (leads near the tuned frequency but
   adds ripple); a wide bandwidth is smoother but less selective.

## Common pitfalls

- **Mistuned period.** If `period` is far from the real cycle the output is small
  and noisy; estimate the cycle first.
- **Zero-mean, not a level.** It oscillates around `0`; do not read it as price.
- **Ringing.** Very narrow bandwidths can ring and produce phantom cycles.

## References

Ehlers, J. F. (2013), *Cycle Analytics for Traders*, Wiley — the bandpass filter
and its bandwidth parameterisation.

## See also

- [Indicator-HighpassFilter](/Indicators/Indicator-HighpassFilter) — removes the trend, keeps cycles+noise.
- [Indicator-RoofingFilter](/Indicators/Indicator-RoofingFilter) — highpass + SuperSmoother band.
- [Indicator-SuperSmoother](/Indicators/Indicator-SuperSmoother) — Ehlers lowpass.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
