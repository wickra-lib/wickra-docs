# EwmaVolatility

> EWMA Volatility — the RiskMetrics exponentially-weighted volatility of log
> returns, reacting instantly to a shock and forgetting it at rate `λ`.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Volatility & Bands |
| Input type | `f64` (single close) |
| Output type | `f64` |
| Output range | `[0, ∞)` (per-period volatility of log returns) |
| Default parameters | `(lambda = 0.94)` (Python) |
| Warmup period | `2` |
| Interpretation | Exponentially-weighted volatility; rises fast on a shock, decays at rate `λ`. |

## Formula

```
r_t  = ln(price_t / price_{t−1})
σ²_t = λ · σ²_{t−1} + (1 − λ) · r²_t
EWMA = √σ²_t
```

The decay factor `λ` weights the most recent squared return by `1 − λ`, the one
before it by `λ(1 − λ)`, and so on — a geometric kernel that never truncates.
This is the J.P. Morgan **RiskMetrics** one-parameter volatility model: the
standard daily decay is `λ = 0.94` (monthly `0.97`). No mean is subtracted —
squared returns *are* the variance contribution, matching the RiskMetrics
assumption of a zero conditional mean over short horizons.

Unlike [`HistoricalVolatility`](/Indicators/Indicator-HistoricalVolatility) — an
equally weighted, mean-centred, annualised sample standard deviation over a
fixed window — EWMA gives recent returns exponentially more weight, so it tracks
volatility clustering without a hard window edge. The recursion is seeded with
the first squared return (`σ²₁ = r²₁`). Source:
`crates/wickra-core/src/indicators/ewma_volatility.rs`.

## Parameters

| Name     | Type  | Default       | Valid range | Source | Description |
|----------|-------|---------------|-------------|--------|-------------|
| `lambda` | `f64` | `0.94` (Python) | `(0, 1)` open | `ewma_volatility.rs:62` | Decay factor. Larger `λ` = longer memory, smoother estimate. Non-finite or outside `(0, 1)` errors with `Error::InvalidParameter`. |

The `lambda` getter returns the configured decay; `value` returns the current
output if ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/ewma_volatility.rs`:

```rust
use wickra::{Indicator, EwmaVolatility};
// EwmaVolatility: Input = f64, Output = f64
const _: fn(&mut EwmaVolatility, f64) -> Option<f64> = <EwmaVolatility as Indicator>::update;
```

A single `f64` close in, an `Option<f64>` out. Python maps this to
`float | None` / `numpy.ndarray` (NaN warmup); Node to `number | null` /
`Array<number>` (NaN warmup).

## Warmup

`warmup_period() == 2`. The first log return needs a previous price; the
estimate is seeded from and emitted on that first return, so the first non-`None`
output lands on the second input (`first_emission_at_warmup_period` pins this).

## Edge cases

- **Constant series.** A flat price series has all log returns equal to `0`, so
  the EWMA variance — and the volatility — is `0.0` (`constant_series_yields_zero`
  pins this).
- **Non-positive prices.** A log return is undefined when a price is `<= 0`.
  Such ticks are **skipped**: the previous valid value is returned, the previous
  price and variance are left untouched, and the next real positive tick
  re-anchors against the previous valid price (`skips_non_positive_prices`,
  `skips_non_positive_before_first_price`).
- **Non-negative.** The output is `√` of a convex combination of squared
  returns and is never negative (`output_is_non_negative` pins this).
- **NaN / infinity inputs.** Non-finite inputs are silently dropped
  (`ignores_non_finite_input`).
- **Reset.** `ewma.reset()` clears the previous price, the variance and the last
  value (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, EwmaVolatility};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut ewma = EwmaVolatility::new(0.94)?;
    let out = ewma.batch(&[100.0, 110.0, 99.0]);
    println!("warmup_period = {}", ewma.warmup_period());
    println!("{out:?}");
    Ok(())
}
```

Output:

```
warmup_period = 2
[None, Some(0.09531017980432493), Some(0.0959428936787596)]
```

The seed reading `0.09531` is `|ln(110/100)|`; the next applies the decay:
`√(0.94·ln(1.1)² + 0.06·ln(0.9)²) = 0.09594`.

### Python

```python
import numpy as np
import wickra as ta

ewma = ta.EwmaVolatility()  # (lambda=0.94)
print(ewma.batch(np.array([100.0, 110.0, 99.0])))
print(ta.EwmaVolatility(0.94).batch(np.full(40, 100.0))[-1])  # flat -> 0
```

Output:

```
[       nan 0.09531018 0.09594289]
0.0
```

### Node

```javascript
const ta = require('wickra');

const ewma = new ta.EwmaVolatility(0.94);
console.log('warmupPeriod:', ewma.warmupPeriod());
console.log(ewma.batch([100.0, 110.0, 99.0]));
// -> [NaN, 0.09531017980432493, 0.0959428936787596]
```

### Streaming

```rust
use wickra::{Indicator, EwmaVolatility};

let mut ewma = EwmaVolatility::new(0.94).unwrap();
let mut last = None;
for p in [100.0, 110.0, 99.0, 105.0] {
    if let Some(v) = ewma.update(p) {
        last = Some(v);
    }
}
println!("{last:?}"); // Some(0.09413...) — the shock from the 99 tick decaying
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

EWMA volatility is the workhorse short-horizon volatility estimator in market
risk. Three common uses:

1. **Value-at-Risk / position sizing.** RiskMetrics built VaR on exactly this
   `λ = 0.94` recursion. Scale exposure inversely to the current EWMA: cut size
   as volatility rises.
2. **Volatility regime detection.** Because the kernel forgets at rate `λ`, a
   jump in returns lifts the estimate within a few bars and then decays — useful
   for flagging the onset and the fading of turbulent regimes.
3. **Comparing horizons.** Use a smaller `λ` for a snappier, noisier read and a
   larger `λ` for a smoother, slower one. The half-life of the kernel is
   `ln(0.5) / ln(λ)` bars (≈ 11 bars at `λ = 0.94`).

To annualise, multiply by `√trading_periods` yourself (the estimator is
per-period, like [`RealizedVolatility`](/Indicators/Indicator-RealizedVolatility)).

## Common pitfalls

- **`λ` near 1 over-smooths.** At `λ = 0.99` the estimate barely moves; at
  `λ = 0.5` it is almost pure squared-return noise. Stay near the RiskMetrics
  `0.94`/`0.97` unless you have a reason.
- **It is per-period, not annualised.** Unlike
  [`HistoricalVolatility`](/Indicators/Indicator-HistoricalVolatility) the output
  is *not* `×√252×100`. Annualise downstream if you need a percent figure.
- **The seed is a one-observation estimate.** The first reading equals `|r₁|`
  and is noisy; let the decay settle over a handful of bars before relying on it.

## References

J.P. Morgan / Reuters, *RiskMetrics — Technical Document*, 4th ed. (1996): the
exponentially-weighted moving-average variance with `λ = 0.94` (daily) and
`0.97` (monthly).

## See also

- [Indicator-HistoricalVolatility](/Indicators/Indicator-HistoricalVolatility) — equally weighted, annualised sample volatility.
- [Indicator-RealizedVolatility](/Indicators/Indicator-RealizedVolatility) — un-centred quadratic-variation volatility.
- [Indicator-Garch11](/Indicators/Indicator-Garch11) — adds a long-run-variance anchor (`ω`) to the EWMA recursion.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
