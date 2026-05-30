# AtrBands

> A close-anchored envelope of width `multiplier · ATR`. The standard
> volatility-targeting band traders use to set initial stop-loss and
> profit targets without waiting for a moving average to warm up.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Bands & Channels |
| Input type | `Candle` (uses `high`, `low`, `close` for ATR; `close` for the midline) |
| Output type | `AtrBandsOutput { upper, middle, lower }` |
| Output range | unbounded; `lower ≤ middle ≤ upper` |
| Default parameters | `period = 14`, `multiplier = 3.0` |
| Warmup period | `period` |
| Interpretation | Position-sizing band. Entry at the close sets a `multiplier · ATR` stop and the symmetric target. |

## Formula

```
upper  = close + multiplier · ATR(period)
middle = close
lower  = close − multiplier · ATR(period)
```

Unlike [Keltner](Indicator-Keltner) or [StarcBands](Indicator-StarcBands),
the centerline is the *raw close* rather than a smoothed average — the
band rides price tick-for-tick. This is the canonical bracket used in
volatility-targeting position-sizing rules (e.g. "risk 1 % of capital
per 2·ATR move").

## Parameters

| Name         | Type    | Default | Valid range | Description |
|--------------|---------|---------|-------------|-------------|
| `period`     | `usize` | `14`    | `>= 1`      | Wilder-ATR period. |
| `multiplier` | `f64`   | `3.0`   | finite, `> 0` | ATR band width multiplier. |

## Reference

The idiom "stop = entry ± N · ATR" predates any single publication;
J. Welles Wilder's *New Concepts in Technical Trading Systems* (1978)
introduced ATR itself, and Chuck LeBeau / David Lucas popularised the
stop-distance application in *Technical Traders Guide to Computer
Analysis of the Futures Markets* (1992).

## See also

- [Atr](Indicator-Atr) — the volatility scale used.
- [AtrTrailingStop](Indicator-AtrTrailingStop) — directional one-sided
  variant that ratchets only in favour of an open position.
- [SuperTrend](Indicator-SuperTrend) — band that flips sides on a close
  through the opposing rail.
