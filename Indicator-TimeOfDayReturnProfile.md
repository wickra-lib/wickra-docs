# Time-of-Day Return Profile

> Mean bar return in each intraday time bucket. The local day is split into
> `buckets` equal slices and each bar's simple return is averaged into the bucket
> of its time-of-day.

## Quick reference

| Item               | Value                                                    |
|--------------------|----------------------------------------------------------|
| Family             | Seasonality & Session                                    |
| Input type         | `Candle` (uses `close`, `timestamp`)                     |
| Output type        | `TimeOfDayReturnProfileOutput { bins }` (length `buckets`)|
| Output range       | unbounded per bin (typically small)                      |
| Default parameters | `buckets = 24`, `utc_offset_minutes = 0`                 |
| Warmup period      | `2`                                                      |
| Interpretation     | Intraday return seasonality curve                        |

## Formula

```
bucket = floor(minute_of_day * buckets / 1440)   (clamped to buckets-1)
ret_t  = close_t / close_{t-1} - 1
bins[b] = mean of ret over bars whose bucket == b   (0.0 if empty)
```

See `crates/wickra-core/src/indicators/time_of_day_return_profile.rs`.

## Parameters

| Name                 | Type    | Default | Constraint | Source                            | Description |
|----------------------|---------|---------|------------|-----------------------------------|-------------|
| `buckets`            | `usize` | `24`    | `> 0`      | `time_of_day_return_profile.rs:43`| Number of intraday slices (24 = hourly). |
| `utc_offset_minutes` | `i32`   | `0`     | none       | `time_of_day_return_profile.rs:44`| Shifts the instant before bucketing. |

`TimeOfDayReturnProfile::new` returns `Error::PeriodZero` for `buckets == 0`.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::TimeOfDayReturnProfile, wickra::Candle) -> Option<wickra::TimeOfDayReturnProfileOutput> =
    <wickra::TimeOfDayReturnProfile as wickra::Indicator>::update;
```

- **Python.** `update((o,h,l,c,v,ts))` → `ndarray` of length `buckets` (or `None`);
  `batch(...)` → `(n, buckets)` array, warmup rows `NaN`.
- **Node.** `update(...)` → `number[]` (or `null`); `batch(...)` → flat `number[]` length `n*buckets`.
- **WASM.** `update(...)` → `Float64Array` (or `null`).

## Warmup

`warmup_period() == 2`. The first bar produces no output (no return yet); from
the second bar onward the full profile is reported each bar.

## Edge cases

- **Buckets by hour and means the returns** (test `buckets_by_hour_and_means_returns`).
- **Last bucket clamped** for an end-of-day (`23:59`) bar
  (test `last_bucket_clamped_for_end_of_day`).
- **Rejects `buckets == 0`** (test `rejects_zero_buckets`).
- **Zero prior close** uses a `0.0` return (test `zero_prev_close_uses_zero_return`).
- **Reset** clears all buckets (test `reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, TimeOfDayReturnProfile};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let hour = 3_600_000;
    let mut prof = TimeOfDayReturnProfile::new(24, 0)?;
    prof.update(Candle::new(100.0, 100.0, 100.0, 100.0, 1.0, 0)?);            // 00:00, no return
    let out = prof.update(Candle::new(101.0, 101.0, 101.0, 101.0, 1.0, hour)?).unwrap();
    println!("{}", out.bins[1]); // 0.01 (01:00 bucket)
    Ok(())
}
```

### Python

```python
import wickra as ta

HOUR = 3_600_000
prof = ta.TimeOfDayReturnProfile(24, 0)
prof.update((100.0, 100.0, 100.0, 100.0, 1.0, 0))
out = prof.update((101.0, 101.0, 101.0, 101.0, 1.0, HOUR))
print(out[1])  # 0.01
```

### Node

```javascript
const wickra = require('wickra');
const HOUR = 3_600_000;
const prof = new wickra.TimeOfDayReturnProfile(24, 0);
prof.update(100, 100, 100, 100, 1, 0);
console.log(prof.update(101, 101, 101, 101, 1, HOUR)[1]); // 0.01
```

### Streaming

```python
prof = ta.TimeOfDayReturnProfile(48, -300)  # half-hourly, US Eastern
for o, h, l, c, v, ts in candle_feed:
    curve = prof.update((o, h, l, c, v, ts))
    # curve[b] is the running mean return for intraday slice b
```

## Interpretation

1. **Intraday seasonality map.** Reveals systematically strong/weak times of day
   (e.g. open and close drift) — the basis for time-of-day entry filters.
2. **Execution timing.** Avoid placing passive orders in buckets with adverse
   mean drift.

## Common pitfalls

- **Bar spacing vs buckets.** Choose `buckets` consistent with your bar interval;
  24 buckets on 5-minute bars groups twelve bars per bucket.
- **Survivorship.** Means are unweighted across days; a few extreme days can
  dominate a thinly-populated bucket early on.

## See also

- [IntradayVolatilityProfile](Indicator-IntradayVolatilityProfile) — volatility, not mean.
- [VolumeByTimeProfile](Indicator-VolumeByTimeProfile) — volume by time.
- [SeasonalZScore](Indicator-SeasonalZScore) — normalised hourly anomaly.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
