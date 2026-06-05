# SpreadAr1Coefficient

> The first-order autoregression coefficient `ρ` of the spread `a − b` — a
> direct measure of pairs cointegration / mean-reversion strength.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Statistics |
| Input type | `(f64, f64)` (a pair of prices `a`, `b`) |
| Output type | `f64` |
| Output range | unbounded; `0`–`1` for stationary spreads, `~1` at a unit root |
| Default parameters | `period` is required (`>= 3`) |
| Warmup period | `period` |
| Interpretation | `ρ → 0` strong mean reversion; `ρ → 1` random walk (not cointegrated); `ρ > 1` explosive. |

## Formula

Each `update` forms the spread `sₜ = aₜ − bₜ` and fits the AR(1) model over the
trailing window by ordinary least squares of the level on its own lag:

```
sₜ = ρ · sₜ₋₁ + c + εₜ
ρ  = cov(sₜ₋₁, sₜ) / var(sₜ₋₁)
```

`ρ` is the raw stationarity statistic many pairs-trading screens threshold on
directly. It is the complement of `OuHalfLife`: the OU
half-life is `−ln(2) / ln(ρ)` for `0 < ρ < 1`. When the spread is flat over the
window (`var(sₜ₋₁) = 0`) the slope is undefined and the indicator returns `0`.

Source: `crates/wickra-core/src/indicators/spread_ar1_coefficient.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= 3`      | `spread_ar1_coefficient.rs:60` | Look-back window of spreads. `< 3` errors with `Error::InvalidPeriod`. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/spread_ar1_coefficient.rs`:

```rust
use wickra::{Indicator, SpreadAr1Coefficient};
// SpreadAr1Coefficient: Input = (f64, f64), Output = f64
const _: fn(&mut SpreadAr1Coefficient, (f64, f64)) -> Option<f64> =
    <SpreadAr1Coefficient as Indicator>::update;
```

Python streams as `update(a, b) -> float | None` and batches over two equal-length
arrays. Node streams as `update(a, b)` and batches over `a[]`, `b[]`.

## Warmup

`warmup_period() == period`. The unit test `accessors_and_metadata` pins
`warmup_period() == 30` for `period = 30`; `warmup_returns_none` pins the first
`Some` at the `period`-th pair.

## Edge cases

- **Random walk.** A spread that grows by exactly 1 each bar has a unit root, so
  `ρ = 1`; pinned by `random_walk_spread_has_rho_near_one`.
- **Mean reversion.** A fast sinusoidal spread is stationary, so `0 < ρ < 1`;
  pinned by `mean_reverting_spread_has_rho_below_one`.
- **Flat spread.** A constant spread has zero level variance, so `ρ = 0`
  (undefined); pinned by `flat_spread_returns_zero`.
- **Reset.** `reset()` clears the spread window.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, SpreadAr1Coefficient};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut ar1 = SpreadAr1Coefficient::new(20)?;
    // Spread a - b grows by exactly 1 each bar -> unit root -> rho = 1.
    let pairs: Vec<(f64, f64)> =
        (0..40).map(|t| (2.0 * f64::from(t), f64::from(t))).collect();
    let last = ar1.batch(&pairs).into_iter().flatten().last().unwrap();
    println!("{:.6}", last);
    Ok(())
}
```

Output:

```
1.000000
```

### Python

```python
import numpy as np
import wickra as ta

a = np.array([2.0 * i for i in range(40)])
b = np.array([float(i) for i in range(40)])
print(round(ta.SpreadAr1Coefficient(20).batch(a, b)[-1], 6))
```

Output:

```
1.0
```

### Node

```javascript
const ta = require('wickra');
const a = Array.from({ length: 40 }, (_, i) => 2 * i);
const b = Array.from({ length: 40 }, (_, i) => i);
console.log(new ta.SpreadAr1Coefficient(20).batch(a, b).at(-1).toFixed(6));
```

Output:

```
1.000000
```

## Interpretation

Use `SpreadAr1Coefficient` to screen pairs for tradeability: `ρ` well below 1
means the spread mean-reverts and a stat-arb entry has an edge; `ρ` near 1 means
the spread wanders like a random walk and there is no reliable reversion. Pair
it with `OuHalfLife` (holding-period sizing) and
[PairSpreadZScore](/Indicators/Indicator-PairSpreadZScore) (entry/exit timing).

## Common pitfalls

- **Sign of the spread.** `ρ` is computed on `a − b`; swapping the inputs leaves
  `ρ` unchanged (the AR(1) coefficient is symmetric in the spread's sign), but
  downstream z-scores are not — keep the leg order consistent.
- **`ρ = 0` as a sentinel.** A flat spread also returns `0`; distinguish "strong
  reversion" from "degenerate flat" via the spread's own variance if needed.

## References

Roll's and Engle-Granger's cointegration framework; the AR(1) unit-root
intuition underlies the Augmented Dickey-Fuller test (Dickey & Fuller, 1979).

## See also

- [Indicator-Cointegration](/Indicators/Indicator-Cointegration) — ADF-style cointegration test.
- [Indicator-PairSpreadZScore](/Indicators/Indicator-PairSpreadZScore) — spread entry timing.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
