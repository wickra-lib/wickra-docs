# JarqueBera

> The Jarque-Bera statistic on a rolling window — a normality test that flags
> fat-tailed or skewed return regimes from skewness and excess kurtosis.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Statistics |
| Input type | `f64` |
| Output type | `f64` |
| Output range | `[0, ∞)` (0 = perfectly normal sample) |
| Default parameters | `(period = 50)` (Python) |
| Warmup period | `period` |
| Interpretation | `> ~6` rejects normality at 95% (χ², 2 d.o.f.). |

## Formula

```
S  = skewness        = m3 / m2^(3/2)
K  = excess kurtosis = m4 / m2² − 3
JB = (period / 6) · ( S² + K²/4 )
```

`m2`, `m3`, `m4` are the central moments of the window. A normal sample has zero
skew and zero excess kurtosis → `JB = 0`. The statistic grows with asymmetry and
with fat (or thin) tails, and under the normality null is asymptotically χ² with
two degrees of freedom — so values above ~`6` reject normality at the 95% level.
Source: `crates/wickra-core/src/indicators/jarque_bera.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `50` (Python) | `>= 4`      | `jarque_bera.rs:54` | Rolling window length. `0` errors with `Error::PeriodZero`; `< 4` errors with `Error::InvalidPeriod`. |

The `period` getter returns the window; `value` returns the current output if
ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/jarque_bera.rs`:

```rust
use wickra::{Indicator, JarqueBera};
// JarqueBera: Input = f64, Output = f64
const _: fn(&mut JarqueBera, f64) -> Option<f64> = <JarqueBera as Indicator>::update;
```

An `f64` in, an `Option<f64>` out. The Python binding takes a scalar for `update`
and a 1-D numpy array for `batch` (NaN warmup); Node takes `update(value)` and
`batch(values[])`. Feed it a **return** series for the usual normality check.

## Warmup

`warmup_period() == period`. The first value lands once the window is full
(`first_emission_at_warmup_period` pins this).

## Edge cases

- **Constant window → 0.** Zero variance (`m2 == 0`) returns `0`
  (`constant_window_is_zero` pins this).
- **Non-negative.** `JB ≥ 0` by construction (`output_is_non_negative` pins this).
- **Skew/kurtosis ordering.** A window with a heavy outlier scores far above a
  symmetric one (`skewed_window_exceeds_symmetric` pins this).
- **Non-finite input.** A NaN/∞ input is ignored and the last value returned
  (`ignores_non_finite` pins this).
- **Reset.** `jb.reset()` clears the window and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, JarqueBera};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut jb = JarqueBera::new(8)?;
    // A symmetric window scores low.
    let out = jb.batch(&[-3.0, -1.0, 0.0, 1.0, 3.0, -2.0, 2.0, 0.0]);
    println!("{:?}", out.last().unwrap());
    Ok(())
}
```

Output (small, near zero — close to normal):

```
Some(0.41...)
```

### Python

```python
import numpy as np
import wickra as ta

jb = ta.JARQUEBERA(50)
returns = np.diff(np.log(100 + np.cumsum(np.random.randn(200))))
print(jb.batch(returns)[-1])   # high in fat-tailed regimes
```

### Node

```javascript
const ta = require('wickra');

const jb = new ta.JARQUEBERA(50);
console.log('warmupPeriod:', jb.warmupPeriod()); // 50
```

### Streaming

```rust
use wickra::{Indicator, JarqueBera};

let mut jb = JarqueBera::new(50).unwrap();
let mut last = None;
for i in 0..80 {
    last = jb.update((f64::from(i) * 0.3).sin());
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Tail-risk flag.** A rising JB on a return window warns that the
   distribution is fattening — drawdown and gap risk are elevated.
2. **Model sanity.** Strategies that assume Gaussian returns (mean-variance
   sizing, many option models) misbehave when JB rejects normality.
3. **Regime split.** Threshold JB at the χ² critical value to bucket the market
   into "normal" vs. "non-normal" periods for conditional back-tests.

## Common pitfalls

- **Feed returns, not prices.** Normality is a property of returns; on raw
  trending prices JB is large but meaningless.
- **Small-sample bias.** Below ~30 observations the χ² approximation is rough;
  treat short-window readings qualitatively.
- **Two failure modes.** A high JB can come from skew *or* kurtosis; inspect
  [`Skewness`](/Indicators/Indicator-Skewness) and [`Kurtosis`](/Indicators/Indicator-Kurtosis) to tell which.

## References

Jarque, C. M., & Bera, A. K. (1980), "Efficient tests for normality,
homoscedasticity and serial independence of regression residuals", *Economics
Letters*.

## See also

- [Indicator-Skewness](/Indicators/Indicator-Skewness) — third-moment asymmetry.
- [Indicator-Kurtosis](/Indicators/Indicator-Kurtosis) — fourth-moment tailedness.
- [Indicator-ShannonEntropy](/Indicators/Indicator-ShannonEntropy) — distributional entropy.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
