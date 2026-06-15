# ShannonEntropy

> The Shannon information entropy (in bits) of a rolling window's binned
> distribution — a regime gauge for how spread-out and unpredictable recent
> prices are.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Statistics |
| Input type | `f64` |
| Output type | `f64` |
| Output range | `[0, log2(bins)]` |
| Default parameters | `(period = 32, bins = 8)` (Python) |
| Warmup period | `period` |
| Interpretation | Low = concentrated/trending; high = diffuse/noisy. |

## Formula

```
bucket the last `period` values into `bins` equal-width bins over [min, max]
p_i = count_i / period
H   = − Σ p_i · log2(p_i)        (over non-empty bins)
```

Entropy quantifies disorder. A window whose values huddle in one bin (a quiet or
tightly-trending market) carries little information and scores near `0`; a window
spread evenly across all bins (directionless noise) approaches the maximum
`log2(bins)`. The window is rebinned each bar between its own running min and max,
so the measure is scale-free. Source:
`crates/wickra-core/src/indicators/shannon_entropy.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | `32`    | `>= 1`      | `shannon_entropy.rs:60` | Rolling window length. `0` errors with `Error::PeriodZero`. |
| `bins`   | `usize` | `8`     | `>= 2`      | `shannon_entropy.rs:60` | Number of histogram buckets. `< 2` errors with `Error::InvalidPeriod`. |

`params()` returns `(period, bins)`; `value` returns the current output if ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/shannon_entropy.rs`:

```rust
use wickra::{Indicator, ShannonEntropy};
// ShannonEntropy: Input = f64, Output = f64
const _: fn(&mut ShannonEntropy, f64) -> Option<f64> = <ShannonEntropy as Indicator>::update;
```

An `f64` in, an `Option<f64>` out. The Python binding takes a scalar for `update`
and a 1-D numpy array for `batch` (NaN warmup); Node takes `update(value)` and
`batch(values[])`.

## Warmup

`warmup_period() == period`. The first value lands once the window is full
(`first_emission_at_warmup_period` pins this).

## Edge cases

- **Constant window → 0.** A window of identical values (`max == min`) returns `0`
  (`constant_window_is_zero` pins this).
- **Uniform window → max.** One value per bin gives the maximum `log2(bins)`
  (`uniform_window_is_max_entropy` pins this; `bins = 4` → `2.0`).
- **Bounded.** The reading stays within `[0, log2(bins)]` (`output_in_range` pins
  this).
- **Non-finite input.** A NaN/∞ input is ignored and the last value returned
  (`ignores_non_finite` pins this).
- **Reset.** `e.reset()` clears the window and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, ShannonEntropy};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut e = ShannonEntropy::new(4, 4)?;
    // Four values, one per bin -> uniform -> H = log2(4) = 2.0.
    let out = e.batch(&[0.0, 1.0, 2.0, 3.0]);
    println!("{:?}", out.last().unwrap()); // Some(2.0)
    Ok(())
}
```

Output:

```
Some(2.0)
```

### Python

```python
import numpy as np
import wickra as ta

e = ta.SHANNONENT(32, 8)
x = np.sin(np.arange(200) * 0.3) * 10.0
print(e.batch(x)[-1])   # in [0, 3]  (log2(8) = 3)
```

### Node

```javascript
const ta = require('wickra');

const e = new ta.SHANNONENT(4, 4);
console.log(e.batch([0, 1, 2, 3]).at(-1)); // 2
```

### Streaming

```rust
use wickra::{Indicator, ShannonEntropy};

let mut e = ShannonEntropy::new(32, 8).unwrap();
let mut last = None;
for i in 0..64 {
    last = e.update((f64::from(i) * 0.7).sin() * 10.0);
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Regime filter.** Low entropy = ordered market → favour trend and breakout
   tactics; high entropy = disordered → favour mean-reversion or staying flat.
2. **Entropy spikes.** A jump in entropy often coincides with a structural break
   or news shock; a collapse signals a tightening, coiling range.
3. **Normalise across assets.** Because the output caps at `log2(bins)`, divide by
   it to compare entropy across instruments on a `[0, 1]` scale.

## Common pitfalls

- **Bin count matters.** Too few bins washes out structure; too many leaves most
  bins empty and inflates apparent disorder relative to `period`.
- **Window vs returns.** This bins price *levels*; for return-distribution entropy,
  feed it a return series.
- **Short windows.** With `period` near `bins`, the histogram is too sparse to be
  meaningful.

## References

Shannon, C. E. (1948), "A Mathematical Theory of Communication", *Bell System
Technical Journal*. Application to market regime analysis is widespread in
quantitative finance.

## See also

- [Indicator-Skewness](/Indicators/Indicator-Skewness) — third-moment asymmetry.
- [Indicator-Kurtosis](/Indicators/Indicator-Kurtosis) — fourth-moment tailedness.
- [Indicator-SampleEntropy](/Indicators/Indicator-SampleEntropy) — regularity of the sequence.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
