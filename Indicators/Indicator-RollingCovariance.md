# RollingCovariance

> Rolling covariance of the period-over-period *returns* of two series — the
> raw building block behind correlation, beta and portfolio variance.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Statistics |
| Input type | `(f64, f64)` (a pair of levels `x`, `y`) |
| Output type | `f64` |
| Output range | unbounded; carries the product of the two return units |
| Default parameters | `period` is required (`>= 2`) |
| Warmup period | `period + 1` |
| Interpretation | Positive → returns move together; negative → they offset; magnitude scales with volatility. |

## Formula

Each `update` takes one `(x, y)` level pair, differences each channel into a
one-step return, and reports the population covariance of those returns over the
trailing window of `period` return pairs:

```
rxₜ = xₜ − xₜ₋₁          ryₜ = yₜ − yₜ₋₁
cov = (1/n) · Σ rx·ry − r̄x · r̄y
```

Unlike [RollingCorrelation](/Indicators/Indicator-RollingCorrelation) the result is **not**
normalised to `[−1, 1]`: it carries the units of the two return streams
multiplied together, so it scales with volatility. It is the raw building block
behind correlation, beta and portfolio variance — positive when the two return
streams tend to move the same way, negative when they offset.

Source: `crates/wickra-core/src/indicators/rolling_covariance.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= 2`      | `rolling_covariance.rs:61` | Look-back window of return pairs. `< 2` errors with `Error::InvalidPeriod`. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/rolling_covariance.rs`:

```rust
use wickra::{Indicator, RollingCovariance};
// RollingCovariance: Input = (f64, f64), Output = f64
const _: fn(&mut RollingCovariance, (f64, f64)) -> Option<f64> =
    <RollingCovariance as Indicator>::update;
```

Python streams as `update(x, y) -> float | None` and batches over two
equal-length arrays. Node streams as `update(x, y)` and batches over `x[]`,
`y[]`.

## Warmup

`warmup_period() == period + 1`. The first level in each channel produces no
return, so a `period`-pair covariance needs one extra observation. The unit test
`accessors_and_metadata` pins `warmup_period() == 15` for `period = 14`;
`warmup_needs_period_plus_one` pins the first `Some` at the `period + 1`-th pair.

## Edge cases

- **Co-moving returns.** Two return streams that rise and fall together produce a
  positive covariance; offsetting streams a negative one.
- **Independent / flat returns.** When one channel has constant returns the
  covariance is `0`; pinned by the module's zero-covariance test.
- **Magnitude scales with volatility.** Doubling one channel's returns doubles
  the covariance — it is unnormalised by design.
- **Reset.** `reset()` clears the return window and the previous levels.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, RollingCovariance};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut rc = RollingCovariance::new(14)?;
    // y = 3*x with varying x -> positive return covariance.
    let pairs: Vec<(f64, f64)> = (0..40)
        .map(|t| {
            let x = 100.0 + (f64::from(t) * 0.7).sin();
            (x, 3.0 * x)
        })
        .collect();
    let last = rc.batch(&pairs).into_iter().flatten().last().unwrap();
    println!("{last:.6}");
    Ok(())
}
```

Output:

```
0.636114
```

### Python

```python
import numpy as np
import wickra as ta

t = np.arange(40)
x = 100.0 + np.sin(t * 0.7)
y = 3.0 * x
print(round(ta.RollingCovariance(14).batch(x, y)[-1], 6))
```

Output:

```
0.636114
```

### Node

```javascript
const ta = require('wickra');
const x = Array.from({ length: 40 }, (_, t) => 100 + Math.sin(t * 0.7));
const y = x.map((v) => 3 * v);
console.log(new ta.RollingCovariance(14).batch(x, y).at(-1).toFixed(6));
```

Output:

```
0.636114
```

## Interpretation

`RollingCovariance` is the term that sits inside almost every two-asset risk
calculation: portfolio variance `w₁²σ₁² + w₂²σ₂² + 2w₁w₂·cov`, the CAPM beta
`cov(a, m) / var(m)`, and the numerator of correlation. Track it directly when
you need the *magnitude* of co-movement, not just its sign — a covariance that
grows even as correlation stays flat means both legs got more volatile together.
When you want a scale-free number in `[−1, 1]`, normalise via
[RollingCorrelation](/Indicators/Indicator-RollingCorrelation).

## Common pitfalls

- **Not comparable across pairs.** Because covariance carries units, its raw
  magnitude cannot be compared between pairs with different volatilities — use
  correlation for that.
- **Population, not sample.** The estimator divides by `n`, not `n − 1`; for
  small windows the two conventions differ noticeably.

## References

The covariance is the second mixed central moment; see any statistics text,
e.g. Casella & Berger, *Statistical Inference*.

## See also

- [Indicator-RollingCorrelation](/Indicators/Indicator-RollingCorrelation) — the normalised version in `[−1, 1]`.
- [Indicator-Beta](/Indicators/Indicator-Beta) — `cov(a, b) / var(b)` on returns.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
