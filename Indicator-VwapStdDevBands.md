# VwapStdDevBands

> Cumulative session VWAP with volume-weighted standard-deviation
> envelopes. The intraday equivalent of Bollinger Bands — close inside
> the bands is value-area trading; close outside is statistically
> unusual relative to the session's volume distribution.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Bands & Channels |
| Input type | `Candle` (uses `high`, `low`, `close`, `volume`) |
| Output type | `VwapStdDevBandsOutput { upper, middle, lower, stddev }` |
| Output range | unbounded; `lower ≤ middle ≤ upper`, `stddev ≥ 0` |
| Default parameters | `multiplier = 2.0` |
| Warmup period | `1` (first bar with non-zero volume) |
| Interpretation | Intraday value area. Reset at session boundaries. |

## Formula

```
tp_i        = typical_price(candle_i)         // (high + low + close) / 3
sum_v       = Σ volume_i
sum_pv      = Σ tp_i · volume_i
sum_p2v     = Σ tp_i² · volume_i
vwap        = sum_pv / sum_v
variance    = sum_p2v / sum_v − vwap²         // volume-weighted population variance
sigma       = sqrt(max(variance, 0))
upper/lower = vwap ± multiplier · sigma
```

The cumulative running sums make every update O(1) with no per-bar
replay, matching the streaming contract of [Vwap](Indicator-Vwap).
VWAP and its stddev bands are an *intraday-session* tool: call
[`Indicator::reset`] at the start of each session boundary so the
accumulators do not span the gap.

## Parameters

| Name         | Type  | Default | Valid range | Description |
|--------------|-------|---------|-------------|-------------|
| `multiplier` | `f64` | `2.0`   | finite, `> 0` | Stddev band width multiplier. |

## Edge cases

- **Zero volume.** The first bar with non-zero volume emits the first
  band; bars before then return `None`. A zero-volume bar mid-session
  is also skipped (the running sums do not move).
- **Constant typical price.** Volume-weighted variance is exactly zero
  and the bands collapse onto the VWAP line. A tiny negative variance
  from floating-point cancellation is clamped to zero before `sqrt`.

## Reference

- The standard intraday VWAP formula traces back to institutional
  execution algorithms. The volume-weighted *standard deviation*
  formulation is the natural extension and appears in most major
  charting packages (TradingView, ThinkOrSwim, Bookmap).

## See also

- [Vwap](Indicator-Vwap) — the centerline alone.
- [BollingerBands](Indicator-BollingerBands) — non-volume-weighted
  equivalent.
