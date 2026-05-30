# Roofing Filter

> John Ehlers' bandpass formed by feeding a 2-pole high-pass into a
> [SuperSmoother](Indicator-SuperSmoother). The high-pass strips out
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
| Default parameters  | `lp_period`, `hp_period` required (Ehlers' typical `(10, 48)`)        |
| Warmup period       | `2` (initial-condition phase)                                          |
| Interpretation      | Cycle-band signal; zero crossings = cycle-momentum reversals           |

## Formula

```
alpha = (cos(.707·360°/hp_period) + sin(.707·360°/hp_period) - 1)
        / cos(.707·360°/hp_period)

HP_t  = (1 - α/2) · (x_t - x_{t-1}) + (1 - α) · HP_{t-1}

Roofing_t = SuperSmoother(lp_period).update(HP_t)
```

A single-pole high-pass (not the 2-pole used in Decycler) followed
by the SuperSmoother lowpass. The combination passes only the band
between `lp_period` (lower) and `hp_period` (upper). See
`crates/wickra-core/src/indicators/roofing_filter.rs`.

## Parameters

| Name        | Type    | Default | Constraint            | Description |
|-------------|---------|---------|-----------------------|-------------|
| `lp_period` | `usize` | none    | `> 1`, `< hp_period`  | SuperSmoother critical period (lowpass). |
| `hp_period` | `usize` | none    | `> 1`, `> lp_period`  | High-pass cutoff. |

`RoofingFilter::new` returns `Error::PeriodZero` for zero periods
and `Error::InvalidPeriod` for `lp_period >= hp_period`.

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Python:
`RoofingFilter(lp, hp).batch(prices)` returns a 1-D `np.ndarray`.
Node: same shape; `update(value)` returns `number`.

## Warmup

`warmup_period() == 2`. The first 2 bars are pass-through initial
condition; from bar 3 the recursion runs. Stable output by
~`2 · max(lp, hp) / 2` bars.

## Edge cases

- **Constant input.** Both filter outputs decay to zero.
- **Trend input.** High-pass strips it out; output stays near zero.
- **Pure cycle in band.** Passes through with mild attenuation;
  output oscillates around zero with the cycle's amplitude.
- **Reset.** `reset()` clears the high-pass state and the inner
  SuperSmoother.

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
  [EhlersStochastic](Indicator-EhlersStochastic).
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

- [SuperSmoother](Indicator-SuperSmoother) — the lowpass half.
- [Decycler](Indicator-Decycler) — alternative trend extractor.
- [EhlersStochastic](Indicator-EhlersStochastic) — direct consumer
  of the Roofing Filter output.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
