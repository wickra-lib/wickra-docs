# Seasonal Z-Score

> How far the current bar's return sits from the historical mean return of bars
> in the **same hour of day**, in standard deviations. Per-hour statistics use
> Welford's online algorithm.

## Quick reference

| Item               | Value                                                    |
|--------------------|----------------------------------------------------------|
| Family             | Seasonality & Session                                    |
| Input type         | `Candle` (uses `close`, `timestamp`)                     |
| Output type        | `f64` (z-score)                                          |
| Output range       | unbounded (typically `±3`)                               |
| Default parameters | `utc_offset_minutes = 0` (UTC)                           |
| Warmup period      | `2`                                                      |
| Interpretation     | Is this hour unusual vs its own history?                 |

## Formula

```
ret_t = close_t / close_{t-1} - 1
hour  = local hour of bar t (0..23)
z_t   = (ret_t - mean[hour]) / std[hour]      using prior samples in `hour`
```

A bucket needs ≥ 2 prior samples to emit; a zero-variance bucket reports `0.0`.
See `crates/wickra-core/src/indicators/seasonal_z_score.rs`.

## Parameters

| Name                 | Type  | Default | Constraint | Source                  | Description |
|----------------------|-------|---------|------------|-------------------------|-------------|
| `utc_offset_minutes` | `i32` | `0`     | none       | `seasonal_z_score.rs:37`| Shifts the instant before deriving the hour bucket. |

`SeasonalZScore::new` is infallible. The 24 hourly buckets are fixed.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::SeasonalZScore, wickra::Candle) -> Option<f64> =
    <wickra::SeasonalZScore as wickra::Indicator>::update;
```

- **Python.** `update((o,h,l,c,v,ts))` → `float | None`;
  `batch(...)` → 1-D `ndarray` (`NaN` until a bucket has two priors).
- **Node.** `update(...)` → `number | null`; `batch(...)` → `number[]`.
- **WASM.** `update(...)` → `number | undefined`.

## Warmup

`warmup_period() == 2`. The first return seeds a bucket; an hour bucket emits
only once it holds at least two prior samples.

## Edge cases

- **No output until a bucket has two priors** (test `no_output_until_bucket_has_two_priors`).
- **Matches a manual Welford computation** (test `z_score_matches_manual_welford`).
- **Zero-variance bucket reports `0.0`** (test `zero_variance_bucket_reports_zero`).
- **Zero prior close** uses a `0.0` return (test `zero_prev_close_uses_zero_return`).
- **Reset** clears all 24 buckets (test `reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, SeasonalZScore};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let day = 24 * 3_600_000;
    let mut z = SeasonalZScore::new(0);
    for (i, close) in [100.0, 101.0, 103.0].iter().enumerate() {
        let ts = i as i64 * day;
        z.update(Candle::new(*close, *close, *close, *close, 1.0, ts)?);
    }
    // Fourth same-hour sample has two priors in the bucket -> emits a z-score.
    let out = z.update(Candle::new(110.0, 110.0, 110.0, 110.0, 1.0, 3 * day)?);
    println!("{:?}", out); // Some(z)
    Ok(())
}
```

### Python

```python
import wickra as ta

DAY = 24 * 3_600_000
z = ta.SeasonalZScore(0)
for i, close in enumerate([100.0, 101.0, 103.0]):
    z.update((close, close, close, close, 1.0, i * DAY))
print(z.update((110.0, 110.0, 110.0, 110.0, 1.0, 3 * DAY)))  # a z-score
```

### Node

```javascript
const wickra = require('wickra');
const DAY = 24 * 3_600_000;
const z = new wickra.SeasonalZScore(0);
// feed same-hour bars across days; once a bucket has two priors it emits
```

### Streaming

```python
z = ta.SeasonalZScore(-300)
for o, h, l, c, v, ts in candle_feed:
    score = z.update((o, h, l, c, v, ts))
    if score is not None and abs(score) > 2.0:
        pass  # this hour's move is unusual vs its own history
```

## Interpretation

1. **Seasonality-aware anomaly detection.** A `|z| > 2` flags a move that is large
   *relative to what that hour usually does* — more informative than a raw return
   threshold for instruments with strong intraday seasonality.
2. **Filter for signals.** Use as a normaliser so the same threshold works across
   calm and volatile hours.

## Common pitfalls

- **Hourly bucketing.** Buckets are by clock hour; sub-hourly seasonality is
  averaged within the hour. Set `utc_offset_minutes` to the venue's clock.
- **Cold buckets.** Rarely-traded hours take many days to accumulate two samples
  and emit `None` until then.

## See also

- [TurnOfMonth](/Indicators/Indicator-TurnOfMonth) — monthly calendar anomaly.
- [TimeOfDayReturnProfile](/Indicators/Indicator-TimeOfDayReturnProfile) — raw hourly means.
- [ZScore](/Indicators/Indicator-ZScore) — rolling (non-seasonal) z-score.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
