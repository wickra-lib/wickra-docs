# Turn-of-Month Effect

> Running mean of daily close-to-close returns for sessions that fall inside the
> turn-of-month window — the first `n_first` and last `n_last` calendar days of a
> month. Sessions outside the window are ignored.

## Quick reference

| Item               | Value                                                    |
|--------------------|----------------------------------------------------------|
| Family             | Seasonality & Session                                    |
| Input type         | `Candle` (uses `close`, `timestamp`)                     |
| Output type        | `f64` (mean daily return)                                |
| Output range       | unbounded (typically small)                              |
| Default parameters | `n_first = 3`, `n_last = 1`, `utc_offset_minutes = 0`    |
| Warmup period      | `2`                                                      |
| Interpretation     | Strength of the turn-of-month calendar anomaly           |

## Formula

```
window(day) = day_of_month <= n_first  OR  day_of_month > days_in_month - n_last
daily_return_d = close_d / close_{d-1} - 1
output = mean of daily_return over in-window completed days
```

See `crates/wickra-core/src/indicators/turn_of_month.rs`.

## Parameters

| Name                 | Type  | Default | Constraint              | Source                 | Description |
|----------------------|-------|---------|-------------------------|------------------------|-------------|
| `n_first`            | `u32` | `3`     | not both zero with `n_last` | `turn_of_month.rs:43`  | Count of first-of-month days in the window. |
| `n_last`             | `u32` | `1`     | not both zero with `n_first` | `turn_of_month.rs:44`  | Count of last-of-month days in the window. |
| `utc_offset_minutes` | `i32` | `0`     | none                    | `turn_of_month.rs:45`  | Shifts the instant before deriving the day / month. |

`TurnOfMonth::new` returns `Error::PeriodZero` when both `n_first` and `n_last`
are `0`. `TurnOfMonth::classic()` is the `(3, 1)` factory.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::TurnOfMonth, wickra::Candle) -> Option<f64> =
    <wickra::TurnOfMonth as wickra::Indicator>::update;
```

- **Python.** `update((o,h,l,c,v,ts))` → `float | None`;
  `batch(...)` → 1-D `ndarray` (`NaN` until the first in-window day).
- **Node.** `update(...)` → `number | null`; `batch(...)` → `number[]`.
- **WASM.** `update(...)` → `number | undefined`.

## Warmup

`warmup_period() == 2`. No value until at least one in-window session has
produced a daily return.

## Edge cases

- **Window predicate** covers both first-days and last-days branches, including
  saturating subtraction when `n_last` exceeds the month length
  (test `window_predicate_branches`).
- **Rejects the empty `(0, 0)` window** (test `rejects_empty_window`).
- **Averages in-window returns only** (test `averages_in_window_returns_only`).
- **Zero prior close** contributes a `0.0` return (test `zero_prev_close_contributes_zero`).
- **Reset** clears the accumulators (test `reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, TurnOfMonth};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let day = 24 * 3_600_000;
    let mut tom = TurnOfMonth::new(3, 1, 0)?;
    // 2021-01-29 .. 02-01, daily bars.
    let start = 1_611_878_400_000; // 2021-01-29 00:00 UTC
    let mut last = None;
    for (i, close) in [100.0, 101.0, 102.0, 103.0].iter().enumerate() {
        let ts = start + i as i64 * day;
        last = tom.update(Candle::new(*close, *close, *close, *close, 1.0, ts)?);
    }
    println!("{:?}", last); // Some(mean in-window return)
    Ok(())
}
```

### Python

```python
import wickra as ta

DAY = 24 * 3_600_000
tom = ta.TurnOfMonth(3, 1, 0)
start = 1_611_878_400_000  # 2021-01-29 00:00 UTC
out = None
for i, close in enumerate([100.0, 101.0, 102.0, 103.0]):
    out = tom.update((close, close, close, close, 1.0, start + i * DAY))
print(out)  # mean in-window daily return
```

### Node

```javascript
const wickra = require('wickra');
const tom = new wickra.TurnOfMonth(3, 1, 0);
// feed daily candles spanning a month boundary; read the running mean
```

### Streaming

```python
tom = ta.TurnOfMonth(3, 1, 0)
for o, h, l, c, v, ts in daily_candle_feed:
    edge = tom.update((o, h, l, c, v, ts))
    # `edge` estimates the historical turn-of-month drift for this instrument
```

## Interpretation

1. **Calendar anomaly.** The turn-of-month effect — elevated returns around the
   month boundary — is one of the most-studied seasonal anomalies. A positive,
   stable `edge` supports a calendar-timed long bias.
2. **Regime check.** A decaying value warns that the anomaly is weakening for the
   instrument.

## Common pitfalls

- **Calendar vs trading days.** The window uses calendar day-of-month, not the
  Nth trading day; feed daily session bars for clean attribution.
- **Needs many months.** A meaningful mean requires many month boundaries; early
  output is noisy.

## See also

- [SeasonalZScore](/Indicators/Indicator-SeasonalZScore) — intraday hour-of-day seasonality.
- [DayOfWeekProfile](/Indicators/Indicator-DayOfWeekProfile) — weekday seasonality.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
