# RVIVolatility (Relative Volatility Index)

> Donald Dorsey's RSI-shaped volatility gauge. Same Wilder-smoothed
> "up vs down" ratio as RSI, but the per-bar sample is the rolling
> standard deviation of close, not the price difference.
>
> Named `RVIVolatility` to disambiguate from the *Relative Vigor Index*
> (also Donald Dorsey, also abbreviated RVI), which ships in the
> Momentum family under the shorter [`RVI`](Indicator-Rvi) name.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Volatility & Bands |
| Input type | `f64` (single close) |
| Output type | `f64` |
| Output range | `[0, 100]` (saturates at the extremes) |
| Default parameters | `period = 10` (Python) |
| Warmup period (`warmup_period()`) | `2 · period − 1` |
| Interpretation | Volatility *direction*. `> 50` = up-bars are more volatile, `< 50` = down-bars are. |

## Formula

```
sd_t      = stddev_pop(close over `period`)
up_t      = sd_t   if close_t > close_{t-1}, else 0
down_t    = sd_t   if close_t < close_{t-1}, else 0
AvgUp_t   = Wilder(up,   `period`)         // EMA with alpha = 1 / period
AvgDown_t = Wilder(down, `period`)
RVI_t     = 100 · AvgUp_t / (AvgUp_t + AvgDown_t)
```

The "down" samples carry the rolling standard deviation when price
*fell* since the previous bar; "up" samples carry it when price *rose*.
A pure uptrend has zero "down" samples and saturates at `100`; a pure
downtrend saturates at `0`. A completely flat series has both averages
at zero and falls back to `50`, the same undefined-RS convention as
`RSI`.

## Parameters

| Name     | Type    | Default | Valid range | Description |
|----------|---------|---------|-------------|-------------|
| `period` | `usize` | `10`    | `>= 2`      | Stddev window length and Wilder smoothing constant. |

`period == 1` returns `Error::InvalidPeriod` (a 1-bar stddev is always
zero and would never produce a meaningful reading).

## Warmup

`warmup_period() == 2 · period − 1`. The first `period − 1` bars fill
the stddev window without emitting; the `period`-th bar produces the
first stddev sample (and the first up/down classification); another
`period − 1` bars are then needed to seed the Wilder averages. The two
phases overlap by exactly one bar, so the first ready value lands at
index `2 · period − 2` (the `(2·period − 1)`-th input).

For the default `period = 10`, the first emit is at index `18` (the
19th close).

## Edge cases

- **Flat series.** Both `AvgUp` and `AvgDown` collapse to zero;
  `ratio` returns `50`.
- **Pure trend.** A strictly monotone series classifies every stddev
  sample as up (or down) and saturates at `100` (or `0`).
- **Non-finite input.** `NaN` and `±∞` are ignored — state is left
  untouched and the previous value is returned (matches `StdDev` /
  `Rsi` / `HistoricalVolatility`).

## Reference

- Donald Dorsey, *Relative Volatility Index — A New Measure for
  Volatility*, *Technical Analysis of Stocks & Commodities*, June 1993.

## See also

- [Rvi](Indicator-Rvi) — the *other* Donald Dorsey RVI: Relative Vigor
  Index, a momentum indicator that lives in the Momentum family.
- [Rsi](Indicator-Rsi) — the same Wilder ratio applied to gain/loss
  instead of stddev.
- [StdDev](Indicator-StdDev) — the per-bar building block.
- [HistoricalVolatility](Indicator-HistoricalVolatility) — annualised
  level estimator, not a direction gauge.
