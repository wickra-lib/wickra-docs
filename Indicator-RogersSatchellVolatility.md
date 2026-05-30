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
| Default parameters | `period = 20`, `trading_periods = 252` (Python) |
| Warmup period | `period` |
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
`H >= max(O, L, C)` and `L <= min(O, H, C)`, which makes
`ln(H/.) >= 0` and `ln(L/.) <= 0`, so both products contribute
non-negative terms.

## Parameters

| Name              | Type    | Default | Valid range | Description |
|-------------------|---------|---------|-------------|-------------|
| `period`          | `usize` | `20`    | `>= 1`      | Rolling window of bars. |
| `trading_periods` | `usize` | `252`   | `>= 1`      | Annualisation factor. |

## Warmup

`warmup_period() == period`. First emit at the `period`-th bar.

## Edge cases

- **Zero-movement bars (`O == H == L == C`).** Every log term is zero;
  the estimator returns `0`.
- **Strong intraday trend.** Unlike Garman-Klass, the estimator stays
  unbiased — this is its defining advantage.
- **Overnight gaps.** Rogers-Satchell ignores close-to-open variance.
  For data with material gaps, use
  [YangZhangVolatility](Indicator-YangZhangVolatility), which adds an
  overnight term on top of Rogers-Satchell.

## Reference

- L. C. G. Rogers, S. E. Satchell and Y. Yoon, *Estimating the Volatility
  of Stock Prices: A Comparison of Methods that Use High and Low Prices*,
  *Applied Financial Economics*, vol. 4, 1994, pp. 241–247.

## See also

- [GarmanKlassVolatility](Indicator-GarmanKlassVolatility) — slightly
  more efficient but biased under drift.
- [YangZhangVolatility](Indicator-YangZhangVolatility) — adds overnight
  variance.
- [ParkinsonVolatility](Indicator-ParkinsonVolatility) — high-low only.
- [HistoricalVolatility](Indicator-HistoricalVolatility) —
  close-to-close baseline.
