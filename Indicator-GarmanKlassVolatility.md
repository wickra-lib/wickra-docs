# GarmanKlassVolatility

> OHLC realised-volatility estimator. ~7.4× more statistically efficient
> than close-to-close stddev under driftless GBM, but biased when overnight
> drift is significant.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Volatility & Bands |
| Input type | `Candle` (uses `open`, `high`, `low`, `close`) |
| Output type | `f64` |
| Output range | `[0, ∞)` (annualised percent) |
| Default parameters | `period = 20`, `trading_periods = 252` |
| Warmup period | `period` (exact) |
| Interpretation | Annualised realised volatility blending range and body. |

## Formula

```
s_t   = 0.5 · (ln(H_t / L_t))² − (2·ln 2 − 1) · (ln(C_t / O_t))²
sigma = √max(mean(s_t over `period`), 0)
out   = sigma · √trading_periods · 100
```

Garman & Klass (1980) extended Parkinson's high-low estimator by adding an
open-to-close term, partially correcting the bias Parkinson picks up when
the closing price drifts within the bar. The open-to-close weight is the
constant `2·ln 2 − 1 ≈ 0.3863` (`GK_OC_COEFF` in the source). Under
driftless GBM the estimator is ~7.4× more statistically efficient than the
close-to-close stddev (Parkinson sits at ~5.0×).

The per-bar sample `s_t` can be marginally negative on narrow-range bars
with large open-to-close moves; this matches the original paper's algebra
and is handled by the `max(·, 0)` clamp on the rolling mean.

## Parameters

| Name              | Type    | Default | Constraint | Source |
|-------------------|---------|---------|------------|--------|
| `period`          | `usize` | `20`    | `>= 1`     | `GarmanKlassVolatility::new` (`garman_klass.rs:74`) |
| `trading_periods` | `usize` | `252`   | `>= 1`     | `garman_klass.rs:74` |

Either parameter `== 0` returns [`Error::PeriodZero`]. Python defaults come
from `#[pyo3(signature = (period=20, trading_periods=252))]`; the Node
constructor takes both arguments explicitly.

## Inputs / Outputs

```rust
impl Indicator for GarmanKlassVolatility {
    type Input  = Candle;
    type Output = f64;
    fn update(&mut self, candle: Candle) -> Option<f64>;
}
```

- **Python.** `update(candle)` returns `float | None`;
  `batch(open, high, low, close)` returns a 1-D `float64` `np.ndarray` with
  `NaN` warmup.
- **Node.** `update(open, high, low, close)` returns `number | null`;
  `batch(open, high, low, close)` returns an `Array<number>` with `NaN`
  warmup.

## Warmup

`warmup_period()` returns `period`; the first output lands on bar `period`
(index `period − 1`). Pinned by `first_emission_at_warmup_period`
(period 5: bars 1–4 return `None`, bar 5 emits).

## Edge cases

- **Zero-movement bars (`O == H == L == C`).** Both log terms are zero; the
  estimator returns `0` (test `zero_movement_yields_zero`).
- **Constant bar shape.** Identical OHLC ratios give a constant output
  (test `constant_bar_shape_yields_constant_sigma`).
- **Drift bias.** Unbiased only under driftless GBM. For data with
  significant overnight drift (gaps), use
  [YangZhangVolatility](Indicator-YangZhangVolatility) instead.
- **Reset.** `reset()` clears the window, running sum and last value.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, GarmanKlassVolatility, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..40)
        .map(|i| {
            let base = 100.0 + f64::from(i);
            Candle::new(base, base + 2.0, base - 2.0, base + 0.5, 1.0, i64::from(i)).unwrap()
        })
        .collect();
    let mut gk = GarmanKlassVolatility::new(20, 252)?;
    println!("{:?}", gk.batch(&candles).into_iter().flatten().last());
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

gk = ta.GarmanKlassVolatility(20, 252)
out = gk.batch(open_, high, low, close)  # 1-D annualised-% series, NaN warmup
```

### Node

```javascript
const ta = require('wickra');
const gk = new ta.GarmanKlassVolatility(20, 252);
const v = gk.update(100, 102, 98, 100.5); // null during warmup, else annualised %
```

## Interpretation

Garman-Klass squeezes more information out of each bar than a close-to-close
stddev by combining the high-low range with the open-to-close body:

1. **Efficiency.** For the same statistical confidence it needs roughly a
   seventh of the samples a close-to-close estimator would — useful when you
   want a responsive volatility read from limited history.
2. **When to prefer it.** Best on near-continuous intraday data with little
   overnight drift. On trending or gappy data its bias shows; reach for
   [RogersSatchellVolatility](Indicator-RogersSatchellVolatility) (drift) or
   [YangZhangVolatility](Indicator-YangZhangVolatility) (gaps) instead.

## Common pitfalls

- **Applying it to trending markets.** A persistent drift biases the
  open-to-close term; Garman-Klass is a driftless-GBM estimator.
- **Reading the negative intermediate samples as a bug.** Individual `s_t`
  can be slightly negative by design; only the clamped rolling mean is taken
  to the square root.

## References

- Mark B. Garman & Michael J. Klass, *On the Estimation of Security Price
  Volatilities from Historical Data*, *The Journal of Business*, vol. 53,
  no. 1, 1980, pp. 67–78.

## See also

- [ParkinsonVolatility](Indicator-ParkinsonVolatility) — high-low only.
- [RogersSatchellVolatility](Indicator-RogersSatchellVolatility) — drift-free
  OHLC alternative.
- [YangZhangVolatility](Indicator-YangZhangVolatility) — adds overnight
  variance; recommended for data with gaps.
- [HistoricalVolatility](Indicator-HistoricalVolatility) — close-to-close
  baseline.
