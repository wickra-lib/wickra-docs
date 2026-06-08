# SampleEntropy

> Richman & Moorman's Sample Entropy (SampEn) — how *regular* a window is: the
> negative log probability that points similar for `m` steps stay similar at the
> next step.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Statistics |
| Input type | `f64` |
| Output type | `f64` |
| Output range | `[0, ∞)` (low = regular/predictable, high = irregular) |
| Default parameters | `(period = 50, m = 2, r_factor = 0.2)` |
| Warmup period | `period` |
| Interpretation | Low = trending/cyclic; high = noisy/unpredictable. |

## Formula

```
tol = r_factor · stddev(window)
B   = # template pairs of length m   within tol   (i < j)
A   = # template pairs of length m+1 within tol   (i < j)
SampEn = − ln(A / B)
```

Sample Entropy counts how many length-`m` sub-sequences are "similar" (within a
Chebyshev tolerance `tol`) and how many of those similarities persist one step
longer. A low ratio of broken-to-kept similarities — low SampEn — means the series
is regular and predictable; a high SampEn means it is noise-like. Excluding
self-matches (the SampEn refinement over approximate entropy) removes the
short-window bias. Source:
`crates/wickra-core/src/indicators/sample_entropy.rs`.

## Parameters

| Name       | Type    | Default | Valid range | Source | Description |
|------------|---------|---------|-------------|--------|-------------|
| `period`   | `usize` | `50`    | `>= m + 2`  | `sample_entropy.rs:84` | Rolling window length. `< m + 2` errors with `Error::InvalidPeriod`. |
| `m`        | `usize` | `2`     | `>= 1`      | `sample_entropy.rs:84` | Embedding dimension (template length). `0` errors with `Error::PeriodZero`. |
| `r_factor` | `f64`   | `0.2`   | `> 0`, finite | `sample_entropy.rs:84` | Tolerance as a fraction of the window standard deviation. Non-positive errors with `Error::InvalidParameter`. |

`params()` returns `(period, m, r_factor)`; `value` returns the current output if
ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/sample_entropy.rs`:

```rust
use wickra::{Indicator, SampleEntropy};
// SampleEntropy: Input = f64, Output = f64
const _: fn(&mut SampleEntropy, f64) -> Option<f64> = <SampleEntropy as Indicator>::update;
```

An `f64` in, an `Option<f64>` out. The Python binding takes a scalar for `update`
and a 1-D numpy array for `batch` (NaN warmup); Node takes `update(value)` and
`batch(values[])`.

## Warmup

`warmup_period() == period`. The first value lands once the window is full
(`first_emission_at_warmup_period` pins this).

## Edge cases

- **Constant window → 0.** A flat window (`stddev == 0`) is maximally regular and
  returns `0` (`constant_window_is_zero` pins this).
- **Non-negative.** SampEn is `≥ 0` by construction (`output_is_non_negative` pins
  this).
- **Regularity ordering.** A smooth series scores at or below a jagged one
  (`regular_below_irregular` pins this).
- **Undefined counts.** No length-`m` matches → `0`; matches that never extend →
  the `−ln(1/B)` fallback (documented in the source).
- **Non-finite input.** A NaN/∞ input is ignored and the last value returned
  (`ignores_non_finite` pins this).
- **Reset.** `s.reset()` clears the window and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, SampleEntropy};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut s = SampleEntropy::new(20, 2, 0.2)?;
    // A flat window is perfectly regular.
    let out = s.batch(&[5.0; 30]);
    println!("{:?}", out.last().unwrap()); // Some(0.0)
    Ok(())
}
```

Output:

```
Some(0.0)
```

### Python

```python
import numpy as np
import wickra as ta

s = ta.SampleEntropy(50, 2, 0.2)
x = np.sin(np.arange(200) * 0.3) * 5.0
print(s.batch(x)[-1])   # small, positive (smooth -> regular)
```

### Node

```javascript
const ta = require('wickra');

const s = new ta.SampleEntropy(50, 2, 0.2);
console.log('warmupPeriod:', s.warmupPeriod()); // 50
```

### Streaming

```rust
use wickra::{Indicator, SampleEntropy};

let mut s = SampleEntropy::new(50, 2, 0.2).unwrap();
let mut last = None;
for i in 0..80 {
    last = s.update((f64::from(i) * 0.3).sin() * 5.0);
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Predictability gauge.** Falling SampEn says the market is becoming more
   structured (trend/cycle forming); rising SampEn says it is breaking into noise.
2. **Strategy switch.** Pair low SampEn with trend systems and high SampEn with
   mean-reversion or risk-off.
3. **Relation to ApEn.** SampEn is the bias-corrected successor to approximate
   entropy; use it wherever ApEn is cited but you want stable short-window values.

## Common pitfalls

- **Cost.** Each evaluation is O(`period²`); keep `period` modest for tick-rate
  streams.
- **Tolerance sensitivity.** `r_factor` around `0.1`–`0.25` of σ is standard; too
  small starves the match counts, too large saturates them.
- **Stationarity.** Like all entropy estimates it assumes the window is roughly
  stationary; a trend inside the window inflates `m`-matches.

## References

Richman, J. S., & Moorman, J. R. (2000), "Physiological time-series analysis using
approximate and sample entropy", *American Journal of Physiology*. Pincus, S. M.
(1991) for the original approximate entropy.

## See also

- [Indicator-ShannonEntropy](/Indicators/Indicator-ShannonEntropy) — distributional entropy.
- [Indicator-HurstExponent](/Indicators/Indicator-HurstExponent) — long-memory / persistence.
- [Indicator-Autocorrelation](/Indicators/Indicator-Autocorrelation) — linear serial dependence.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
