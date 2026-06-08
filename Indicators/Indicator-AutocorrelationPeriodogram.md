# AutocorrelationPeriodogram

> Ehlers' Autocorrelation Periodogram — estimates the market's **dominant cycle
> period** by correlating a roofing-filtered price with lagged copies of itself.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Ehlers / Cycle (DSP) |
| Input type | `f64` |
| Output type | `f64` (a cycle length in bars) |
| Output range | `[min_period, max_period]` |
| Default parameters | `(min_period = 10, max_period = 48)` |
| Warmup period | `max_period + 3` |
| Interpretation | The current dominant cycle length; feed it to adaptive indicators. |

## Formula

```
Filt = RoofingFilter(price)                                       (detrend + denoise)
Corr[lag] = Pearson( Filt[0..AvgLength], Filt[lag..lag+AvgLength] )   (AvgLength = 3)
power[period] = (Σ Corr[N]·cos(2πN/period))² + (Σ Corr[N]·sin(2πN/period))²
R[period]     = 0.2·power[period] + 0.8·R[period]_{t−1}
normalise by a decaying max, then
DominantCycle = centre-of-gravity of periods whose normalised power ≥ 0.5
```

The autocorrelation function highlights whatever cycle is genuinely present and
suppresses noise. Turning it into a periodogram (a discrete Fourier transform of
the correlations) and taking the power-weighted centre of gravity yields a smooth,
robust estimate of the dominant cycle. That number is the key input to every
*adaptive* indicator. Source:
`crates/wickra-core/src/indicators/autocorrelation_periodogram.rs`.

## Parameters

| Name         | Type    | Default | Valid range | Source | Description |
|--------------|---------|---------|-------------|--------|-------------|
| `min_period` | `usize` | `10`    | `>= 4`, `< max_period` | `autocorrelation_periodogram.rs:73` | Shortest cycle searched. |
| `max_period` | `usize` | `48`    | `> min_period` | `autocorrelation_periodogram.rs:73` | Longest cycle searched (also the roofing highpass cutoff). `0` for either errors with `Error::PeriodZero`; bad ordering with `Error::InvalidPeriod`. |

`periods()` returns `(min_period, max_period)`; `value` returns the current cycle
estimate if ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/autocorrelation_periodogram.rs`:

```rust
use wickra::{Indicator, AutocorrelationPeriodogram};
// AutocorrelationPeriodogram: Input = f64, Output = f64
const _: fn(&mut AutocorrelationPeriodogram, f64) -> Option<f64> =
    <AutocorrelationPeriodogram as Indicator>::update;
```

An `f64` in, an `Option<f64>` out (a cycle length). The Python binding takes a
scalar for `update` and a 1-D numpy array for `batch` (NaN warmup); Node takes
`update(value)` and `batch(values[])`.

## Warmup

`warmup_period() == max_period + 3` (`AvgLength = 3`). The lag buffer must hold
`max_period + AvgLength` roofing-filtered values
(`first_emission_at_warmup_period` pins this for `(8, 20)` → `23`).

## Edge cases

- **Within the band.** The estimate always lies in `[min_period, max_period]`
  (`output_within_period_band` pins this).
- **Detects a real cycle.** A clean 20-bar sine settles near `20`
  (`detects_injected_cycle` pins this).
- **Non-finite input.** A NaN/∞ input is ignored and the last value returned
  (`ignores_non_finite` pins this).
- **Reset.** `p.reset()` clears the roofing filter, the lag buffer, the power EMA
  and the last value (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, AutocorrelationPeriodogram};
use std::f64::consts::TAU;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut p = AutocorrelationPeriodogram::new(10, 48)?;
    let xs: Vec<f64> = (0..600).map(|i| 100.0 + (TAU * f64::from(i) / 20.0).sin() * 5.0).collect();
    println!("dominant cycle ≈ {:.1}", p.batch(&xs).last().unwrap().unwrap());
    Ok(())
}
```

Output (near the injected 20-bar cycle):

```
dominant cycle ≈ 20.x
```

### Python

```python
import numpy as np
import wickra as ta

p = ta.AutocorrelationPeriodogram(10, 48)
x = 100 + np.sin(2 * np.pi * np.arange(600) / 20) * 5
print(round(p.batch(x)[-1], 1))   # ~20
```

### Node

```javascript
const ta = require('wickra');

const p = new ta.AutocorrelationPeriodogram(10, 48);
console.log('warmupPeriod:', p.warmupPeriod()); // 51
```

### Streaming

```rust
use wickra::{Indicator, AutocorrelationPeriodogram};
use std::f64::consts::TAU;

let mut p = AutocorrelationPeriodogram::new(10, 48).unwrap();
let mut last = None;
for i in 0..200 {
    last = p.update(100.0 + (TAU * f64::from(i) / 20.0).sin() * 5.0);
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Adaptive lookback.** Set the period of an RSI, CCI, stochastic or moving
   average from the dominant cycle (often half of it) for self-tuning indicators.
2. **Regime change.** A jump in the estimated cycle flags that the market's rhythm
   has shifted — useful to re-tune systems.
3. **Cycle confidence.** A stable estimate means a clear cycle; a jittery one means
   the market is currently acyclic (trend or noise).

## Common pitfalls

- **Cost.** Each update is O(`max_period²`); keep `max_period` reasonable on fast
  streams.
- **Acyclic markets.** When no cycle dominates, the centre-of-gravity estimate
  wanders — do not over-trust it in strong trends.
- **It is a length, not a signal.** The output is a period; combine it with an
  oscillator to act on the cycle.

## References

Ehlers, J. F. (2013), *Cycle Analytics for Traders*, Wiley, ch. 8 (the
autocorrelation periodogram).

## See also

- [Indicator-RoofingFilter](/Indicators/Indicator-RoofingFilter) — the detrend/denoise front end.
- [Indicator-AdaptiveRsi](/Indicators/Indicator-AdaptiveRsi) — an adaptive oscillator to drive with the cycle.
- [Indicator-HilbertDominantCycle](/Indicators/Indicator-HilbertDominantCycle) — Hilbert-transform cycle estimate.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
