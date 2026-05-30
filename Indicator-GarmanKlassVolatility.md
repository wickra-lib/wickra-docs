# GarmanKlassVolatility

> OHLC realised-volatility estimator. ~7.4× more statistically
> efficient than close-to-close stddev under driftless GBM, but
> biased when overnight drift is significant.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Volatility & Bands |
| Input type | `Candle` (uses `open`, `high`, `low`, `close`) |
| Output type | `f64` |
| Output range | `[0, ∞)` (annualised percent) |
| Default parameters | `period = 20`, `trading_periods = 252` (Python) |
| Warmup period | `period` |
| Interpretation | Annualised realised volatility blending range and body. |

## Formula

```
s_t   = 0.5 · (ln(H_t / L_t))² − (2·ln 2 − 1) · (ln(C_t / O_t))²
sigma = √max(mean(s_t over `period`), 0)
out   = sigma · √trading_periods · 100
```

Garman & Klass (1980) extended Parkinson's high-low estimator by adding
an open-to-close term, partially correcting the bias Parkinson picks up
when the closing price drifts within the bar. Under a driftless GBM
the estimator is ~7.4× more statistically efficient than the
close-to-close stddev (Parkinson sits at ~5.0×).

The per-bar sample `s_t` can be marginally negative on narrow-range
bars with large open-to-close moves; this matches the original paper's
algebra and is handled by the `max(., 0)` clamp on the rolling mean.

## Parameters

| Name              | Type    | Default | Valid range | Description |
|-------------------|---------|---------|-------------|-------------|
| `period`          | `usize` | `20`    | `>= 1`      | Rolling window of bars. |
| `trading_periods` | `usize` | `252`   | `>= 1`      | Annualisation factor. |

## Warmup

`warmup_period() == period`. First emit at the `period`-th bar.

## Edge cases

- **Zero-movement bars (`O == H == L == C`).** Both log terms are
  zero; the estimator returns `0`.
- **Drift bias.** The estimator is unbiased only under driftless GBM.
  For data with significant overnight drift (gaps), use
  [YangZhangVolatility](Indicator-YangZhangVolatility) instead.
- **Annualisation.** Same convention as Parkinson / HistoricalVolatility.

## Reference

- Mark B. Garman and Michael J. Klass, *On the Estimation of Security
  Price Volatilities from Historical Data*, *The Journal of Business*,
  vol. 53, no. 1, 1980, pp. 67–78.

## See also

- [ParkinsonVolatility](Indicator-ParkinsonVolatility) — high-low only.
- [RogersSatchellVolatility](Indicator-RogersSatchellVolatility) —
  drift-free OHLC alternative.
- [YangZhangVolatility](Indicator-YangZhangVolatility) — adds overnight
  variance; recommended for data with gaps.
- [HistoricalVolatility](Indicator-HistoricalVolatility) —
  close-to-close baseline.
