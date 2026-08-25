# YangZhangVolatility

> Gold-standard OHLC realised-volatility estimator. Drift- and gap-robust
> convex combination of overnight, open-to-close and Rogers-Satchell
> variances.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Volatility & Bands |
| Input type | `Candle` (uses `open`, `high`, `low`, `close`, plus previous `close`) |
| Output type | `f64` |
| Output range | `[0, ∞)` (annualised percent) |
| Default parameters | `period = 20`, `trading_periods = 252` |
| Warmup period | `period + 1` |
| Interpretation | Annualised realised volatility, robust under drift and overnight gaps. |

## Formula

```
k         = 0.34 / (1.34 + (n + 1) / (n − 1))
σ²_on     = sample_var(ln(O_t / C_{t-1})           over `period` bars)   // overnight
σ²_oc     = sample_var(ln(C_t / O_t)               over `period` bars)   // open-to-close
σ²_rs     = mean(ln(H/C)·ln(H/O) + ln(L/C)·ln(L/O) over `period` bars)   // Rogers-Satchell
σ²_YZ     = σ²_on + k · σ²_oc + (1 − k) · σ²_rs
out       = √max(σ²_YZ, 0) · √trading_periods · 100
```

Yang & Zhang (2000) showed that the overnight, open-to-close and
Rogers-Satchell variances are independent under driftless GBM with overnight
gaps. Their convex combination has minimum estimation variance at exactly
the blending factor `k` above (derived analytically). The overnight and
open-to-close pieces use the **sample** variance (Bessel's correction,
divisor `n − 1`); the Rogers-Satchell piece uses the plain mean because its
per-bar sample is already an unbiased variance contributor. The configured
`k` is exposed via the `k()` accessor on the Rust type.

## Parameters

| Name              | Type    | Default | Constraint | Source |
|-------------------|---------|---------|------------|--------|
| `period`          | `usize` | `20`    | `>= 2`     | `YangZhangVolatility::new` (`yang_zhang.rs:81`) |
| `trading_periods` | `usize` | `252`   | `>= 1`     | `yang_zhang.rs:81` |

`period == 0` or `trading_periods == 0` return [`Error::PeriodZero`];
`period == 1` returns [`Error::InvalidPeriod`] (the sample variances need
`>= 2` samples). Python defaults come from
`#[pyo3(signature = (period=20, trading_periods=252))]`; the Node
constructor takes both arguments explicitly.

## Inputs / Outputs

```rust
use wickra::{Indicator, YangZhangVolatility, Candle};
// YangZhangVolatility: Input = Candle, Output = f64
const _: fn(&mut YangZhangVolatility, Candle) -> Option<f64> = <YangZhangVolatility as Indicator>::update;
```

- **Python.** `update(candle)` returns `float | None`;
  `batch(open, high, low, close)` returns an `array.array('d')` with
  `NaN` warmup.
- **Node.** `update(open, high, low, close)` returns `number | null`;
  `batch(open, high, low, close)` returns an `Array<number>` with `NaN`
  warmup.

## Warmup

`warmup_period()` returns `period + 1`. The first bar seeds `prev_close`
without emitting (the overnight term needs the previous close); the next
`period` bars fill the three rolling windows. The first ready value lands at
index `period` (the `(period + 1)`-th bar). Pinned by
`first_emission_at_warmup_period` (period 5 → warmup 6, first value at index 5).

## Edge cases

- **Zero-movement bars.** When every OHLC is the same constant, all three
  components are zero and the estimator returns `0` (test
  `zero_movement_yields_zero`).
- **Pure intraday data.** When `O_t == C_{t-1}` every bar (no gaps) and the
  open-to-close return is constant, the estimator collapses to
  `(1 − k) · Rogers-Satchell` (test `intraday_data_collapses_to_rs_only`).
- **Annualisation.** Same `√trading_periods · 100` convention as the other
  estimators; pinned by `annualisation_scales_by_sqrt_trading_periods`.
- **Reset.** `reset()` clears `prev_close`, all three windows and their
  running sums.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, YangZhangVolatility};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..40)
        .map(|i| {
            let base = 100.0 + f64::from(i);
            Candle::new(base, base + 2.0, base - 2.0, base + 0.5, 1.0, i64::from(i)).unwrap()
        })
        .collect();
    let mut yz = YangZhangVolatility::new(20, 252)?;
    println!("blend factor k = {:.4}", yz.k());
    println!("{:?}", yz.batch(&candles).into_iter().flatten().last());
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

yz = ta.YangZhangVolatility(20, 252)
out = yz.batch(open_, high, low, close)  # 1-D annualised-% series, NaN warmup
```

### Node

```javascript
const ta = require('wickra');
const yz = new ta.YangZhangVolatility(20, 252);
const v = yz.update(100, 102, 98, 100.5); // null during warmup, else annualised %
```

## Interpretation

Yang-Zhang is the most complete of the OHLC estimators — it is the one to
reach for by default on real exchange data:

1. **Robustness.** It is unbiased under both drift *and* overnight gaps,
   which the other three estimators each miss in some combination. On
   equities, futures and any market that does not trade 24/7, it is the
   recommended choice.
2. **Decomposition.** Because it is a weighted sum of overnight,
   open-to-close and Rogers-Satchell variances, you can reason about *which*
   regime is driving volatility (gap risk vs intraday range).

## Common pitfalls

- **Using it on pure crypto/FX intraday data with no gaps.** The overnight
  term is then zero and you pay for machinery you do not need —
  [RogersSatchellVolatility](/Indicators/Indicator-RogersSatchellVolatility) is simpler
  and equivalent there.
- **Expecting it before bar `period + 1`.** The extra `+ 1` over the other
  estimators is the seed bar for `prev_close`.

## References

- Dennis Yang & Qiang Zhang, *Drift-Independent Volatility Estimation Based
  on High, Low, Open, and Close Prices*, *The Journal of Business*, vol. 73,
  no. 3, 2000, pp. 477–491.

## See also

- [ParkinsonVolatility](/Indicators/Indicator-ParkinsonVolatility) — high-low only,
  ~5× efficient.
- [GarmanKlassVolatility](/Indicators/Indicator-GarmanKlassVolatility) — OHLC,
  ~7.4× efficient, biased under drift.
- [RogersSatchellVolatility](/Indicators/Indicator-RogersSatchellVolatility) — drift-free
  OHLC, ignores gaps.
- [HistoricalVolatility](/Indicators/Indicator-HistoricalVolatility) — close-to-close
  baseline.
