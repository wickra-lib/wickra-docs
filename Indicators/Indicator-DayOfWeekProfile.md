# Day-of-Week Profile

> Mean bar return for each weekday (Monday `0` through Sunday `6`). Each bar's
> simple return is averaged into the bucket of its local weekday.

## Quick reference

| Item               | Value                                                    |
|--------------------|----------------------------------------------------------|
| Family             | Seasonality & Session                                    |
| Input type         | `Candle` (uses `close`, `timestamp`)                     |
| Output type        | `DayOfWeekProfileOutput { bins }` (length 7)             |
| Output range       | unbounded per bin (typically small)                      |
| Default parameters | `utc_offset_minutes = 0` (UTC)                           |
| Warmup period      | `2`                                                      |
| Interpretation     | Weekday return seasonality                               |

## Formula

```
weekday = local weekday of bar t (Mon=0 .. Sun=6)
ret_t   = close_t / close_{t-1} - 1
bins[w] = mean of ret over bars whose weekday == w   (0.0 if empty)
```

See `crates/wickra-core/src/indicators/day_of_week_profile.rs`.

## Parameters

| Name                 | Type  | Default | Constraint | Source                     | Description |
|----------------------|-------|---------|------------|----------------------------|-------------|
| `utc_offset_minutes` | `i32` | `0`     | none       | `day_of_week_profile.rs:39`| Shifts the instant before deriving the weekday. |

`DayOfWeekProfile::new` is infallible. There are always 7 buckets.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::DayOfWeekProfile, wickra::Candle) -> Option<wickra::DayOfWeekProfileOutput> =
    <wickra::DayOfWeekProfile as wickra::Indicator>::update;
```

- **Python.** `update((o,h,l,c,v,ts))` → length-7 `Matrix` (or `None`);
  `batch(...)` → `(n, 7)` array, warmup rows `NaN`.
- **Node.** `update(...)` → `number[]` (or `null`); `batch(...)` → flat `number[]` length `n*7`.
- **WASM.** `update(...)` → `Float64Array` (or `null`).

## Warmup

`warmup_period() == 2`. The first bar produces no output (no return yet).

## Edge cases

- **Buckets by weekday** — 1970-01-02 (Friday) lands in bin 4
  (test `buckets_by_weekday`).
- **Averages the same weekday across weeks** (test `averages_same_weekday_across_weeks`).
- **Zero prior close** uses a `0.0` return (test `zero_prev_close_uses_zero_return`).
- **Reset** clears all 7 buckets (test `reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, DayOfWeekProfile};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let day = 24 * 3_600_000;
    let mut prof = DayOfWeekProfile::new(0);
    prof.update(Candle::new(100.0, 100.0, 100.0, 100.0, 1.0, 0)?);          // Thu, no return
    let out = prof.update(Candle::new(101.0, 101.0, 101.0, 101.0, 1.0, day)?).unwrap();
    println!("{}", out.bins[4]); // 0.01 (Friday)
    Ok(())
}
```

### Python

```python
import wickra as ta

DAY = 24 * 3_600_000
prof = ta.DayOfWeekProfile(0)
prof.update((100.0, 100.0, 100.0, 100.0, 1.0, 0))
out = prof.update((101.0, 101.0, 101.0, 101.0, 1.0, DAY))
print(out[4])  # Friday mean return
```

### Node

```javascript
const wickra = require('wickra');
const DAY = 24 * 3_600_000;
const prof = new wickra.DayOfWeekProfile(0);
prof.update(100, 100, 100, 100, 1, 0);
console.log(prof.update(101, 101, 101, 101, 1, DAY)[4]); // Friday
```

### Streaming

```python
prof = ta.DayOfWeekProfile(0)
for o, h, l, c, v, ts in daily_candle_feed:
    curve = prof.update((o, h, l, c, v, ts))
    # curve[0]=Monday .. curve[6]=Sunday running mean returns
```

## Interpretation

1. **Weekday anomalies.** Captures classic effects like the "Monday effect"; a
   persistently negative Monday bin or strong Friday bin informs calendar filters.
2. **Crypto weekend regime.** For 24/7 instruments the weekend bins (5, 6) often
   differ markedly from weekdays.

## Common pitfalls

- **Weekday is by local clock.** Set `utc_offset_minutes` to the venue's clock so
  late-session bars don't roll into the next weekday.
- **Few samples per weekday early on.** Each weekday occurs once per week, so the
  profile needs many weeks to stabilise.

## See also

- [TimeOfDayReturnProfile](/Indicators/Indicator-TimeOfDayReturnProfile) — intraday seasonality.
- [TurnOfMonth](/Indicators/Indicator-TurnOfMonth) — monthly anomaly.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
