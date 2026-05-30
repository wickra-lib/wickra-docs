# ElderImpulse

> Alexander Elder's Impulse System — tri-state momentum gauge combining
> the slope of an `EMA` trend filter with the slope of the `MACD`
> histogram.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Oscillators |
| Input type | `f64` (single close) |
| Output type | `f64` — one of `{−1, 0, +1}` |
| Output range | `{−1, 0, +1}` |
| Default parameters | `(ema_period = 13, macd = 12 / 26 / 9)` |
| Warmup period (`warmup_period()`) | `max(ema_period, macd_slow + macd_signal − 1) + 1` |
| Interpretation | `+1` green / buy, `−1` red / sell, `0` blue / neutral. |

## Formula

On each bar, after warmup:

```
ema_rising  = EMA(close, ema_period)_t > EMA(close, ema_period)_{t-1}
hist_rising = MACD.histogram_t        > MACD.histogram_{t-1}

if  ema_rising  and  hist_rising : Impulse =  +1
if  ema_falling and  hist_falling: Impulse =  −1
otherwise                        : Impulse =   0
```

The two branches are fed on every input so they warm up in parallel.
Judging direction needs one extra bar past the slowest branch.

## Parameters

| Name          | Type    | Default | Valid range | Description |
|---------------|---------|---------|-------------|-------------|
| `ema_period`  | `usize` | `13`    | `>= 1`      | Trend-filter EMA period. |
| `macd_fast`   | `usize` | `12`    | `>= 1`, `< macd_slow` | Inner MACD fast period. |
| `macd_slow`   | `usize` | `26`    | `>= 1`, `> macd_fast` | Inner MACD slow period. |
| `macd_signal` | `usize` | `9`     | `>= 1`      | Inner MACD signal period. |

## Reference

Alexander Elder, *Come Into My Trading Room*, 2002.
