# PGO

> Pretty Good Oscillator — Mark Johnson's displacement of the close
> from its `period`-bar `SMA`, normalised by the `period`-bar `EMA` of
> the True Range.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Momentum Oscillators |
| Input type | `Candle` (uses `high`, `low`, `close`) |
| Output type | `f64` |
| Output range | unbounded; roughly "ATR-equivalents away from the SMA" |
| Default parameters | `period = 14` (Python) |
| Warmup period (`warmup_period()`) | `period` |
| Interpretation | `+3` cross is Johnson's long entry, `−3` cross his short entry. |

## Formula

```
PGO_t = (close_t − SMA(close, period)_t) / EMA(TR_t, period)
```

Numerator is positive when the close is above its mean of the last
`period` bars and negative when below. Denominator is the EMA-smoothed
True Range, so `PGO` is approximately "how many ATR-equivalents is
the close away from its mean?".

If the EMA of TR collapses to zero (a window of perfectly flat
candles) the indicator holds its previous value.

## Parameters

| Name     | Type    | Default | Valid range | Description |
|----------|---------|---------|-------------|-------------|
| `period` | `usize` | `14` (Python) | `>= 1` | Shared SMA and EMA lookback. `0` errors with `Error::PeriodZero`. |

## Warmup

`warmup_period() == period`. Both inner state machines reach readiness
at exactly `period` candles, so PGO emits at the same boundary.

## Reference

Mark Johnson, "Pretty Good Oscillator", *Stocks & Commodities*, 1995.
