# PairSpreadZScore

> The standardised log-spread `ln(a) − β·ln(b)` of two assets, where `β` is
> a rolling-OLS hedge ratio and the spread is z-scored over its own
> look-back. The canonical mean-reversion / statistical-arbitrage entry
> signal for a pair.

## Quick reference

| Item                | Value                                                   |
|---------------------|---------------------------------------------------------|
| Family              | Price Statistics                                        |
| Input type          | `(f64, f64)` — `(a, b)` price pair                       |
| Output type         | `f64` (z-score)                                         |
| Output range        | unbounded (typically `[-4, +4]`)                        |
| Default parameters  | `beta_period = 20`, `z_period = 20` (each `>= 2`)       |
| Warmup period       | `beta_period + z_period − 1`                            |
| Interpretation      | Pair richness / cheapness                               |

## Formula

```
x = ln(b),  y = ln(a)
β = cov(x, y) / var(x)        rolling OLS over `beta_period`
s = y − β·x                   the spread (residual against the origin)
z = (s − mean_s) / std_s      standardised over `z_period`
```

Each `update` is O(1) via running sums for the regression and the spread
moments. See `crates/wickra-core/src/indicators/pair_spread_zscore.rs`.

## Parameters

| Name          | Type    | Default | Constraint | Description |
|---------------|---------|---------|------------|-------------|
| `beta_period` | `usize` | `20`    | `>= 2`     | Hedge-ratio look-back. |
| `z_period`    | `usize` | `20`    | `>= 2`     | Spread standardisation look-back. |

## Inputs / Outputs

`Indicator<Input = (f64, f64), Output = f64>`. Feed positive prices `(a, b)`.
Python: `PairSpreadZScore(beta_period, z_period).batch(a, b)` → 1-D
`np.ndarray` with `NaN` warmup. Node and WASM expose `update(a, b)`.

## Warmup

`warmup_period() == beta_period + z_period − 1` — `beta_period` samples to
define `β` (and the first spread), then `z_period − 1` more to fill the
spread window.

## Edge cases

- **Flat `ln(b)` window.** `var(x) = 0`; `β` falls back to `0`, so the
  spread reduces to `ln(a)`.
- **Flat spread window.** Zero dispersion ⇒ z-score is `0.0`, not NaN.
- **Bad tick.** A non-positive or non-finite price is skipped without
  disturbing either window.

## Examples

### Rust

```rust
use wickra::{Indicator, PairSpreadZScore};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut z = PairSpreadZScore::new(30, 30)?;
    for t in 0..120 {
        let b = 100.0 + (f64::from(t) * 0.1).sin();
        let a = 2.0 * b + 0.5 * (f64::from(t) * 0.3).sin(); // cointegrated
        if let Some(score) = z.update((a, b)) {
            // |score| large ⇒ spread is stretched, candidate mean-reversion entry
            let _ = score;
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
b = 100.0 + np.sin(t * 0.1)
a = 2.0 * b + 0.5 * np.sin(t * 0.3)
z = ta.PairSpreadZScore(30, 30).batch(a, b)  # z-score of the spread
```

### Node

```javascript
const wickra = require('wickra');
const z = new wickra.PairSpreadZScore(30, 30);
// z.update(a, b)
```

## Interpretation

- **z ≫ 0.** `a` is rich relative to `b` — sell the spread (short `a`,
  long `β` units of `b`).
- **z ≪ 0.** `a` is cheap — buy the spread.
- **z ≈ 0.** The pair is at its typical relationship.

## Common pitfalls

- **Non-cointegrated pairs.** The z-score is only tradeable if the spread
  actually mean-reverts — screen with [Cointegration](/Indicators/Indicator-Cointegration)
  first.
- **Window mismatch.** A `beta_period` much shorter than `z_period` makes
  the hedge ratio chase noise; keep them comparable unless you have a reason.

## See also

- [Cointegration](/Indicators/Indicator-Cointegration) — tests whether the spread is
  stationary at all.
- [PairwiseBeta](/Indicators/Indicator-PairwiseBeta) — return-space sensitivity.
- [ZScore](/Indicators/Indicator-ZScore) — single-series standardisation.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
