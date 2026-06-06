# ParkinsonVolatility

> High-low realised-volatility estimator. Roughly 5× more statistically
> efficient than close-to-close stddev under driftless Geometric Brownian
> Motion.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Volatility & Bands |
| Input type | `Candle` (uses `high`, `low`) |
| Output type | `f64` |
| Output range | `[0, ∞)` (annualised percent) |
| Default parameters | `period = 20`, `trading_periods = 252` |
| Warmup period | `period` (exact) |
| Interpretation | Annualised realised volatility from bar ranges. |

## Formula

```
sigma²  = (1 / (4n · ln 2)) · Σ_{i=1..n} (ln(H_i / L_i))²
sigma   = √sigma²
out     = sigma · √trading_periods · 100
```

Michael Parkinson (1980) observed that the *extreme range* of a bar carries
more variance information than its closing price alone — a wide bar that
closes near its open is far more volatile than a narrow bar that happens to
close at the same level. The normalisation constant `1 / (4·ln 2) ≈ 0.3607`
(`PARKINSON_FACTOR`) is evaluated once at `const`. Under driftless GBM,
Parkinson's estimator has roughly `1/5` the variance of the close-to-close
estimator.

## Parameters

| Name              | Type    | Default | Constraint | Source |
|-------------------|---------|---------|------------|--------|
| `period`          | `usize` | `20`    | `>= 1`     | `ParkinsonVolatility::new` (`parkinson.rs:70`) |
| `trading_periods` | `usize` | `252`   | `>= 1`     | `parkinson.rs:70` |

Either parameter `== 0` returns [`Error::PeriodZero`]. The output is
multiplied by `100` so it reads as a percent. Python defaults come from
`#[pyo3(signature = (period=20, trading_periods=252))]`; the Node
constructor takes both arguments explicitly.

## Inputs / Outputs

```rust
use wickra::{Indicator, ParkinsonVolatility, Candle};
// ParkinsonVolatility: Input = Candle, Output = f64
const _: fn(&mut ParkinsonVolatility, Candle) -> Option<f64> = <ParkinsonVolatility as Indicator>::update;
```

Only `high` and `low` are read, so both bindings take just those two series.

- **Python.** `update(candle)` returns `float | None`; `batch(high, low)`
  returns a 1-D `float64` `np.ndarray` with `NaN` warmup.
- **Node.** `update(high, low)` returns `number | null`; `batch(high, low)`
  returns an `Array<number>` with `NaN` warmup.

## Warmup

`warmup_period()` returns `period`. The first `period − 1` bars only fill
the rolling window; the `period`-th bar produces the first value. Pinned by
`first_emission_at_warmup_period` (period 5: bars 1–4 return `None`, bar 5
emits).

## Edge cases

- **Zero-range bars (`H == L`).** `ln(H/L) = 0`, so the sample is `0`; a
  window of zero-range bars yields `0` (test `zero_range_yields_zero`).
- **Constant-range bars.** Identical `H/L` ratios give a constant output
  `√(factor · (ln H/L)²) · √trading_periods · 100` (test
  `constant_range_yields_constant_sigma`).
- **Annualisation.** `trading_periods = 1` returns the raw per-bar `σ · 100`;
  otherwise the output scales by `√trading_periods`.
- **Reset.** `reset()` clears the window, running sum-of-squares and last
  value.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, ParkinsonVolatility};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..40)
        .map(|i| {
            let base = 100.0 + f64::from(i);
            Candle::new(base, base + 2.0, base - 2.0, base + 1.0, 1.0, i64::from(i)).unwrap()
        })
        .collect();
    let mut pv = ParkinsonVolatility::new(20, 252)?;
    println!("{:?}", pv.batch(&candles).into_iter().flatten().last());
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

pv = ta.ParkinsonVolatility(20, 252)
out = pv.batch(high, low)  # 1-D annualised-% series, NaN warmup
```

### Node

```javascript
const ta = require('wickra');
const pv = new ta.ParkinsonVolatility(20, 252);
const v = pv.update(102, 98); // null during warmup, else annualised %
```

## Interpretation

Parkinson is the simplest of the range-based volatility estimators — it uses
only the high-low spread:

1. **Level reading.** Annualised percent, comparable across regimes.
2. **Use and limits.** Cheaper (high/low only) and more efficient than
   close-to-close, but it ignores both the open-to-close body and overnight
   gaps, so it *under*-estimates volatility on trending or gappy data.
   [GarmanKlassVolatility](/Indicators/Indicator-GarmanKlassVolatility) adds the body;
   [YangZhangVolatility](/Indicators/Indicator-YangZhangVolatility) adds gaps.

## Common pitfalls

- **Using it where the open-to-close move matters.** Two bars with the same
  range but very different bodies get the same Parkinson reading — by
  construction.
- **Treating it as gap-aware.** It only sees within-bar range; overnight
  jumps are invisible to it.

## References

- Michael Parkinson, *The Extreme Value Method for Estimating the Variance of
  the Rate of Return*, *The Journal of Business*, vol. 53, no. 1, 1980,
  pp. 61–65.

## See also

- [HistoricalVolatility](/Indicators/Indicator-HistoricalVolatility) — close-to-close
  baseline.
- [GarmanKlassVolatility](/Indicators/Indicator-GarmanKlassVolatility) — adds an
  open-to-close term; ~7.4× efficient.
- [RogersSatchellVolatility](/Indicators/Indicator-RogersSatchellVolatility) — drift-free
  OHLC estimator.
- [YangZhangVolatility](/Indicators/Indicator-YangZhangVolatility) — gold standard
  combining all three.
