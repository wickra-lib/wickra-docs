# WaveTrend

> LazyBear's Wave Trend Oscillator — a two-line mean-reverting
> momentum gauge built from the typical price and three cascaded
> EMAs. Most useful at extremes (`> +60`, `< -60`) where the `wt1`
> line crossing back through `wt2` flags reversals.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trend & Directional |
| Input type | `Candle` (uses `high`, `low`, `close` to form the typical price `ap`) |
| Output type | `WaveTrendOutput { wt1, wt2 }` |
| Output range | unbounded; typically `[-100, +100]` in practice, with extremes around `±60` flagged as overbought / oversold |
| Default parameters | `(channel = 10, average = 21, signal = 4)` (`WaveTrend::classic()`) |
| Warmup period | `2 · channel + average + signal − 3` (42 for the classic defaults) |
| Interpretation | `wt1` crosses above `wt2` from below `-60` = bullish; crosses below `wt2` from above `+60` = bearish. |

## Formula

```
ap_t  = (high_t + low_t + close_t) / 3
esa_t = EMA(ap, channel)
d_t   = EMA(|ap − esa|, channel)
ci_t  = (ap_t − esa_t) / (0.015 · d_t)
wt1_t = EMA(ci, average)
wt2_t = SMA(wt1, signal)
```

On a perfectly flat market the SMA-seeded EMA introduces a single-ULP
drift between `ap` and `esa`, which would otherwise make the ratio
explode to `-1 / 0.015 = -66.67`. The implementation guards against
this with a price-scaled flat tolerance (`d <= 16 · EPSILON ·
max(|esa|, 1)` → `ci := 0`), so a fully motionless market reports
`(0, 0)` rather than the indeterminate ratio.

## Parameters

| Name              | Type    | Default (Python) | Valid range | Description |
|-------------------|---------|------------------|-------------|-------------|
| `channel_period`  | `usize` | `10`             | `>= 1`      | EMA length for `esa` and for the deviation EMA `d`. |
| `average_period`  | `usize` | `21`             | `>= 1`      | EMA length for the smoothed channel index `wt1`. |
| `signal_period`   | `usize` | `4`              | `>= 1`      | SMA length of `wt1` to produce `wt2`. |

## Interpretation

- **Crossover at extremes.** The canonical LazyBear signal is `wt1`
  crossing above `wt2` while both are in the oversold zone
  (`wt1 < -60`), and the mirror in the overbought zone (`wt1 > +60`).
- **Divergence.** Price making a new high while `wt1` does not is a
  classic momentum-divergence reversal cue.
- **Mid-range crossovers.** Crossovers without an extreme are weak;
  the indicator is intentionally mean-reverting.

## Reference

LazyBear, "Indicator: WaveTrend Oscillator [WT]" — TradingView Pine
script, 2014. The construction mirrors the typical-price-driven
Commodity Channel Index but applies an additional EMA smoothing on
top of the standard `0.015`-scaled deviation.

## See also

- [Cci](Indicator-Cci) — the typical-price oscillator WaveTrend
  generalises.
- [StochRsi](Indicator-StochRsi) — another bounded mean-reverting
  oscillator commonly paired with WaveTrend at extremes.
- [Warmup Periods](Warmup-Periods) — the
  `2 · channel + average + signal − 3` WaveTrend entry.
