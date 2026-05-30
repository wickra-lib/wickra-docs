# HurstChannel

> SMA centerline wrapped by the rolling high-low range. A simpler,
> range-based volatility envelope than Bollinger's stddev or Keltner's
> ATR.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Bands & Channels |
| Input type | `Candle` (uses `high`, `low`, `close`) |
| Output type | `HurstChannelOutput { upper, middle, lower }` |
| Output range | unbounded; `lower ≤ middle ≤ upper` |
| Default parameters | `period = 10`, `multiplier = 0.5` (inner channel) |
| Warmup period | `period` |
| Interpretation | Hurst-cycle "inner" / "outer" channel. Inner contains ~70 % of bars; outer (`multiplier ≈ 1.0`) contains nearly all. |

## Formula

```
middle = SMA(close, period)
range  = max(high, period) − min(low, period)
upper  = middle + multiplier · range
lower  = middle − multiplier · range
```

With `multiplier = 0.5` the channel reduces to a centerline that hugs
the midpoint of the corresponding [Donchian](Indicator-Donchian)
envelope. Bressert and Brian Millard's cycle-trading work commonly
uses an "inner" multiplier around `0.5` for short-term swings and an
"outer" multiplier near `1.0` for medium-term cycles.

## Parameters

| Name         | Type    | Default | Valid range | Description |
|--------------|---------|---------|-------------|-------------|
| `period`     | `usize` | `10`    | `>= 1`      | SMA + max/min window. |
| `multiplier` | `f64`   | `0.5`   | finite, `> 0` | Fraction of the rolling range used for band offset. |

## Reference

- Brian Millard, *Channel Analysis*, John Wiley & Sons, 1990.
- Walter Bressert's cycle work in *The Power of Oscillator/Cycle
  Combinations* (1991) for the inner/outer channel interpretation.

## See also

- [Donchian](Indicator-Donchian) — pure rolling high/low.
- [BollingerBands](Indicator-BollingerBands) — sigma-based dispersion.
- [Keltner](Indicator-Keltner) — ATR-based dispersion.
