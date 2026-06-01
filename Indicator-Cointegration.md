# Cointegration

> The Engle–Granger two-step screen for pairs trading: a rolling OLS hedge
> ratio `β`, the spread (residual) `a − (α + β·b)`, and an augmented
> Dickey–Fuller `t`-statistic on the spread. A strongly negative statistic
> flags a mean-reverting, tradeable spread.

## Quick reference

| Item                | Value                                                       |
|---------------------|-------------------------------------------------------------|
| Family              | Price Statistics                                            |
| Input type          | `(f64, f64)` — `(a, b)` price (or log-price) pair            |
| Output type         | `{ hedge_ratio: f64, spread: f64, adf_stat: f64 }`          |
| Output range        | `adf_stat` unbounded (more negative ⇒ more stationary)      |
| Default parameters  | `period = 30`, `adf_lags = 1`                              |
| Warmup period       | `period`                                                    |
| Interpretation      | Whether a pair is cointegrated (tradeable spread)          |

## Formula

```
β, α   = OLS of a on b over the window
spread = a − (α + β·b)
ADF    = t-statistic of ρ in   Δeₜ = ρ·eₜ₋₁ + Σ γᵢ·Δeₜ₋ᵢ + εₜ
         (no constant, no trend — the Engle–Granger residual form)
```

The hedge ratio is maintained from running sums; the spread series and the
small augmented regression (solved by Gaussian elimination) are recomputed
over the window each step — `O(period + adf_lags³)`. See
`crates/wickra-core/src/indicators/cointegration.rs`.

## Parameters

| Name       | Type    | Default | Constraint            | Description |
|------------|---------|---------|-----------------------|-------------|
| `period`   | `usize` | `30`    | `>= 2·adf_lags + 4`   | Look-back window. |
| `adf_lags` | `usize` | `1`     | `0` = plain DF        | Lagged differences in the ADF regression. |

## Inputs / Outputs

`Indicator<Input = (f64, f64), Output = CointegrationOutput>`. Python
`update(a, b)` returns `(hedge_ratio, spread, adf_stat)` or `None`;
`batch(a, b)` returns an `(n, 3)` array (`NaN` warmup). Node returns
`{ hedgeRatio, spread, adfStat }`; WASM the same object.

## Warmup

`warmup_period() == period`.

## Edge cases

- **Flat `b`.** No slope; the hedge ratio falls back to `0` and the spread
  becomes `a − mean(a)`.
- **Degenerate spread.** A zero-variance (perfectly cointegrated) spread
  makes the ADF regression singular; `adf_stat` is reported as `0.0`.
- **Critical values.** Compare `adf_stat` against the usual ADF/MacKinnon
  critical values (roughly `−2.9` at 5%); more negative ⇒ reject the unit
  root ⇒ cointegrated.

## Examples

### Rust

```rust
use wickra::{Cointegration, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut c = Cointegration::new(30, 1)?;
    for t in 0..120 {
        let b = 100.0 + f64::from(t);
        let a = 2.0 * b + 5.0 + 0.5 * (f64::from(t) * 0.7).sin(); // cointegrated
        if let Some(o) = c.update((a, b)) {
            // o.hedge_ratio ≈ 2, o.adf_stat strongly negative
            let _ = o;
        }
    }
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

t = np.arange(120)
b = 100.0 + t
a = 2.0 * b + 5.0 + 0.5 * np.sin(t * 0.7)
out = ta.Cointegration(30, 1).batch(a, b)
hedge, spread, adf = out[-1]      # adf < -2.9 ⇒ cointegrated
```

### Node

```javascript
const wickra = require('wickra');
const c = new wickra.Cointegration(30, 1);
const { hedgeRatio, spread, adfStat } = c.update(a, b) ?? {};
```

## Interpretation

- **`adf_stat` very negative.** The spread reverts to its mean — the pair is
  cointegrated and the spread is tradeable. Size the hedge with
  `hedge_ratio` and trade the `spread` (e.g. via
  [PairSpreadZScore](Indicator-PairSpreadZScore)).
- **`adf_stat` near 0.** The spread wanders like a random walk — no
  cointegration; do not trade it as mean-reverting.

## Common pitfalls

- **Look-back too short.** ADF needs degrees of freedom; `period` must be at
  least `2·adf_lags + 4`.
- **Levels vs log-levels.** Feeding log-prices makes the hedge ratio an
  elasticity and is common for cross-sectional pairs.

## References

- Engle, R. F. & Granger, C. W. J., *Co-integration and Error Correction*,
  *Econometrica*, 1987.

## See also

- [PairSpreadZScore](Indicator-PairSpreadZScore) — standardises the spread
  for entry/exit.
- [PairwiseBeta](Indicator-PairwiseBeta) — return-space sensitivity.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
