# RogersSatchellVolatility

> Drift-free OHLC realised-volatility estimator. Exact under arbitrary
> Brownian drift — the drift component cancels algebraically.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Volatility & Bands |
| Input type | `Candle` (uses `open`, `high`, `low`, `close`) |
| Output type | `f64` |
| Output range | `[0, ∞)` (annualised percent) |
| Default parameters | `period = 20`, `trading_periods = 252` |
| Warmup period | `period` (exact) |
| Interpretation | Annualised realised volatility, unbiased under drift. |

## Formula

```
s_t   = ln(H_t / C_t) · ln(H_t / O_t) + ln(L_t / C_t) · ln(L_t / O_t)
sigma = √max(mean(s_t over `period`), 0)
out   = sigma · √trading_periods · 100
```

Rogers, Satchell & Yoon (1994) extended the Garman-Klass framework to
handle non-zero drift without introducing bias. The per-bar sample is
guaranteed non-negative by construction: `Candle::new` enforces
`H >= max(O, L, C)` and `L <= min(O, H, C)`, which makes `ln(H/·) >= 0`
and `ln(L/·) <= 0`, so both products contribute non-negative terms.

## Parameters

| Name              | Type    | Default | Constraint | Source |
|-------------------|---------|---------|------------|--------|
| `period`          | `usize` | `20`    | `>= 1`     | `RogersSatchellVolatility::new` (`rogers_satchell.rs:68`) |
| `trading_periods` | `usize` | `252`   | `>= 1`     | `rogers_satchell.rs:68` |

Either parameter `== 0` returns [`Error::PeriodZero`]. `trading_periods`
is the annualisation factor (`252` daily, `52` weekly, `12` monthly, `1`
for raw per-bar volatility). Python defaults come from
`#[pyo3(signature = (period=20, trading_periods=252))]`; the Node
constructor takes both arguments explicitly.

## Inputs / Outputs

```rust
use wickra::{Indicator, RogersSatchellVolatility, Candle};
// RogersSatchellVolatility: Input = Candle, Output = f64
const _: fn(&mut RogersSatchellVolatility, Candle) -> Option<f64> = <RogersSatchellVolatility as Indicator>::update;
```

- **Python.** `update(candle)` returns `float | None`;
  `batch(open, high, low, close)` returns an `array.array('d')` with
  `NaN` warmup.
- **Node.** `update(open, high, low, close)` returns `number | null`;
  `batch(open, high, low, close)` returns an `Array<number>` with `NaN`
  warmup.

## Warmup

`warmup_period()` returns `period`. The rolling mean of the per-bar samples
needs a full `period` window, so the first non-`None` output lands on bar
`period` (index `period − 1`). Pinned by `first_emission_at_warmup_period`
(period 5: bars 1–4 return `None`, bar 5 emits).

## Edge cases

- **Zero-movement bars (`O == H == L == C`).** Every log term is zero; the
  estimator returns `0` (test `zero_movement_yields_zero`).
- **Constant bar shape.** Identical OHLC ratios every bar give a constant
  output `√k · √trading_periods · 100` (test
  `constant_bar_shape_yields_constant_sigma`).
- **Strong intraday trend.** Unlike Garman-Klass, the estimator stays
  unbiased — this is its defining advantage.
- **Overnight gaps.** Rogers-Satchell ignores close-to-open variance. For
  data with material gaps, use
  [YangZhangVolatility](/Indicators/Indicator-YangZhangVolatility).
- **Reset.** `reset()` clears the window, running sum and last value.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, RogersSatchellVolatility};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..40)
        .map(|i| {
            let base = 100.0 + f64::from(i);
            // open, high, low, close, volume, ts
            Candle::new(base, base + 2.0, base - 2.0, base + 0.5, 1.0, i64::from(i)).unwrap()
        })
        .collect();
    let mut rs = RogersSatchellVolatility::new(20, 252)?;
    println!("{:?}", rs.batch(&candles).into_iter().flatten().last()); // annualised %
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

rs = ta.RogersSatchellVolatility(20, 252)
out = rs.batch(open_, high, low, close)  # 1-D annualised-% series, NaN warmup
```

### Node

```javascript
const ta = require('wickra');
const rs = new ta.RogersSatchellVolatility(20, 252);
const v = rs.update(100, 102, 98, 100.5); // null during warmup, else annualised %
```

## Interpretation

Rogers-Satchell answers "how volatile is this asset?" using the full bar
geometry, and crucially does so *without* being fooled by a steady trend:

1. **Level reading.** The output is an annualised volatility percentage —
   `30.0` means ≈ 30 % annualised. Compare it across regimes to gauge
   expansion/contraction.
2. **Drift immunity.** A strongly trending instrument inflates close-to-close
   and Garman-Klass estimates; Rogers-Satchell removes that bias, so it is
   the right choice for trending assets *without* overnight gaps.

## Common pitfalls

- **Using it on gappy data.** It ignores the close-to-open jump, so on
  equities/futures with overnight gaps it *under*-estimates true volatility —
  switch to [YangZhangVolatility](/Indicators/Indicator-YangZhangVolatility).
- **Forgetting the annualisation factor.** With `trading_periods = 252` the
  output is annualised; pass `1` if you want the raw per-bar figure.

## References

- L. C. G. Rogers, S. E. Satchell & Y. Yoon, *Estimating the Volatility of
  Stock Prices: A Comparison of Methods that Use High and Low Prices*,
  *Applied Financial Economics*, vol. 4, 1994, pp. 241–247.

## See also

- [GarmanKlassVolatility](/Indicators/Indicator-GarmanKlassVolatility) — slightly more
  efficient but biased under drift.
- [YangZhangVolatility](/Indicators/Indicator-YangZhangVolatility) — adds overnight
  variance.
- [ParkinsonVolatility](/Indicators/Indicator-ParkinsonVolatility) — high-low only.
- [HistoricalVolatility](/Indicators/Indicator-HistoricalVolatility) — close-to-close
  baseline.
