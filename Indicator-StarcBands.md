# StarcBands

> Stoller Average Range Channel — an SMA(close) centerline with bands
> sized by ATR. Same skeleton as Keltner Channels but with an SMA midline
> instead of an EMA of typical price.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Bands & Channels |
| Input type | `Candle` (uses `high`, `low`, `close`) |
| Output type | `StarcBandsOutput { upper, middle, lower }` |
| Output range | unbounded; `lower ≤ middle ≤ upper` |
| Default parameters | `sma_period = 6`, `atr_period = 15`, `multiplier = 2.0` |
| Warmup period | `max(sma_period, atr_period)` |
| Interpretation | Swing levels. Stoller used wider SMA + ATR to pick larger swing targets than Keltner's reactive EMA midline. |

## Formula

```
middle = SMA(close, sma_period)
upper  = middle + multiplier · ATR(atr_period)
lower  = middle − multiplier · ATR(atr_period)
```

The SMA-of-close centerline is flatter and less reactive than Keltner's
EMA-of-typical-price, which is why Stoller's classic configuration
pairs a *short* SMA (6) with a *longer* ATR (15) — the midline tracks
the swing rather than the trend.

## Parameters

| Name         | Type    | Default | Valid range | Description |
|--------------|---------|---------|-------------|-------------|
| `sma_period` | `usize` | `6`     | `>= 1`      | Period for the SMA centerline. |
| `atr_period` | `usize` | `15`    | `>= 1`      | Wilder-ATR period. |
| `multiplier` | `f64`   | `2.0`   | finite, `> 0` | ATR band width multiplier. |

`StarcBands::classic()` returns `(6, 15, 2.0)`.

## Reference

- Manning Stoller, *STARC Bands*, originally published in *Technical
  Analysis of Stocks & Commodities*. The "ARC" stands for *Average
  Range Channel*; the leading "ST" is Stoller's initials.

## See also

- [Keltner](Indicator-Keltner) — EMA-of-typical-price centerline + ATR.
- [AtrBands](Indicator-AtrBands) — close-anchored (no SMA), pure
  volatility band.
- [BollingerBands](Indicator-BollingerBands) — sigma-based instead of
  ATR-based.
