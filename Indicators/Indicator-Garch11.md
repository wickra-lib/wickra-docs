# Garch11

> GARCH(1,1) conditional volatility — the EWMA recursion plus a constant `ω`
> that anchors the estimate to a finite, mean-reverting long-run variance.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Volatility & Bands |
| Input type | `f64` (single close) |
| Output type | `f64` |
| Output range | `(0, ∞)` (strictly positive per-period volatility) |
| Default parameters | `(omega = 0.000002, alpha = 0.1, beta = 0.88)` (Python) |
| Warmup period | `2` |
| Interpretation | Mean-reverting conditional volatility of log returns. |

## Formula

```
r_t  = ln(price_t / price_{t−1})
σ²_t = ω + α · r²_{t−1} + β · σ²_{t−1}
out  = √σ²_t
```

GARCH(1,1) (Bollerslev 1986) generalizes the
[`EwmaVolatility`](/Indicators/Indicator-EwmaVolatility) recursion by adding the
constant `ω`. The three terms are the variance floor `ω`, the **ARCH** shock
`α · r²_{t−1}` (weight on the latest squared return), and the **GARCH**
persistence `β · σ²_{t−1}` (carry of the previous variance). The constant pins
the process to a finite **unconditional variance** `ω / (1 − α − β)`, so
volatility mean-reverts instead of drifting. Setting `ω = 0` and `α + β = 1`
recovers EWMA exactly. Source:
`crates/wickra-core/src/indicators/garch11.rs`.

## Parameters

| Name    | Type  | Default        | Valid range | Source | Description |
|---------|-------|----------------|-------------|--------|-------------|
| `omega` | `f64` | `0.000002` (Python) | `> 0` | `garch11.rs:74` | Constant variance floor. `<= 0` errors with `Error::InvalidParameter`. |
| `alpha` | `f64` | `0.1` (Python) | `>= 0` | `garch11.rs:74` | Weight on the latest squared return (ARCH term). |
| `beta`  | `f64` | `0.88` (Python) | `>= 0`, `alpha + beta < 1` | `garch11.rs:74` | Persistence of the previous variance (GARCH term). `alpha + beta >= 1` errors (covariance stationarity). |

`params` returns `(omega, alpha, beta)`; `unconditional_variance` returns
`ω / (1 − α − β)`; `value` returns the current output if ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/garch11.rs`:

```rust
use wickra::{Indicator, Garch11};
// Garch11: Input = f64, Output = f64
const _: fn(&mut Garch11, f64) -> Option<f64> = <Garch11 as Indicator>::update;
```

A single `f64` close in, an `Option<f64>` out. Python maps this to
`float | None` / `array.array('d')` (NaN warmup); Node to `number | null` /
`Array<number>` (NaN warmup).

## Warmup

`warmup_period() == 2`. The first log return needs a previous price; the estimate
is seeded with the unconditional variance and emitted on that first return
(`first_emission_is_unconditional` pins this).

## Edge cases

- **Seed = unconditional.** The first reading equals
  `√(ω / (1 − α − β))`, independent of the first return
  (`first_emission_is_unconditional` pins this).
- **Flat series → long-run, not zero.** With zero returns the `α` term vanishes
  and the variance mean-reverts to the fixed point `ω / (1 − β)` — the key
  difference from EWMA, which decays to `0`
  (`flat_series_converges_to_long_run` pins this).
- **Strictly positive.** Because `var = ω (> 0) + non-negative terms`, the output
  is always `> 0` (`output_is_strictly_positive` pins this).
- **Non-positive prices.** A log return is undefined when a price is `<= 0`;
  such ticks are **skipped**, state is left untouched, and the next valid tick
  re-anchors (`skips_non_positive_prices`,
  `skips_non_positive_before_first_price`).
- **NaN / infinity inputs.** Non-finite inputs are silently dropped
  (`ignores_non_finite_input`).
- **Reset.** `g.reset()` clears the previous price, the recursion state and the
  last value (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, Garch11};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut g = Garch11::new(0.002, 0.1, 0.85)?;
    let out = g.batch(&[100.0, 110.0, 99.0]);
    println!("unconditional = {}", g.unconditional_variance()); // 0.04
    println!("{out:?}");
    Ok(())
}
```

Output:

```
unconditional = 0.04
[None, Some(0.2), Some(0.19211559811070333)]
```

The seed `0.2` is `√0.04`; the next applies the recursion
`√(0.002 + 0.1·ln(1.1)² + 0.85·0.04) = 0.19212`.

### Python

```python
import numpy as np
import wickra as ta

g = ta.Garch11(0.002, 0.1, 0.85)
print(g.batch(np.array([100.0, 110.0, 99.0])))
print(ta.Garch11(0.002, 0.1, 0.85).batch(np.full(400, 100.0))[-1])  # -> long-run
```

Output:

```
[       nan 0.2        0.1921156 ]
0.11547005383792516
```

The flat-series limit is `√(0.002 / (1 − 0.85)) = √0.013333 = 0.11547`.

### Node

```javascript
const ta = require('wickra');

const g = new ta.Garch11(0.002, 0.1, 0.85);
console.log('warmupPeriod:', g.warmupPeriod());
console.log(g.batch([100.0, 110.0, 99.0]));
// -> [NaN, 0.2, 0.19211559811070333]
```

### Streaming

```rust
use wickra::{Indicator, Garch11};

let mut g = Garch11::new(0.000_002, 0.1, 0.88).unwrap();
let mut last = None;
for p in [100.0, 101.0, 99.5, 103.0, 98.0] {
    if let Some(v) = g.update(p) {
        last = Some(v);
    }
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

GARCH(1,1) is the canonical econometric volatility model. The persistence
`α + β` (close to `1` for most financial series, e.g. `0.98`) controls how
slowly a shock decays; the unconditional `ω / (1 − α − β)` is the level the
forecast reverts to. Common uses:

1. **Volatility forecasting.** The `h`-step-ahead variance forecast reverts
   geometrically from the current σ² toward the unconditional variance at rate
   `(α + β)` — the property EWMA lacks.
2. **Risk models.** GARCH conditional volatility feeds VaR and option-pricing
   work where a mean-reverting volatility term structure matters.
3. **Regime read.** A current σ far above `ω / (1 − α − β)` signals an
   elevated regime that is expected to subside.

The parameters are normally **fit** by maximum likelihood on a return sample;
this indicator takes them as given and runs the filter, so plug in estimates
from your calibration (typical equity daily: `α ≈ 0.05–0.15`, `β ≈ 0.8–0.9`).

## Common pitfalls

- **`α + β` near 1.** The closer to `1`, the slower the mean reversion and the
  larger the unconditional variance; `α + β = 1` is rejected (it is the
  non-stationary IGARCH boundary — use [`EwmaVolatility`](/Indicators/Indicator-EwmaVolatility) for that).
- **Per-period, not annualised.** Multiply by `√trading_periods` downstream for
  an annual figure.
- **Garbage parameters in, garbage out.** This is a filter, not an estimator —
  it does not fit `ω, α, β` for you.

## References

Bollerslev, T. (1986), "Generalized Autoregressive Conditional
Heteroskedasticity," *Journal of Econometrics* 31(3), 307–327.

## See also

- [Indicator-EwmaVolatility](/Indicators/Indicator-EwmaVolatility) — the `ω = 0`, `α + β = 1` special case.
- [Indicator-HistoricalVolatility](/Indicators/Indicator-HistoricalVolatility) — equally weighted annualised sample volatility.
- [Indicator-VolatilityOfVolatility](/Indicators/Indicator-VolatilityOfVolatility) — dispersion of the volatility series itself.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
