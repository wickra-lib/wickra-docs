# Session Range

> High-minus-low range accumulated within each of the three canonical trading
> sessions — Asia (`00:00–08:00`), EU (`08:00–16:00`), US (`16:00–24:00`) local —
> of the current day. All three reset at the local day boundary.

## Quick reference

| Item               | Value                                                    |
|--------------------|----------------------------------------------------------|
| Family             | Seasonality & Session                                    |
| Input type         | `Candle` (uses `high`, `low`, `timestamp`)               |
| Output type        | `SessionRangeOutput { asia, eu, us }`                    |
| Output range       | `>= 0` per field (`0.0` before a session is seen)        |
| Default parameters | `utc_offset_minutes = 0` (UTC)                           |
| Warmup period      | `1`                                                      |
| Interpretation     | Which session drove the day's range                      |

## Formula

```
session = hour / 8        # 0 Asia, 1 EU, 2 US (local hour)
per session, within the local day:
  range = max(high) - min(low)   (0.0 if no bar yet)
```

See `crates/wickra-core/src/indicators/session_range.rs`.

## Parameters

| Name                 | Type  | Default | Constraint | Source                  | Description |
|----------------------|-------|---------|------------|-------------------------|-------------|
| `utc_offset_minutes` | `i32` | `0`     | none       | `session_range.rs:84`   | Shifts the instant before deriving the session and day. |

`SessionRange::new` is infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::SessionRange, wickra::Candle) -> Option<wickra::SessionRangeOutput> =
    <wickra::SessionRange as wickra::Indicator>::update;
```

- **Python.** `update((o,h,l,c,v,ts))` → `(asia, eu, us)`;
  `batch(...)` → `(n, 3)` array.
- **Node.** `update(...)` → `{ asia, eu, us }`; `batch(...)` → flat `number[]` length `n*3`.
- **WASM.** `update(...)` → `{ asia, eu, us }` object.

## Warmup

`warmup_period() == 1`. Sessions with no bar yet report `0.0`.

## Edge cases

- **Bars routed by hour.** A 02:00 bar lands in Asia, 10:00 in EU, 20:00 in US
  (test `assigns_bars_to_sessions`).
- **Widens within a session** (test `widens_within_one_session`).
- **All three reset at the day boundary** (test `resets_sessions_on_new_day`).
- **Offset can move a bar between sessions** — a 07:00 UTC bar becomes EU under a
  `+120` offset (test `utc_offset_moves_bar_between_sessions`).
- **Reset.** Clears all three sessions (test `reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, SessionRange};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let hour = 3_600_000;
    let mut sr = SessionRange::new(0);
    sr.update(Candle::new(100.0, 104.0, 98.0, 101.0, 1.0, 2 * hour)?);   // Asia
    let v = sr.update(Candle::new(101.0, 110.0, 100.0, 109.0, 1.0, 10 * hour)?).unwrap(); // EU
    println!("{} {} {}", v.asia, v.eu, v.us); // 6 10 0
    Ok(())
}
```

### Python

```python
import wickra as ta

HOUR = 3_600_000
sr = ta.SessionRange(0)
sr.update((100.0, 104.0, 98.0, 101.0, 1.0, 2 * HOUR))
print(sr.update((101.0, 110.0, 100.0, 109.0, 1.0, 10 * HOUR)))  # (6.0, 10.0, 0.0)
```

### Node

```javascript
const wickra = require('wickra');
const HOUR = 3_600_000;
const sr = new wickra.SessionRange(0);
sr.update(100, 104, 98, 101, 1, 2 * HOUR);
console.log(sr.update(101, 110, 100, 109, 1, 10 * HOUR)); // { asia: 6, eu: 10, us: 0 }
```

### Streaming

```python
sr = ta.SessionRange(0)
for o, h, l, c, v, ts in candle_feed:
    r = sr.update((o, h, l, c, v, ts))
    # compare r.asia / r.eu / r.us to see which session dominated
```

## Interpretation

1. **Volatility attribution.** Identifies which trading session contributed the
   day's range — useful for venue-specific session strategies.
2. **Session breakout context.** A wide US range after a quiet Asia session flags
   a session-driven directional move.

## Common pitfalls

- **Fixed 8-hour windows.** Sessions are equal eighths of the local day; they do
  not track holiday or daylight-saving shifts — set `utc_offset_minutes` for the
  venue's standard time.
- **24/7 instruments.** The split is by clock hour, not by liquidity; interpret
  accordingly for crypto.

## See also

- [SessionHighLow](/Indicators/Indicator-SessionHighLow) — whole-day range.
- [AverageDailyRange](/Indicators/Indicator-AverageDailyRange) — multi-day mean range.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
