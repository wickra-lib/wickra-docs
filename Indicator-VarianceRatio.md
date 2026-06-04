# VarianceRatio

> The Lo–MacKinlay variance-ratio test on the spread `a − b` — does the spread
> mean-revert, random-walk, or trend?

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Statistics |
| Input type | `(f64, f64)` (a pair of prices `a`, `b`) |
| Output type | `f64` |
| Output range | `>= 0`; `1` is the random-walk null |
| Default parameters | `period`, `q` both required (`q >= 2`, `period >= q + 2`) |
| Warmup period | `period` |
| Interpretation | `VR < 1` mean reversion; `VR ≈ 1` random walk; `VR > 1` momentum / trend. |

## Formula

Each `update` forms the spread `sₜ = aₜ − bₜ` and compares the variance of
`q`-step changes against `q` times the variance of one-step changes:

```
rₜ    = sₜ − sₜ₋₁                                  (one-step changes)
VR(q) = Var(Σ of q consecutive r) / (q · Var(r))
```

Under a random walk the variance of returns grows linearly with the horizon, so
`VR(q) = 1`. Departures reveal autocorrelation structure:

* `VR(q) < 1` — **mean reversion** (negatively autocorrelated changes): the
  spread's moves partly cancel, the regime pairs traders exploit.
* `VR(q) ≈ 1` — a **random walk**: no exploitable structure.
* `VR(q) > 1` — **momentum / trending** (positively autocorrelated changes).

The estimator uses overlapping `q`-step windows. When the one-step changes have
zero variance (a flat spread) the ratio is undefined and the indicator returns
the null value `1`. The output is always `>= 0`.

Source: `crates/wickra-core/src/indicators/variance_ratio.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= q + 2`  | `variance_ratio.rs:66` | Look-back window of spreads. |
| `q`      | `usize` | none    | `>= 2`      | `variance_ratio.rs:66` | Aggregation horizon (number of steps). Bad parameters error with `Error::InvalidPeriod`. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/variance_ratio.rs`:

```rust
use wickra::{Indicator, VarianceRatio};
// VarianceRatio: Input = (f64, f64), Output = f64
const _: fn(&mut VarianceRatio, (f64, f64)) -> Option<f64> =
    <VarianceRatio as Indicator>::update;
```

Python streams as `update(a, b) -> float | None` and batches over two
equal-length arrays. Node streams as `update(a, b)` and batches over `a[]`,
`b[]`.

## Warmup

`warmup_period() == period`. The unit test `accessors_and_metadata` pins
`warmup_period() == 60` for `period = 60`; `warmup_returns_none` pins the first
`Some` at the `period`-th pair.

## Edge cases

- **Mean reversion.** An oscillating spread has negatively autocorrelated changes
  and `VR < 1`; pinned by `oscillating_spread_is_below_one`. Perfectly
  alternating changes drive `VR` to `0` (`alternating_changes_give_zero_ratio`).
- **Random walk / flat.** A flat spread has zero one-step variance, so the ratio
  is undefined and returns the null `1`; pinned by `flat_spread_returns_one`.
- **Non-negative.** The output is clamped to `>= 0`; pinned by
  `output_non_negative`.
- **Reset.** `reset()` clears the spread window.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, VarianceRatio};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut vr = VarianceRatio::new(60, 2)?;
    // High-frequency oscillating spread -> mean reversion -> VR < 1.
    let pairs: Vec<(f64, f64)> = (0..200)
        .map(|t| {
            let b = 100.0 + f64::from(t);
            (b + 2.0 * (f64::from(t) * 2.5).sin(), b)
        })
        .collect();
    let last = vr.batch(&pairs).into_iter().flatten().last().unwrap();
    println!("{last:.6}");
    Ok(())
}
```

Output:

```
0.201245
```

### Python

```python
import numpy as np
import wickra as ta

t = np.arange(200)
b = 100.0 + t
a = b + 2.0 * np.sin(t * 2.5)
print(round(ta.VarianceRatio(60, 2).batch(a, b)[-1], 6))
```

Output:

```
0.201245
```

### Node

```javascript
const ta = require('wickra');
const b = Array.from({ length: 200 }, (_, t) => 100 + t);
const a = b.map((bv, t) => bv + 2 * Math.sin(t * 2.5));
console.log(new ta.VarianceRatio(60, 2).batch(a, b).at(-1).toFixed(6));
```

Output:

```
0.201245
```

## Interpretation

The variance ratio is a formal test of the random-walk hypothesis on the spread.
A `VR` materially below `1` (here ~0.20) is strong evidence of mean reversion —
the spread's moves cancel over the horizon `q`, exactly the structure a
relative-value trade harvests. A `VR` above `1` warns of momentum: a fade would
be fighting the trend. Sweep `q` to see *at what horizon* the structure lives —
reversion at `q = 2` but not `q = 10` means the edge is short-lived. Pair with
[SpreadHurst](Indicator-SpreadHurst) for a second opinion on the regime.

## Common pitfalls

- **`1` is the null, not a measurement.** A flat spread also returns exactly `1`.
  Confirm with the spread's own variance before reading `1` as "random walk".
- **Horizon sensitivity.** `VR(q)` depends on `q`; reporting a single `q` hides
  the horizon structure. Scan several `q` values when screening.

## References

Lo, A. W. & MacKinlay, A. C. (1988), *Stock Market Prices Do Not Follow Random
Walks: Evidence from a Simple Specification Test*, Review of Financial Studies.

## See also

- [Indicator-SpreadHurst](Indicator-SpreadHurst) — a complementary regime classifier.
- [Indicator-OuHalfLife](Indicator-OuHalfLife) — reversion time scale.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
