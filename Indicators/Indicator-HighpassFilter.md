# HighpassFilter

> Ehlers' two-pole highpass filter — strips the low-frequency trend and leaves the
> cyclic content; the complement of the Decycler.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Ehlers / Cycle (DSP) |
| Input type | `f64` |
| Output type | `f64` |
| Output range | zero-mean (price units) |
| Default parameters | `(period = 48)` (Python) |
| Warmup period | `1` |
| Interpretation | Detrended series — swings around `0` with the cycles. |

## Formula

```
a = 0.707 · 2π / period
alpha1 = (cos(a) + sin(a) − 1) / cos(a)
HP_t = (1 − alpha1/2)² · (price_t − 2·price_{t−1} + price_{t−2})
       + 2·(1 − alpha1)·HP_{t−1} − (1 − alpha1)²·HP_{t−2}
```

The two-pole highpass passes everything *faster* than the cutoff `period` and
removes the slow trend, detrending the series into a zero-mean wave with a steep
roll-off. It is the part the [`Decycler`](/Indicators/Indicator-Decycler)
discards: `decycler = price − highpass`. Source:
`crates/wickra-core/src/indicators/highpass_filter.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `48` (Python) | `>= 1`      | `highpass_filter.rs:55` | Cutoff period; cycles slower than this are removed. `0` errors with `Error::PeriodZero`. |

The `period` getter returns the cutoff; `value` returns the current output if
ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/highpass_filter.rs`:

```rust
use wickra::{Indicator, HighpassFilter};
// HighpassFilter: Input = f64, Output = f64
const _: fn(&mut HighpassFilter, f64) -> Option<f64> = <HighpassFilter as Indicator>::update;
```

An `f64` in, an `Option<f64>` out. The Python binding takes a scalar for `update`
and a 1-D numpy array for `batch`; Node takes `update(value)` and `batch(values[])`.
With `warmup_period == 1` a value is produced every bar (zeros until the recursion
fills).

## Warmup

`warmup_period() == 1`. The first two bars emit `0`, then the filter is live
(`first_bars_are_zero` pins this).

## Edge cases

- **Flat input → 0.** A constant has no high-frequency content
  (`constant_input_stays_zero` pins this).
- **Pure trend → attenuated.** A straight ramp is low-frequency and is driven
  small after warmup (`pure_trend_is_attenuated` pins this).
- **Non-finite input.** A NaN/∞ input is ignored and the last value returned
  (`ignores_non_finite` pins this).
- **Reset.** `hp.reset()` clears the price/output history and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, HighpassFilter};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut hp = HighpassFilter::new(20)?;
    // A ramp + ripple: the ramp is removed, the ripple survives.
    let xs: Vec<f64> = (0..200).map(|i| 100.0 + f64::from(i) + (f64::from(i) * 0.5).sin() * 3.0).collect();
    println!("last = {:?}", hp.batch(&xs).last().unwrap());
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

hp = ta.HIGHPASS(48)
x = 100 + np.arange(200) + np.sin(np.arange(200) * 0.5) * 3
print(hp.batch(x)[-5:])  # detrended ripple
```

### Node

```javascript
const ta = require('wickra');

const hp = new ta.HIGHPASS(48);
console.log('warmupPeriod:', hp.warmupPeriod()); // 1
```

### Streaming

```rust
use wickra::{Indicator, HighpassFilter};

let mut hp = HighpassFilter::new(48).unwrap();
let mut last = None;
for i in 0..120 {
    last = hp.update(100.0 + f64::from(i) + (f64::from(i) * 0.5).sin() * 3.0);
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Detrending.** Feed any indicator the highpass output to remove slow drift
   before measuring cycles.
2. **Roofing front-end.** Pair with a SuperSmoother lowpass to build a roofing
   filter (highpass then smooth) — the basis of much of Ehlers' work.
3. **Cycle visibility.** Turning points in the highpass mark short-cycle swings
   that the raw chart buries under the trend.

## Common pitfalls

- **Not the decycler.** This is the *cycle* part; for the smoothed *trend* use the
  decycler (`price − highpass`).
- **Cutoff choice.** Too long a `period` lets slow swings leak through; too short
  removes genuine cycles.
- **Zero-mean.** The output centres on `0`, not on price.

## References

Ehlers, J. F. (2013), *Cycle Analytics for Traders*, Wiley — the two-pole highpass
and roofing filter.

## See also

- [Indicator-Decycler](/Indicators/Indicator-Decycler) — the trend complement (`price − highpass`).
- [Indicator-BandpassFilter](/Indicators/Indicator-BandpassFilter) — single-band cycle isolator.
- [Indicator-RoofingFilter](/Indicators/Indicator-RoofingFilter) — highpass + SuperSmoother.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
