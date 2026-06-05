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
replay, matching the streaming contract of [Vwap](/Indicators/Indicator-Vwap).
VWAP and its stddev bands are an *intraday-session* tool: call
[`reset()`](/Indicators/Indicator-Vwap) at the start of each session boundary so the
accumulators do not span the gap.

## Parameters

| Name         | Type  | Default | Constraint    | Source |
|--------------|-------|---------|---------------|--------|
| `multiplier` | `f64` | `2.0`   | finite, `> 0` | `VwapStdDevBands::new` (`vwap_stddev_bands.rs:66`) |

A non-finite or non-positive `multiplier` returns
[`Error::NonPositiveMultiplier`]. There is no period — the VWAP is
cumulative over the session. Python defaults come from
`#[pyo3(signature = (multiplier=2.0))]`; the Node constructor takes the
multiplier explicitly.

## Inputs / Outputs

```rust
use wickra::{Indicator, VwapStdDevBands, Candle, VwapStdDevBandsOutput};
// VwapStdDevBands: Input = Candle, Output = VwapStdDevBandsOutput
const _: fn(&mut VwapStdDevBands, Candle) -> Option<VwapStdDevBandsOutput> = <VwapStdDevBands as Indicator>::update;
```

- **Python streaming.** `update(candle)` returns
  `(upper, middle, lower, stddev)` or `None`.
- **Python batch.** `VwapStdDevBands.batch(high, low, close, volume)` returns
  an `(n, 4)` `np.ndarray` with columns `[upper, middle, lower, stddev]`;
  zero-volume warmup rows are `NaN`.
- **Node streaming.** `update(high, low, close, volume)` returns a
  `{ upper, middle, lower, stddev }` object or `null`.
- **Node batch.** `batch(high, low, close, volume)` returns a flat
  `Array<number>` of length `n * 4`.

## Warmup

`warmup_period()` returns `1`. The indicator emits as soon as cumulative
volume becomes non-zero — usually the first bar. Until then (`sum_v == 0`)
`update` returns `None`. Readiness is tracked by an internal `has_emitted`
flag set on the first emitting bar.

## Edge cases

- **Zero volume.** A bar with `volume == 0` does not move the running sums
  and returns `None` if it is the only bar seen so far (test
  `zero_volume_returns_none`); mid-session it is simply skipped.
- **Constant typical price.** Volume-weighted variance is exactly zero, so
  `stddev == 0` and the bands collapse onto the VWAP line. A tiny negative
  variance from floating-point cancellation is clamped to `0` before `sqrt`
  (test `constant_price_collapses_bands`).
- **Ordering.** `upper >= middle >= lower` always holds (`sigma >= 0`).
- **Reset.** `reset()` zeroes all accumulators and clears `has_emitted` —
  call it at each session boundary.

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, VwapStdDevBands};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Two equal-volume bars at typical prices 8 and 12.
    let mut v = VwapStdDevBands::new(1.5)?;
    let _ = v.update(Candle::new(8.0, 8.0, 8.0, 8.0, 1.0, 0)?);
    let o = v.update(Candle::new(12.0, 12.0, 12.0, 12.0, 1.0, 1)?).unwrap();
    println!("vwap={} sigma={} upper={} lower={}", o.middle, o.stddev, o.upper, o.lower);
    Ok(())
}
```

Output:

```
vwap=10 sigma=2 upper=13 lower=7
```

VWAP `= (8 + 12)/2 = 10`; volume-weighted variance `= (64 + 144)/2 − 100 = 4`,
so `sigma = 2` and the bands sit at `10 ± 1.5·2 = {13, 7}` (test
`reference_values`).

### Python

```python
import numpy as np
import wickra as ta

v = ta.VwapStdDevBands(1.5)
high   = np.array([8.0, 12.0])
low    = np.array([8.0, 12.0])
close  = np.array([8.0, 12.0])
volume = np.array([1.0, 1.0])
print(v.batch(high, low, close, volume)[-1])  # [13. 10.  7.  2.]
```

### Node

```javascript
const ta = require('wickra');
const v = new ta.VwapStdDevBands(1.5);
v.update(8, 8, 8, 1);
console.log(v.update(12, 12, 12, 1)); // { upper: 13, middle: 10, lower: 7, stddev: 2 }
```

## Interpretation

VWAP is the session's volume-weighted "fair value"; the stddev bands frame
the value area around it:

1. **Value-area trading.** Inside `±1σ` is balanced two-way trade; the
   `±2σ` bands mark the edges institutions defend.
2. **Mean reversion vs trend day.** On a balanced day price oscillates
   around VWAP and fades the bands; on a trend day price rides one band and
   never returns to VWAP — the band it rides is the trend direction.

Always `reset()` at the session open: VWAP is meaningless across a gap, and
the cumulative sums would otherwise carry the prior session forward.

## Common pitfalls

- **Forgetting to reset per session.** Without a reset the bands drift and
  the value-area reading is wrong from the second session on.
- **Feeding zero volume.** Synthetic or pre-market bars with `volume == 0`
  contribute nothing; the VWAP is undefined until real volume arrives.
- **Reading `stddev` as a price-only deviation.** It is *volume-weighted* —
  high-volume bars dominate the dispersion estimate.

## References

The intraday VWAP formula traces back to institutional execution
algorithms. The volume-weighted *standard deviation* envelope is the
natural extension and appears in most major charting packages (TradingView,
ThinkOrSwim, Bookmap).

## See also

- [Vwap](/Indicators/Indicator-Vwap) — the centerline alone.
- [RollingVwap](/Indicators/Indicator-RollingVwap) — windowed (non-cumulative) VWAP.
- [BollingerBands](/Indicators/Indicator-BollingerBands) — non-volume-weighted
  equivalent.
