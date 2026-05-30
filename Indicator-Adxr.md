# ADXR

> Wilder's Average Directional Movement Index Rating — the average of
> the current `ADX` and the `ADX` from `period − 1` bars ago. A more
> stable directional-strength reading than raw `ADX` itself, used to
> compare trend-strength across instruments.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trend & Directional |
| Input type | `Candle` |
| Output type | `f64` |
| Output range | `[0, 100]` |
| Default parameters | `period = 14` |
| Warmup period | `3 · period − 1` (41 for `period = 14`) |
| Interpretation | Lags ADX. Use for cross-instrument trend comparison or to filter ADX noise. |

## Formula

```
ADXR_t = (ADX_t + ADX_{t − (period − 1)}) / 2
```

The lookback length is the same `period` that feeds the underlying
[Adx](Indicator-Adx). Because the older ADX is `period − 1` bars stale,
ADXR responds more slowly than ADX. Wilder's original use was
ranking the strength of trends across symbols at a given point in
time, where a smoother metric was needed.

## Parameters

| Name     | Type    | Default | Valid range | Description |
|----------|---------|---------|-------------|-------------|
| `period` | `usize` | `14`    | `>= 1`      | Wilder smoothing period — same `period` feeds both the underlying ADX and the lookback. |

## Warmup

ADX itself needs `2 · period` candles before its first emission. The
ADXR lookback ring then needs another `period − 1` candles to fill, so
the first ADXR lands at input `3 · period − 1`. For `period = 14`
that's 41 candles.

## Edge cases

- **Strong unidirectional trend.** Once ADX saturates at 100, ADXR
  follows it to 100 (the average of two saturated values is also 100).
- **Flat market.** ADX is 0 throughout, ADXR is 0 throughout.

## Reference

J. Welles Wilder, *New Concepts in Technical Trading Systems*, Trend
Research, 1978 — introduced ADX, +DI, −DI, DX, and ADXR together with
their shared Wilder smoothing.

## See also

- [Adx](Indicator-Adx) — the directional-strength index ADXR averages.
- [Warmup Periods](Warmup-Periods) — the `3 · period − 1` ADXR entry.
