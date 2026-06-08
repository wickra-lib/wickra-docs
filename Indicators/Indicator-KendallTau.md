# KendallTau

> Kendall's tau-b — a robust rank correlation between two series measured by the
> balance of concordant and discordant pairs, with a tie correction.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Statistics |
| Input type | `(f64, f64)` (pairwise) |
| Output type | `f64` |
| Output range | `[−1, +1]` |
| Default parameters | `(period = 20)` (Python) |
| Warmup period | `period` |
| Interpretation | `+1` concordant, `−1` discordant, `0` no monotonic link. |

## Formula

```
over all pairs (i < j) in the window:
  concordant if (x_j − x_i) and (y_j − y_i) share a sign
  discordant if opposite signs
  tie_x / tie_y if the respective difference is zero
n0    = N(N−1)/2
tau_b = (n_concordant − n_discordant) / sqrt((n0 − tie_x)(n0 − tie_y))
```

Kendall's tau counts, over every pair of observations, how often the two series
move in the **same direction**. It is the most outlier-robust of the common
correlation measures and captures any monotonic relationship, not just a linear
one. The tau-b variant divides by a tie-corrected denominator so repeated values
do not depress the score. Source:
`crates/wickra-core/src/indicators/kendall_tau.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `20` (Python) | `>= 2`      | `kendall_tau.rs:60` | Rolling window of pairs. `< 2` errors with `Error::InvalidPeriod`. |

The `period` getter returns the window; `value` returns the current output if
ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/kendall_tau.rs`:

```rust
use wickra::{Indicator, KendallTau};
// KendallTau: Input = (f64, f64), Output = f64
const _: fn(&mut KendallTau, (f64, f64)) -> Option<f64> = <KendallTau as Indicator>::update;
```

A `(f64, f64)` pair in, an `Option<f64>` out. The Python binding takes `update(x,
y)` and `batch(x[], y[])` (NaN warmup); Node takes `update(x, y)` and `batch(x[],
y[])`.

## Warmup

`warmup_period() == period`. The first value lands once the window holds `period`
pairs (`first_emission_at_warmup_period` pins this).

## Edge cases

- **Monotone increasing → +1.** A strictly co-increasing pair gives `+1`
  (`monotone_increasing_is_one` pins this).
- **Monotone decreasing → −1.** A strictly anti-monotone pair gives `−1`
  (`monotone_decreasing_is_minus_one` pins this).
- **Constant channel → 0.** A flat `y` makes every `y`-difference a tie; the
  tie-corrected denominator is `0` and the result is `0`
  (`constant_channel_yields_zero` pins this).
- **Bounded.** The reading stays within `[−1, +1]` (`output_in_range` pins this).
- **Reset.** `k.reset()` clears the window and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, KendallTau};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut k = KendallTau::new(10)?;
    let pairs: Vec<(f64, f64)> = (0..20).map(|i| (f64::from(i), 2.0 * f64::from(i))).collect();
    println!("{:?}", k.batch(&pairs).last().unwrap()); // Some(1.0)
    Ok(())
}
```

Output:

```
Some(1.0)
```

### Python

```python
import numpy as np
import wickra as ta

k = ta.KendallTau(20)
x = np.arange(40, dtype=float)
y = 2.0 * x + 1.0
print(k.batch(x, y)[-1])   # 1.0
```

### Node

```javascript
const ta = require('wickra');

const k = new ta.KendallTau(20);
console.log('warmupPeriod:', k.warmupPeriod()); // 20
```

### Streaming

```rust
use wickra::{Indicator, KendallTau};

let mut k = KendallTau::new(20).unwrap();
let mut last = None;
for i in 0..40 {
    let x = f64::from(i);
    last = k.update((x, 2.0 * x));
}
println!("{last:?}"); // Some(1.0)
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Robust pairs trading.** Use tau to screen pair candidates: it flags
   monotonic co-movement even when a few outliers would wreck a Pearson estimate.
2. **Regime monitoring.** A tau that decays from near `+1` toward `0` warns that a
   historically reliable relationship is breaking down.
3. **Non-linear links.** Because it is rank-based, tau detects monotonic but
   curved relationships that linear correlation understates.

## Common pitfalls

- **Cost.** Each evaluation is O(`period²`); keep `period` modest at tick rates.
- **Not Pearson.** Tau values are systematically smaller in magnitude than Pearson
  for the same data (roughly `tau ≈ (2/π) · arcsin(r)`); do not compare them
  directly.
- **Levels, not returns.** This correlates the raw inputs; difference them first
  if you want return-association.

## References

Kendall, M. G. (1938), "A New Measure of Rank Correlation", *Biometrika*. The
tau-b tie correction is the standard form for data with ties.

## See also

- [Indicator-PearsonCorrelation](/Indicators/Indicator-PearsonCorrelation) — linear correlation.
- [Indicator-SpearmanCorrelation](/Indicators/Indicator-SpearmanCorrelation) — rank-difference correlation.
- [Indicator-RollingCorrelation](/Indicators/Indicator-RollingCorrelation) — rolling correlation of returns.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
