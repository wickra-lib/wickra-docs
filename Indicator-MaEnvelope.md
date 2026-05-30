# MaEnvelope

> SMA centerline with a fixed-percent envelope on each side. The oldest
> band-style overlay still in regular use, and the only one whose width is
> driven by price level rather than realised volatility.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Bands & Channels |
| Input type | `f64` (typically the close price) |
| Output type | `MaEnvelopeOutput { upper, middle, lower }` |
| Output range | unbounded; `lower ≤ middle ≤ upper` |
| Default parameters | `period = 20`, `percent = 0.025` (Python: `MaEnvelope(20, 0.025)`) |
| Warmup period | `period` |
| Interpretation | Mean-reversion envelope. Crossings often used for swing entries. |

## Formula

```
middle = SMA(period)
upper  = middle · (1 + percent)
lower  = middle · (1 − percent)
```

The band width is a fixed *multiplicative* offset around the moving
average, so it scales with price rather than realised volatility
(contrast Bollinger Bands' `2·k·σ` or Keltner's `2·k·ATR`). A 2.5 %
envelope is the chart-vendor default; trend traders sometimes raise it
to 5–10 %.

## Parameters

| Name      | Type    | Default | Valid range | Description |
|-----------|---------|---------|-------------|-------------|
| `period`  | `usize` | `20`    | `>= 1`      | SMA window. |
| `percent` | `f64`   | `0.025` | finite, `> 0` | Envelope half-width as a fraction (e.g. `0.025` for ±2.5 %). |

## Reference

Earliest chart-vendor publications from the 1960s; covered in Robert
Edwards & John Magee's *Technical Analysis of Stock Trends* (1948) as
the "trading band". No single canonical citation — the indicator is
older than the chart-software industry that named it.

## See also

- [BollingerBands](Indicator-BollingerBands) — volatility-driven width.
- [Keltner](Indicator-Keltner) — ATR-driven width.
- [Donchian](Indicator-Donchian) — pure rolling high/low.
