# Intraday Volatility Profile

> Return standard deviation in each intraday time bucket. The local day is split
> into `buckets` equal slices and each bar's simple return updates the per-bucket
> running variance (Welford); the reported value is the sample standard deviation.

## Quick reference

| Item               | Value                                                          |
|--------------------|----------------------------------------------------------------|
| Family             | Seasonality & Session                                          |
| Input type         | `Candle` (uses `close`, `timestamp`)                          |
| Output type        | `IntradayVolatilityProfileOutput { bins }` (length `buckets`) |
| Output range       | `>= 0` per bin                                                |
| Default parameters | `buckets = 24`, `utc_offset_minutes = 0`                     |
| Warmup period      | `2`                                                          |
| Interpretation     | Intraday volatility seasonality (the "volatility smile")     |

## Formula

```
bucket = floor(minute_of_day * buckets / 1440)   (clamped to buckets-1)
ret_t  = close_t / close_{t-1} - 1
bins[b] = sample std of ret over bars in bucket b   (0.0 if < 2 samples)
```

See `crates/wickra-core/src/indicators/intraday_volatility_profile.rs`.

## Parameters

| Name                 | Type    | Default | Constraint | Source                               | Description |
|----------------------|---------|---------|------------|--------------------------------------|-------------|
| `buckets`            | `usize` | `24`    | `> 0`      | `intraday_volatility_profile.rs:43`  | Number of intraday slices. |
| `utc_offset_minutes` | `i32`   | `0`     | none       | `intraday_volatility_profile.rs:44`  | Shifts the instant before bucketing. |

`IntradayVolatilityProfile::new` returns `Error::PeriodZero` for `buckets == 0`.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::IntradayVolatilityProfile, wickra::Candle) -> Option<wickra::IntradayVolatilityProfileOutput> =
    <wickra::IntradayVolatilityProfile as wickra::Indicator>::update;
```

- **Python.** `update((o,h,l,c,v,ts))` → `Matrix` of length `buckets` (or `None`);
  `batch(...)` → `(n, buckets)` array, warmup rows `NaN`.
- **Node.** `update(...)` → `number[]` (or `null`); `batch(...)` → flat `number[]` length `n*buckets`.
- **WASM.** `update(...)` → `Float64Array` (or `null`).

## Warmup

`warmup_period() == 2`. A bucket reports `0.0` until it holds at least two
samples; the profile itself emits from the second bar onward.

## Edge cases

- **Single-sample bucket has zero volatility** (test `single_sample_bucket_has_zero_vol`).
- **Std matches a manual two-sample computation** (test `std_matches_manual_two_samples`).
- **Rejects `buckets == 0`** (test `rejects_zero_buckets`).
- **Reset** clears all buckets (test `reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, IntradayVolatilityProfile};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let hour = 3_600_000;
    let mut prof = IntradayVolatilityProfile::new(24, 0)?;
    prof.update(Candle::new(100.0, 100.0, 100.0, 100.0, 1.0, 0)?);
    let out = prof.update(Candle::new(101.0, 101.0, 101.0, 101.0, 1.0, hour)?).unwrap();
    println!("{}", out.bins[1]); // 0.0 (one sample in bucket 1)
    Ok(())
}
```

### Python

```python
import wickra as ta

HOUR = 3_600_000
prof = ta.IntradayVolatilityProfile(24, 0)
prof.update((100.0, 100.0, 100.0, 100.0, 1.0, 0))
out = prof.update((101.0, 101.0, 101.0, 101.0, 1.0, HOUR))
print(out[1])  # 0.0 until the bucket has two samples
```

### Node

```javascript
const wickra = require('wickra');
const HOUR = 3_600_000;
const prof = new wickra.IntradayVolatilityProfile(24, 0);
prof.update(100, 100, 100, 100, 1, 0);
console.log(prof.update(101, 101, 101, 101, 1, HOUR)[1]); // 0
```

### Streaming

```python
prof = ta.IntradayVolatilityProfile(48, -300)  # half-hourly, US Eastern
for o, h, l, c, v, ts in candle_feed:
    vol = prof.update((o, h, l, c, v, ts))
    # vol[b] is the running return std for intraday slice b
```

## Interpretation

1. **Volatility seasonality.** Most markets show a "volatility smile" across the
   day — elevated at the open and close, quiet midday. This profile quantifies it.
2. **Risk scheduling.** Size positions and place stops with awareness of the
   bucket's typical volatility rather than a flat daily figure.

## Common pitfalls

- **Sample-vs-population std.** Uses the unbiased sample standard deviation
   (`n - 1`); a bucket with one sample reports `0.0`, not `NaN`.
- **Bucket population.** Thin buckets early in the history give unstable std
   estimates.

## See also

- [TimeOfDayReturnProfile](/Indicators/Indicator-TimeOfDayReturnProfile) — mean, not std.
- [VolumeByTimeProfile](/Indicators/Indicator-VolumeByTimeProfile) — volume by time.
- [HistoricalVolatility](/Indicators/Indicator-HistoricalVolatility) — rolling realised vol.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
