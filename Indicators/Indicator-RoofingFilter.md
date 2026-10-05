# Roofing Filter

> John Ehlers' bandpass formed by feeding a one-pole high-pass into a
> [SuperSmoother](/Indicators/Indicator-SuperSmoother). The high-pass strips out
> the trend (periods longer than `hp_period`) and the SuperSmoother
> removes noise (periods shorter than `lp_period`). The result is
> essentially the 10–48 bar cycle band on default parameters — the
> canonical pre-filter for cycle-aware oscillators.

## Quick reference

| Item                | Value                                                                  |
|---------------------|------------------------------------------------------------------------|
| Family              | Ehlers / Cycle (DSP)                                                   |
| Input type          | `f64`                                                                  |
| Output type         | `f64`                                                                  |
| Output range        | unbounded; centred near zero                                           |
| Default parameters  | `lp_period = 10`, `hp_period = 48` (Ehlers; Python defaults)           |
| Warmup period       | `1` (emits from the first bar)                                         |
| Interpretation      | Cycle-band signal; zero crossings = cycle-momentum reversals           |

## Formula

```
alpha = (cos(360°/hp_period) + sin(360°/hp_period) - 1)
        / cos(360°/hp_period)

HP_t  = (1 - α/2) · (x_t - x_{t-1}) + (1 - α) · HP_{t-1}     (HP = 0 on the first bar)

Roofing_t = SuperSmoother(HP, lp_period)_t
```

A one-pole high-pass (not the 2-pole used in Decycler) followed
by the SuperSmoother lowpass. The `.707` factor inside the cosine/sine
(`cos(.707·360°/hp_period)` …) belongs to the **two-pole** high-pass of
Ehlers' *Cycle Analytics* Roofing Filter variant, which also uses
`(1 − α/2)²` and second differences; Wickra implements the one-pole form
above, so there is no `.707` in its alpha. The combination passes only the band
between `lp_period` (lower) and `hp_period` (upper). See
`crates/wickra-core/src/indicators/roofing_filter.rs`.

## Parameters

| Name        | Type    | Default | Constraint            | Description |
|-------------|---------|---------|-----------------------|-------------|
| `lp_period` | `usize` | `10` (Python) | `>= 1`, `< hp_period`  | SuperSmoother critical period (lowpass). |
| `hp_period` | `usize` | `48` (Python) | `>= 2`, `> lp_period`  | High-pass cutoff. |

`RoofingFilter::new` returns `Error::PeriodZero` for zero periods
and `Error::InvalidPeriod` for `lp_period >= hp_period`.

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Python:
`RoofingFilter(lp, hp).batch(prices)` returns an `array.array('d')`.
Node: same shape; `update(value)` returns `number`.

## Warmup

`warmup_period() == 1`. The inner SuperSmoother emits on its first input,
so the filter returns a value from the very first bar (the high-pass is `0`
there, since it has no previous input). The high-pass needs two bars to be
meaningful and the recursions need roughly `hp_period` bars to settle, so
treat the first few dozen outputs as start-up transient.

## Edge cases

- **Constant input.** Both filter outputs decay to zero
  (`constant_series_converges_to_zero` pins this).
- **Trend input.** The high-pass removes the price level, but a one-pole
  high-pass leaves a constant offset on a steady ramp of slope `s`
  (`≈ (1 − α/2)·s / α`; about `2.29` for `s = 0.3` at `hp_period = 48`), so a
  linear trend shows up as a flat, non-zero line rather than as zero.
- **Pure cycle in band.** Passes through with mild attenuation;
  output oscillates around zero with the cycle's amplitude.
- **Non-finite input.** A NaN/∞ input returns `None` and leaves the state
  untouched (`ignores_non_finite_input` pins this).
- **Reset.** `reset()` clears the high-pass state and the inner
  SuperSmoother (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, RoofingFilter};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prices: Vec<f64> = (0..200)
        .map(|i| {
            let trend = 100.0 + f64::from(i) * 0.3;
            let cycle = (f64::from(i) * 0.4).sin() * 4.0;
            let noise = (f64::from(i) * 2.0).sin() * 0.5;
            trend + cycle + noise
        })
        .collect();
    let mut rf = RoofingFilter::new(10, 48)?;
    println!("row 100 = {:?}", rf.batch(&prices)[100]);
    // Trend removed, noise smoothed, cycle component preserved
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

t = np.arange(200)
trend = 100 + t * 0.3
cycle = np.sin(t * 0.4) * 4
noise = np.sin(t * 2.0) * 0.5
prices = trend + cycle + noise
rf = ta.RoofingFilter(10, 48)
print('row 100:', rf.batch(prices)[100])
```

### Node

```javascript
const wickra = require('wickra');
const rf = new wickra.RoofingFilter(10, 48);
const prices = Array.from({ length: 200 },
  (_, i) => 100 + i * 0.3 + Math.sin(i * 0.4) * 4);
console.log('row 100:', rf.batch(prices)[100]);
```

### Streaming

```rust
use wickra::{Indicator, RoofingFilter};

let mut rf = RoofingFilter::new(10, 48).unwrap();
let price_stream: Vec<f64> = Vec::new(); // your live price feed
for px in price_stream {
    let cycle = rf.update(px).unwrap();
    // `cycle` is the band-limited price residual; feed downstream
    // oscillators (e.g. Stochastic) on this instead of raw price
    // for adaptive cycle-aware signals.
}
```

## Interpretation

- **Cycle-band signal.** The output is the residual price action
  inside the `[lp_period, hp_period]` cycle band. Useful as the
  *input* to cycle-aware oscillators rather than as a signal in
  its own right.
- **Used by EhlersStochastic.** Stochastic computed on Roofing-
  Filter output rather than raw price is one of the canonical
  Ehlers cycle indicators — see
  [EhlersStochastic](/Indicators/Indicator-EhlersStochastic).
- **Zero crossings.** Mark cycle-momentum reversals. Often used
  as a confirmation filter rather than as primary entry signal.

## Common pitfalls

- **Trading the raw Roofing output.** It's a pre-filter, not a
  signal. Stack it under an oscillator (Stoch, RSI, CCI) for
  trade signals.
- **Period ratio.** `(lp, hp) = (10, 12)` gives a near-zero
  passband — output is noise. Use Ehlers' default `(10, 48)` or a
  similar wide ratio.
- **High-pass + SuperSmoother stacking order.** Reversing the order
  (SuperSmoother first, then HP) changes the response. Don't roll
  your own variant if you want canonical Ehlers behaviour.

## References

- John F. Ehlers, *Cycle Analytics for Traders*, Wiley (2013),
  ch. 7 — Roofing Filter as standard cycle pre-filter.

## See also

- [SuperSmoother](/Indicators/Indicator-SuperSmoother) — the lowpass half.
- [Decycler](/Indicators/Indicator-Decycler) — alternative trend extractor.
- [EhlersStochastic](/Indicators/Indicator-EhlersStochastic) — direct consumer
  of the Roofing Filter output.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
