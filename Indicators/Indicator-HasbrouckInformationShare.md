# HasbrouckInformationShare

> Each venue's contribution to price discovery — Hasbrouck's (1995) information
> share of the first of two synchronised price series, estimated from a rolling
> vector error-correction model (VECM) and reported as the midpoint of the two
> Cholesky-ordering bounds.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Microstructure |
| Input type | `(f64, f64)` (two venue prices) |
| Output type | `f64` |
| Output range | `[0, 1]` (share of venue x) |
| Default parameters | `(period = 20)` (Python) |
| Warmup period | `period + 2` |
| Interpretation | `> 0.5` venue x leads price discovery; `< 0.5` follows. |

## Formula

```
p_t = (x_t, y_t),  β = (1, −1)                (one asset, two venues)
Δp_t = c + α · (x_{t−1} − y_{t−1}) + Γ · Δp_{t−1} + e_t,     Ω = Cov(e)
      (OLS of Δx_t and Δy_t on [1, x_{t−1} − y_{t−1}, Δx_{t−1}, Δy_{t−1}]
       over the trailing `period` observations)
ψ    ∝ α⊥ = (α_y, −α_x)                      (common long-run impact row)
F    = lower Cholesky factor of Ω, x ordered first
IS_x(first) = ([ψ·F]_x)² / (ψ·Ω·ψᵀ)           (upper bound for x)
IS_x(last)  = 1 − IS_y(first)                 (lower bound for x, y ordered first)
IS_x        = (IS_x(first) + IS_x(last)) / 2  ∈ [0, 1]
```

When the same instrument trades on multiple venues, Hasbrouck's information share
measures how much each contributes to the innovation variance of the common
efficient price. Wickra fits a one-lag VECM with the cointegrating vector fixed at
`β = (1, −1)`: each venue's price change is regressed (OLS, solved by Gaussian
elimination with partial pivoting) on a constant, the lagged spread
`x_{t−1} − y_{t−1}` and one lag of both price changes. The error-correction
loadings `α_x`, `α_y` give the common-trend weights `ψ ∝ (α_y, −α_x)`, and the
residual covariance `Ω` (divided by `n`) is split between the venues with a
Cholesky factorisation. Because the split depends on which venue is ordered first,
Hasbrouck's measure is a pair of bounds; Wickra reports their **midpoint**, the
usual point estimate (bounds are clamped to `[0, 1]`).

A venue that does **not** error-correct (`α ≈ 0` for it) is the one the other
venue adjusts toward — it leads price discovery and holds most of the share. Above
`0.5` = `x` leads. A degenerate window (flat prices, a singular regression, or no
error correction at all, so `ψ·Ω·ψᵀ` is not strictly positive) reports the
neutral `0.5`. Each `update` refits the window, O(`period`). Source:
`crates/wickra-core/src/indicators/hasbrouck_information_share.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `20` (Python) | `>= 6`      | `hasbrouck_information_share.rs:71` | Rolling window of VECM observations. `< 6` errors with `Error::InvalidPeriod` (the four-regressor VECM needs at least two residual degrees of freedom). |

The `period` getter returns the window.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/hasbrouck_information_share.rs`:

```rust
use wickra::{Indicator, HasbrouckInformationShare};
// HasbrouckInformationShare: Input = (f64, f64), Output = f64
const _: fn(&mut HasbrouckInformationShare, (f64, f64)) -> Option<f64> =
    <HasbrouckInformationShare as Indicator>::update;
```

A `(f64, f64)` price pair in, an `Option<f64>` out. The Python binding takes
`update(x, y)` and `batch(x[], y[])` (NaN warmup); Node mirrors `update(x, y)` /
`batch(...)`.

## Warmup

`warmup_period() == period + 2`. Two pairs seed the lagged level and the lagged
price change; each further pair adds one VECM observation, and the first value
lands once `period` observations fill the window (`warmup_needs_period_plus_two`
pins this).

## Edge cases

- **Leading venue holds the share.** When `y` follows `x` with a one-step lag,
  `x` holds more than `0.8` of the share, and swapping the venues drops it below
  `0.2` (`leading_venue_holds_the_share` pins this).
- **Bounded.** The reading stays in `[0, 1]` (`output_is_a_share` pins this).
- **Degenerate window → 0.5.** Flat prices, a singular regression or no error
  correction report the neutral `0.5` (`flat_series_is_half` pins this).
- **Period too small.** `period < 6` is rejected (`rejects_period_below_six`).
- **Non-finite input.** A `NaN` / `±inf` price returns `None` and is skipped
  without touching state (`non_finite_input_returns_none`).
- **Reset.** `h.reset()` clears the seeded prices and the observation window
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, HasbrouckInformationShare};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut h = HasbrouckInformationShare::new(20)?;
    // Venue x carries the news; venue y follows it one step later.
    let mut x = 100.0;
    let mut pairs: Vec<(f64, f64)> = Vec::new();
    for i in 0..60 {
        let prev_x = x;
        x += (f64::from(i) * 1.7).sin() + 0.3 * (f64::from(i) * 0.37).cos();
        pairs.push((x, prev_x + 0.05 * (f64::from(i) * 2.3).sin()));
    }
    println!("x share > 0.8: {}", h.batch(&pairs).last().unwrap().unwrap() > 0.8);
    Ok(())
}
```

Output:

```
x share > 0.8: true
```

### Python

```python
import numpy as np
import wickra as ta

h = ta.HasbrouckInformationShare(20)
i = np.arange(60)
# Venue x carries the news; venue y follows it one step later.
x = 100 + np.cumsum(np.sin(i * 1.7) + 0.3 * np.cos(i * 0.37))
y = np.concatenate(([100.0], x[:-1])) + 0.05 * np.sin(i * 2.3)
print(round(h.batch(x, y)[-1], 4))  # 0.9932 -> x leads
```

### Node

```javascript
const ta = require('wickra');
const h = new ta.HasbrouckInformationShare(20);
console.log('warmupPeriod:', h.warmupPeriod()); // 22
```

### Streaming

```rust
use wickra::{Indicator, HasbrouckInformationShare};

let mut h = HasbrouckInformationShare::new(20).unwrap();
let price_feed: Vec<(f64, f64)> = Vec::new(); // your live stream
for (venue_a, venue_b) in price_feed {
    if let Some(share) = h.update((venue_a, venue_b)) {
        // share > 0.5 -> venue_a is leading price discovery
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Lead/lag venue.** A persistent share above `0.5` identifies the price-leading
   market; route or hedge accordingly.
2. **Fragmentation monitoring.** Shifts in the share track changes in where price
   discovery happens (e.g. liquidity migrating venues).
3. **Spot vs. derivative.** Apply to a spot/futures pair to see which leads.

## Common pitfalls

- **Midpoint, not bounds.** Only the midpoint of the two Cholesky-ordering bounds is
  reported; when the venues' residuals are highly correlated the bounds can be far
  apart, so treat readings near `0.5` with caution.
- **Fixed cointegrating vector.** `β = (1, −1)` assumes both series quote the same
  asset in the same units; a persistent basis or a scaling difference (e.g. a
  futures multiplier) breaks that assumption.
- **Window length.** The VECM estimates 4 coefficients per equation; short windows
  (near the minimum `6`) give noisy, often extreme shares.
- **Synchronisation.** The two series must be aligned in time; stale quotes bias the
  share.
- **Same asset.** It assumes the two prices track one efficient price; unrelated
  series make the share meaningless.

## References

Hasbrouck, J. (1995), "One Security, Many Markets: Determining the Contributions to
Price Discovery", *Journal of Finance*.

## See also

- [Indicator-LeadLagCrossCorrelation](/Indicators/Indicator-LeadLagCrossCorrelation) — cross-correlation lead/lag.
- [Indicator-Cointegration](/Indicators/Indicator-Cointegration) — long-run price linkage.
- [Indicator-RollingCorrelation](/Indicators/Indicator-RollingCorrelation) — rolling return correlation.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
