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
| Default parameters | `period = 20`, `trading_periods = 252` (Python) |
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

Yang & Zhang (2000) showed that overnight, open-to-close and
Rogers-Satchell variances are independent under driftless GBM with
overnight gaps. Their convex combination has minimum estimation
variance at exactly the blending factor `k` above (derived analytically
to minimise estimator variance).

The overnight and open-to-close pieces use the **sample** variance
(Bessel's correction, divisor `n − 1`), matching the convention of
[HistoricalVolatility](Indicator-HistoricalVolatility). The
Rogers-Satchell piece uses the plain mean because its per-bar sample is
already an unbiased variance contributor.

This is the recommended OHLC estimator for assets with both
close-to-open gaps and intraday drift: equities, futures, and any
market that does not trade continuously.

## Parameters

| Name              | Type    | Default | Valid range | Description |
|-------------------|---------|---------|-------------|-------------|
| `period`          | `usize` | `20`    | `>= 2`      | Rolling window of bars (sample variance needs `>= 2`). |
| `trading_periods` | `usize` | `252`   | `>= 1`      | Annualisation factor. |

`period == 1` returns `Error::InvalidPeriod` (Bessel correction is
undefined). `period == 0` or `trading_periods == 0` return
`Error::PeriodZero`.

## Warmup

`warmup_period() == period + 1`. The first bar seeds `prev_close`
without emitting; the next `period` bars fill the three rolling
windows. The first ready Yang-Zhang value lands at index `period` (the
`(period + 1)`-th bar).

## Edge cases

- **Zero-movement bars.** When every OHLC is the same constant, every
  sub-component is zero and the estimator returns `0`.
- **Pure intraday data.** When `O_t == C_{t-1}` every bar (no gaps),
  the overnight variance is zero. When the open-to-close return is
  also constant, the open-close variance is zero too, and the estimator
  collapses to `(1 − k) · Rogers-Satchell`. This is the
  `intraday_data_collapses_to_rs_only` unit test.
- **Annualisation.** Same convention as Parkinson / Garman-Klass /
  Rogers-Satchell.

## Reference

- Dennis Yang and Qiang Zhang, *Drift-Independent Volatility Estimation
  Based on High, Low, Open, and Close Prices*, *The Journal of
  Business*, vol. 73, no. 3, 2000, pp. 477–491.

## See also

- [ParkinsonVolatility](Indicator-ParkinsonVolatility) — high-low only,
  ~5× efficient.
- [GarmanKlassVolatility](Indicator-GarmanKlassVolatility) — OHLC,
  ~7.4× efficient, biased under drift.
- [RogersSatchellVolatility](Indicator-RogersSatchellVolatility) —
  drift-free OHLC, ignores gaps.
- [HistoricalVolatility](Indicator-HistoricalVolatility) —
  close-to-close baseline.
