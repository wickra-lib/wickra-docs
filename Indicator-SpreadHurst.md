# SpreadHurst

> The Hurst exponent of the spread `a − b` over a rolling window — a regime
> detector for pairs trading.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Statistics |
| Input type | `(f64, f64)` (a pair of prices `a`, `b`) |
| Output type | `f64` (Hurst exponent `H`) |
| Output range | `~[0, 1]`; `0.5` is the random-walk midpoint |
| Default parameters | `period` is required (`>= 8`) |
| Warmup period | `period` |
| Interpretation | `H < 0.5` mean-reverting; `H ≈ 0.5` random walk; `H > 0.5` trending. |

## Formula

Each `update` forms the spread `sₜ = aₜ − bₜ` and estimates the Hurst exponent
`H` from how the variance of `τ`-lagged differences grows with the lag `τ`:

```
V(τ) = mean_t (s_{t+τ} − s_t)²   ∝   τ^(2H)
H    = slope of log V(τ) on log τ, divided by two
```

`H` classifies the spread's regime:

* `H < 0.5` — **mean-reverting** (anti-persistent): the spread snaps back, the
  regime pairs traders want.
* `H ≈ 0.5` — a **random walk**: no exploitable structure.
* `H > 0.5` — **trending** (persistent): the spread keeps diverging.

The fit uses lags `1..=period/4` (at least two). When the spread is flat — every
lagged difference is zero, so the log-regression has too few valid points — the
indicator returns the neutral midpoint `0.5`.

Source: `crates/wickra-core/src/indicators/spread_hurst.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= 8`      | `spread_hurst.rs:62` | Look-back window of spreads. `< 8` errors with `Error::InvalidPeriod` (the fit needs at least two lags). |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/spread_hurst.rs`:

```rust
use wickra::{Indicator, SpreadHurst};
// SpreadHurst: Input = (f64, f64), Output = f64
const _: fn(&mut SpreadHurst, (f64, f64)) -> Option<f64> =
    <SpreadHurst as Indicator>::update;
```

Python streams as `update(a, b) -> float | None` and batches over two
equal-length arrays. Node streams as `update(a, b)` and batches over `a[]`,
`b[]`.

## Warmup

`warmup_period() == period`. The unit test `accessors_and_metadata` pins
`warmup_period() == 40` for `period = 40`; `warmup_returns_none` pins the first
`Some` at the `period`-th pair.

## Edge cases

- **Oscillating spread.** A mean-reverting (anti-persistent) spread has
  `H < 0.5`; pinned by `oscillating_spread_is_anti_persistent`.
- **Trending spread.** A linearly diverging spread has `H ≈ 1`; pinned by
  `linear_trend_spread_is_persistent`.
- **Flat spread.** A constant spread yields the neutral midpoint `0.5`; pinned by
  `flat_spread_returns_midpoint`.
- **Reset.** `reset()` clears the spread window.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, SpreadHurst};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut h = SpreadHurst::new(60)?;
    // Mixed-frequency oscillating spread -> anti-persistent (H < 0.5).
    let pairs: Vec<(f64, f64)> = (0..200)
        .map(|t| {
            let b = 100.0 + f64::from(t);
            let tt = f64::from(t);
            (b + 3.0 * (tt * 0.8).sin() + 1.5 * (tt * 0.17).sin(), b)
        })
        .collect();
    let last = h.batch(&pairs).into_iter().flatten().last().unwrap();
    println!("{last:.6}");
    Ok(())
}
```

Output:

```
0.114399
```

### Python

```python
import numpy as np
import wickra as ta

t = np.arange(200)
b = 100.0 + t
a = b + 3.0 * np.sin(t * 0.8) + 1.5 * np.sin(t * 0.17)
print(round(ta.SpreadHurst(60).batch(a, b)[-1], 6))
```

Output:

```
0.114399
```

### Node

```javascript
const ta = require('wickra');
const b = Array.from({ length: 200 }, (_, t) => 100 + t);
const a = b.map((bv, t) => bv + 3 * Math.sin(t * 0.8) + 1.5 * Math.sin(t * 0.17));
console.log(new ta.SpreadHurst(60).batch(a, b).at(-1).toFixed(6));
```

Output:

```
0.114399
```

## Interpretation

`SpreadHurst` answers the prerequisite question of pairs trading: *is this
spread the kind that reverts?* An `H` well below `0.5` is a green light for a
mean-reversion entry; an `H` near or above `0.5` says the spread wanders or
trends and a fade will bleed. Use it as a regime gate ahead of a timing signal:
only arm [PairSpreadZScore](Indicator-PairSpreadZScore) or
[SpreadBollingerBands](Indicator-SpreadBollingerBands) when `H` confirms
anti-persistence, and size the holding period with
[OuHalfLife](Indicator-OuHalfLife).

## Common pitfalls

- **Short windows are noisy.** The log–log slope is fit from only `period/4`
  lags; small `period` gives a high-variance estimate. Prefer windows of several
  dozen bars or more.
- **`0.5` is the null, not a value.** A flat or degenerate spread returns exactly
  `0.5`. Treat values right at the midpoint with suspicion.

## References

Hurst, H. E. (1951), the rescaled-range analysis; the variance-of-differences
estimator follows the structure-function approach to `H`.

## See also

- [Indicator-OuHalfLife](Indicator-OuHalfLife) — reversion time scale once `H < 0.5`.
- [Indicator-VarianceRatio](Indicator-VarianceRatio) — a complementary mean-reversion test.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
