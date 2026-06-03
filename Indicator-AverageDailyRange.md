# Average Daily Range (ADR)

> Mean high-minus-low range of the last `period` **completed** calendar-day
> sessions. The current, still-forming day is excluded until it closes.

## Quick reference

| Item               | Value                                                    |
|--------------------|----------------------------------------------------------|
| Family             | Seasonality & Session                                    |
| Input type         | `Candle` (uses `high`, `low`, `timestamp`)               |
| Output type        | `f64`                                                    |
| Output range       | `>= 0` (price units)                                     |
| Default parameters | `period = 14`, `utc_offset_minutes = 0`                  |
| Warmup period      | `period`                                                 |
| Interpretation     | Typical day's travel; sizing stops / targets             |

## Formula

```
daily_range_d = max(high) - min(low)   over the bars of day d
ADR = mean of the last `period` completed daily_range values
```

The current day is excluded until a new day begins. See
`crates/wickra-core/src/indicators/average_daily_range.rs`.

## Parameters

| Name                 | Type    | Default | Constraint | Source                       | Description |
|----------------------|---------|---------|------------|------------------------------|-------------|
| `period`             | `usize` | `14`    | `> 0`      | `average_daily_range.rs:36`  | Number of completed sessions to average. |
| `utc_offset_minutes` | `i32`   | `0`     | none       | `average_daily_range.rs:37`  | Shifts the instant before deriving the day boundary. |

`AverageDailyRange::new` returns `Error::PeriodZero` for `period == 0`.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::AverageDailyRange, wickra::Candle) -> Option<f64> =
    <wickra::AverageDailyRange as wickra::Indicator>::update;
```

- **Python.** `update((o,h,l,c,v,ts))` → `float | None`;
  `batch(open, high, low, close, volume, timestamp)` → 1-D `ndarray` (`NaN` warmup).
- **Node.** `update(...)` → `number | null`; `batch(...)` → `number[]`.
- **WASM.** `update(...)` → `number | undefined`.

## Warmup

`warmup_period() == period`. No value is produced until the first session
completes; the running mean uses up to `period` completed days.

## Edge cases

- **Averages completed days only** — the in-progress day never enters the mean
  (test `averages_completed_day_ranges`).
- **Rolls off the oldest day beyond `period`** (test `rolls_off_oldest_day_beyond_period`).
- **Rejects `period == 0`** (test `rejects_zero_period`).
- **Reset.** Clears the window and the in-progress day (test `reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, AverageDailyRange};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let day = 24 * 3_600_000;
    let mut adr = AverageDailyRange::new(2, 0)?;
    adr.update(Candle::new(105.0, 110.0, 100.0, 108.0, 1.0, 0)?);          // day 1, range 10
    let v = adr.update(Candle::new(108.0, 112.0, 106.0, 109.0, 1.0, day)?).unwrap();
    println!("{v}"); // 10.0
    Ok(())
}
```

### Python

```python
import wickra as ta

DAY = 24 * 3_600_000
adr = ta.AverageDailyRange(2, 0)
assert adr.update((105.0, 110.0, 100.0, 108.0, 1.0, 0)) is None  # day 1 forming
print(adr.update((108.0, 112.0, 106.0, 109.0, 1.0, DAY)))        # 10.0
```

### Node

```javascript
const wickra = require('wickra');
const DAY = 24 * 3_600_000;
const adr = new wickra.AverageDailyRange(2, 0);
adr.update(105, 110, 100, 108, 1, 0);
console.log(adr.update(108, 112, 106, 109, 1, DAY)); // 10
```

### Streaming

```python
adr = ta.AverageDailyRange(14, -300)  # 14-day ADR anchored to US Eastern
for o, h, l, c, v, ts in candle_feed:
    typical = adr.update((o, h, l, c, v, ts))
    if typical is not None:
        stop_distance = 0.5 * typical  # size stops as a fraction of ADR
```

## Interpretation

1. **Stop / target sizing.** ADR is the standard scale for intraday stops and
   profit targets — e.g. a target of `1 × ADR` from the open.
2. **Range exhaustion.** When the current day's range approaches the ADR, further
   directional follow-through becomes statistically less likely.

## Common pitfalls

- **Days are defined by timestamp, not trading calendar.** Weekends/holidays
  still roll the day key; for equities, feed only session bars or filter holidays
  upstream.
- **Warmup is in days, not bars** — `warmup_period()` returns `period` as a hint,
  but a full value needs `period` *completed* sessions.

## See also

- [SessionRange](Indicator-SessionRange) — per-session range of the current day.
- [Atr](Indicator-Atr) — bar-level true-range volatility.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
