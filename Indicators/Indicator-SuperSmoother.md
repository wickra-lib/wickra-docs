# SuperSmoother

> John Ehlers' 2-pole Butterworth-style lowpass filter. Critically
> damped, so it removes high-frequency noise without ringing,
> overshoot, or the boxy step response of a simple SMA. The standard
> Ehlers pre-filter to put in front of any cycle-aware oscillator.

## Quick reference

| Item                | Value                                                                  |
|---------------------|------------------------------------------------------------------------|
| Family              | Ehlers / Cycle (DSP)                                                   |
| Input type          | `f64`                                                                  |
| Output type         | `f64`                                                                  |
| Output range        | unbounded; tracks input scale                                          |
| Default parameters  | `period` is required (typical `10`)                                    |
| Warmup period       | `2` (uses the input directly for the first two bars)                   |
| Interpretation      | Lowpass-filtered price; passes periods longer than `period`            |

## Formula

For a given critical period `period`, the filter coefficients are:

```
a1 = exp(-sqrt(2) · π / period)
b1 = 2 · a1 · cos(sqrt(2) · π / period)
c2 = b1
c3 = -a1²
c1 = 1 - c2 - c3

y_t = c1 · (x_t + x_{t-1}) / 2 + c2 · y_{t-1} + c3 · y_{t-2}
```

The implementation needs two prior inputs and two prior outputs to
begin running; until then it returns the input itself (the Ehlers-
standard initial condition), which lets downstream filters warm up
without long delays. See
`crates/wickra-core/src/indicators/super_smoother.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 1`      | Critical period — the boundary above which signal is passed. |

`SuperSmoother::new` returns `Error::PeriodZero` for `period == 0`
and `Error::InvalidPeriod` for `period == 1` (no smoothing possible).

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Python:
`SuperSmoother(period).batch(prices)` returns a 1-D `np.ndarray`
without warmup `NaN`s (Ehlers' "pass through input" initial
condition). Node: same shape; `update(value)` returns `number`.

## Warmup

`warmup_period() == 2`. The first two inputs return the input
itself; from input 3 onwards the proper 2-pole recursion runs. By
input ~`2 · period` the initial transient has decayed.

## Edge cases

- **Constant input.** Output converges to the constant.
- **Step input.** Critically damped — no overshoot, no ringing.
  Roughly `0.7 · period` bars to reach 99% of the new level.
- **Sinusoid at the critical period.** Output is attenuated by ~3
  dB (≈ 70%) — the canonical cutoff.
- **High-frequency noise.** Suppressed at `>20 dB` for periods
  shorter than `period / 4`.
- **Reset.** `reset()` clears all prior inputs and outputs to
  `None` and resets the bar counter.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, SuperSmoother};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prices: Vec<f64> = (0..80)
        .map(|i| 100.0 + (f64::from(i) * 1.5).sin() * 5.0)
        .collect();
    let mut ss = SuperSmoother::new(10)?;
    println!("row 20 = {:?}", ss.batch(&prices)[20]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

# Noisy price with both a slow trend and high-frequency noise
t = np.arange(200)
prices = 100 + np.sin(t * 0.1) * 5 + np.random.normal(0, 0.5, 200)
ss = ta.SuperSmoother(10)
out = ss.batch(prices)
print('row 50:', out[50])
```

### Node

```javascript
const wickra = require('wickra');

const ss = new wickra.SuperSmoother(10);
const prices = Array.from({ length: 200 },
  (_, i) => 100 + Math.sin(i * 0.1) * 5);
console.log('row 50:', ss.batch(prices)[50]);
```

### Streaming

```rust
use wickra::{Indicator, SuperSmoother};

let mut ss = SuperSmoother::new(10).unwrap();
let price_stream: Vec<f64> = Vec::new(); // your live price feed
for px in price_stream {
    let smoothed = ss.update(px).unwrap();
    // Use as a noise-suppressed price signal for downstream logic
}
```

## Interpretation

- **Lowpass building block.** Use SuperSmoother as a noise filter
  in front of oscillators that are sensitive to bar-to-bar noise
  (RSI, Stochastic, CCI). The cleaner input often eliminates the
  need for the oscillator's own smoothing pass.
- **Vs SMA / EMA.** SuperSmoother has a much sharper frequency
  response — passes long cycles cleanly, kills short ones — while
  matching SMA / EMA at roughly the same lag.
- **Critical period semantics.** The `period` is the boundary, not
  a "length in bars" the way SMA's period is. SuperSmoother(10)
  passes a 20-bar cycle cleanly and attenuates a 5-bar cycle
  almost completely.

## Common pitfalls

- **Confusing `period` with SMA period.** `SuperSmoother(20)` is
  *much* more aggressive than `SMA(20)` — it kills cycles shorter
  than ~10 bars entirely.
- **Stacking unnecessarily.** Ehlers warns against stacking
  multiple SuperSmoothers — they multiply lag without adding much
  attenuation.
- **Period too short.** `period = 2` is degenerate (no real
  smoothing); the constructor enforces `period > 1`. Typical useful
  range is `5`–`30`.

## References

- John F. Ehlers, *Cycle Analytics for Traders*, Wiley (2013),
  ch. 3 — introduces SuperSmoother and the Roofing Filter family.

## See also

- [RoofingFilter](/Indicators/Indicator-RoofingFilter) — SuperSmoother +
  high-pass = cycle-band bandpass.
- [Decycler](/Indicators/Indicator-Decycler) — complementary trend extractor.
- [Zlema](/Indicators/Indicator-Zlema) — alternative low-lag smoother (not
  critically damped).
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
