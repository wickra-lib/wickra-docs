# AccelerationBands

> Price Headley's momentum-biased band: the upper and lower envelopes
> widen with the bar's relative range `(H − L) / (H + L)`, so impulsive
> bars flare the bands while quiet bars compress them.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Bands & Channels |
| Input type | `Candle` (uses `high`, `low`, `close`) |
| Output type | `AccelerationBandsOutput { upper, middle, lower }` |
| Output range | unbounded; `lower ≤ middle ≤ upper` (on non-degenerate input) |
| Default parameters | `period = 20`, `factor = 0.001` |
| Warmup period | `period` |
| Interpretation | Breakout-style. Headley enters on closes outside the band; exits on a tag of the middle. |

## Formula

```
ratio    = (high − low) / (high + low)
raw_up   = high · (1 + factor · ratio)
raw_lo   = low  · (1 − factor · ratio)
upper    = SMA(raw_up, period)
middle   = SMA(close,  period)
lower    = SMA(raw_lo, period)
```

`ratio` is a *fractional* range measure, so the literal `factor` for
intraday equity markets is small (`~0.001` in Headley's reference
publication). On crypto and other higher-volatility assets traders
typically raise it to `0.01`–`0.05`.

## Parameters

| Name     | Type    | Default | Valid range | Description |
|----------|---------|---------|-------------|-------------|
| `period` | `usize` | `20`    | `>= 1`      | SMA window applied to all three component series. |
| `factor` | `f64`   | `0.001` | finite, `> 0` | Multiplicative gain on the per-bar `ratio` term. |

`AccelerationBands::classic()` returns `(20, 0.001)`.

## Edge cases

- **Flat market.** When `high == low` the `ratio` is zero, so `raw_up == high`,
  `raw_lo == low`, and all three SMAs converge to the same constant. Bands
  collapse onto the middle line.
- **Zero-price bar.** A degenerate bar with `high + low == 0` collapses the
  ratio to zero rather than emitting NaN (the constructor never allows this
  with real data, but the guard keeps fuzz inputs well-behaved).

## Reference

- Price Headley, *Big Trends in Trading: Strategies to Master Major
  Market Moves*, Wiley, 2002. The "Acceleration Bands" chapter
  describes the original setup.

## See also

- [BollingerBands](Indicator-BollingerBands) — sigma-driven width.
- [Keltner](Indicator-Keltner) — ATR-driven width with EMA centerline.
- [StarcBands](Indicator-StarcBands) — SMA-centerline + ATR sibling.
