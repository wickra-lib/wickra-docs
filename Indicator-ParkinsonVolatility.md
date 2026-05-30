# ParkinsonVolatility

> High-low realised-volatility estimator. Roughly 5× more statistically
> efficient than close-to-close stddev under driftless Geometric
> Brownian Motion.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Volatility & Bands |
| Input type | `Candle` (uses `high`, `low`) |
| Output type | `f64` |
| Output range | `[0, ∞)` (annualised percent) |
| Default parameters | `period = 20`, `trading_periods = 252` (Python) |
| Warmup period | `period` |
| Interpretation | Annualised realised volatility from bar ranges. |

## Formula

```
sigma²  = (1 / (4n · ln 2)) · Σ_{i=1..n} (ln(H_i / L_i))²
sigma   = √sigma²
out     = sigma · √trading_periods · 100
```

Michael Parkinson (1980) observed that the *extreme range* of a bar
carries more variance information than its closing price alone — a wide
bar that closes near its open is far more volatile than a narrow bar
that happens to close at the same level. Under a driftless GBM,
Parkinson's estimator has roughly `1/5` the variance of the
close-to-close estimator: five close-to-close samples give the same
statistical efficiency as one Parkinson sample.

## Parameters

| Name              | Type    | Default | Valid range | Description |
|-------------------|---------|---------|-------------|-------------|
| `period`          | `usize` | `20`    | `>= 1`      | Rolling window of bars. |
| `trading_periods` | `usize` | `252`   | `>= 1`      | Annualisation factor (`252` daily, `52` weekly, `12` monthly, `1` for raw per-bar). |

Output is multiplied by `100` so it reads as a percent — `42.0` means
"42% annualised vol".

## Warmup

`warmup_period() == period`. The first `period − 1` bars only fill the
rolling window without emitting; the `period`-th bar produces the first
value.

## Edge cases

- **Zero-range bars (`H == L`).** `ln(H/L) = 0`, so the sample is `0`;
  a window of zero-range bars yields `0`.
- **Constant-range bars.** A series with identical `H/L` ratios yields
  a constant Parkinson value of `sqrt(factor · (ln H/L)²) · 100 ·
  sqrt(trading_periods)`.
- **Annualisation.** `trading_periods = 1` returns the raw per-bar
  `σ · 100`; otherwise the output scales by `sqrt(trading_periods)`.

## Reference

- Michael Parkinson, *The Extreme Value Method for Estimating the
  Variance of the Rate of Return*, *The Journal of Business*, vol. 53,
  no. 1, 1980, pp. 61–65.

## See also

- [HistoricalVolatility](Indicator-HistoricalVolatility) — the
  close-to-close baseline.
- [GarmanKlassVolatility](Indicator-GarmanKlassVolatility) — adds an
  open-to-close term; ~7.4× efficient.
- [RogersSatchellVolatility](Indicator-RogersSatchellVolatility) —
  drift-free OHLC estimator.
- [YangZhangVolatility](Indicator-YangZhangVolatility) — gold standard
  combining all three.
