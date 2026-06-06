# Volume-by-Time Profile

> Mean traded volume in each intraday time bucket. Unlike the return profiles,
> the first bar already produces output (volume needs no prior bar).

## Quick reference

| Item               | Value                                                      |
|--------------------|------------------------------------------------------------|
| Family             | Seasonality & Session                                      |
| Input type         | `Candle` (uses `volume`, `timestamp`)                      |
| Output type        | `VolumeByTimeProfileOutput { bins }` (length `buckets`)    |
| Output range       | `>= 0` per bin                                             |
| Default parameters | `buckets = 24`, `utc_offset_minutes = 0`                  |
| Warmup period      | `1`                                                        |
| Interpretation     | Intraday liquidity / participation curve                  |

## Formula

```
bucket = floor(minute_of_day * buckets / 1440)   (clamped to buckets-1)
bins[b] = mean volume over bars whose bucket == b   (0.0 if empty)
```

See `crates/wickra-core/src/indicators/volume_by_time_profile.rs`.

## Parameters

| Name                 | Type    | Default | Constraint | Source                          | Description |
|----------------------|---------|---------|------------|---------------------------------|-------------|
| `buckets`            | `usize` | `24`    | `> 0`      | `volume_by_time_profile.rs:39`  | Number of intraday slices. |
| `utc_offset_minutes` | `i32`   | `0`     | none       | `volume_by_time_profile.rs:40`  | Shifts the instant before bucketing. |

`VolumeByTimeProfile::new` returns `Error::PeriodZero` for `buckets == 0`.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::VolumeByTimeProfile, wickra::Candle) -> Option<wickra::VolumeByTimeProfileOutput> =
    <wickra::VolumeByTimeProfile as wickra::Indicator>::update;
```

- **Python.** `update((o,h,l,c,v,ts))` → `ndarray` of length `buckets`;
  `batch(...)` → `(n, buckets)` array.
- **Node.** `update(...)` → `number[]`; `batch(...)` → flat `number[]` length `n*buckets`.
- **WASM.** `update(...)` → `Float64Array`.

## Warmup

`warmup_period() == 1` — output is produced from the first bar.

## Edge cases

- **Emits from the first bar and means the volume** (test `emits_from_first_bar_and_means_volume`).
- **Last bucket clamped** for a `23:59` bar (test `last_bucket_clamped`).
- **Rejects `buckets == 0`** (test `rejects_zero_buckets`).
- **Reset** clears all buckets (test `reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, VolumeByTimeProfile};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let hour = 3_600_000;
    let mut prof = VolumeByTimeProfile::new(24, 0)?;
    let out = prof.update(Candle::new(100.0, 100.0, 100.0, 100.0, 500.0, hour)?).unwrap();
    println!("{}", out.bins[1]); // 500 (01:00 bucket)
    Ok(())
}
```

### Python

```python
import wickra as ta

HOUR = 3_600_000
prof = ta.VolumeByTimeProfile(24, 0)
out = prof.update((100.0, 100.0, 100.0, 100.0, 500.0, HOUR))
print(out[1])  # 500.0
```

### Node

```javascript
const wickra = require('wickra');
const HOUR = 3_600_000;
const prof = new wickra.VolumeByTimeProfile(24, 0);
console.log(prof.update(100, 100, 100, 100, 500, HOUR)[1]); // 500
```

### Streaming

```python
prof = ta.VolumeByTimeProfile(48, -300)  # half-hourly, US Eastern
for o, h, l, c, v, ts in candle_feed:
    curve = prof.update((o, h, l, c, v, ts))
    # curve[b] is the mean volume for intraday slice b
```

## Interpretation

1. **Liquidity scheduling.** The volume curve (typically a "U" — heavy at the open
   and close) tells execution algorithms when to be aggressive vs patient.
2. **VWAP scheduling.** A VWAP-execution schedule weights child orders by the
   expected bucket volume from this profile.

## Common pitfalls

- **Volume units.** Means inherit whatever volume unit the candles carry (shares,
   contracts, base/quote) — keep it consistent across the feed.
- **Bucket count vs bar interval.** Match `buckets` to the bar interval so each
   bucket aggregates a meaningful number of bars.

## See also

- [VolumeProfile](/Indicators/Indicator-VolumeProfile) — volume by *price*, not time.
- [TimeOfDayReturnProfile](/Indicators/Indicator-TimeOfDayReturnProfile) — return by time.
- [Vwap](/Indicators/Indicator-Vwap) — volume-weighted average price.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
