# Session High/Low

> Running high and low of the current calendar-day session, re-anchored
> automatically at each day boundary. Unlike `OpeningRange` / `InitialBalance`,
> the boundary is detected from the candle timestamp — no manual `reset()`.

## Quick reference

| Item               | Value                                                   |
|--------------------|---------------------------------------------------------|
| Family             | Seasonality & Session                                   |
| Input type         | `Candle` (uses `high`, `low`, `timestamp`)              |
| Output type        | `SessionHighLowOutput { high, low }`                    |
| Output range       | unbounded (price units)                                 |
| Default parameters | `utc_offset_minutes = 0` (UTC)                          |
| Warmup period      | `1`                                                      |
| Interpretation     | Intraday support/resistance envelope                    |

## Formula

```
On a new local day:   high = candle.high, low = candle.low
Within the same day:  high = max(high, candle.high)
                      low  = min(low,  candle.low)
```

The local day is the wall-clock day of `Candle::timestamp` shifted by
`utc_offset_minutes`. See
`crates/wickra-core/src/indicators/session_high_low.rs`.

## Parameters

| Name                 | Type  | Default | Constraint | Source                    | Description |
|----------------------|-------|---------|------------|---------------------------|-------------|
| `utc_offset_minutes` | `i32` | `0`     | none       | `session_high_low.rs:39`  | Shifts the instant before deriving the day boundary. |

`SessionHighLow::new` is infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::SessionHighLow, wickra::Candle) -> Option<wickra::SessionHighLowOutput> =
    <wickra::SessionHighLow as wickra::Indicator>::update;
```

- **Python.** `update((o,h,l,c,v,ts))` → `(high, low)` tuple;
  `batch(open, high, low, close, volume, timestamp)` → `(n, 2)` array.
- **Node.** `update(...)` → `{ high, low }`; `batch(...)` → flat `number[]` length `n*2`.
- **WASM.** `update(...)` → `{ high, low }` object (`timestamp` is a `BigInt`).

## Warmup

`warmup_period() == 1` — both fields are produced from the first bar.

## Edge cases

- **Widens within a day.** A narrower bar never shrinks the range
  (test `tracks_high_low_within_day`).
- **Re-anchors on a new day.** The first bar of a new local day defines the new
  range alone (test `re_anchors_on_new_day`).
- **Offset shifts the boundary.** Two bars that straddle UTC midnight can land on
  the same local day under a non-zero offset
  (test `utc_offset_shifts_day_boundary`).
- **Reset.** Clears the day anchor and range (test `reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, SessionHighLow};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let hour = 3_600_000;
    let mut shl = SessionHighLow::new(0);
    shl.update(Candle::new(100.0, 105.0, 99.0, 101.0, 1.0, 0)?);
    let v = shl.update(Candle::new(101.0, 108.0, 100.0, 107.0, 1.0, hour)?).unwrap();
    println!("{} {}", v.high, v.low); // 108 99
    Ok(())
}
```

### Python

```python
import wickra as ta

HOUR = 3_600_000
shl = ta.SessionHighLow(0)
shl.update((100.0, 105.0, 99.0, 101.0, 1.0, 0))
print(shl.update((101.0, 108.0, 100.0, 107.0, 1.0, HOUR)))  # (108.0, 99.0)
```

### Node

```javascript
const wickra = require('wickra');
const HOUR = 3_600_000;
const shl = new wickra.SessionHighLow(0);
shl.update(100, 105, 99, 101, 1, 0);
console.log(shl.update(101, 108, 100, 107, 1, HOUR)); // { high: 108, low: 99 }
```

### Streaming

```python
shl = ta.SessionHighLow(60)  # CET
for o, h, l, c, v, ts in candle_feed:
    band = shl.update((o, h, l, c, v, ts))
    # band.high / band.low form the session's developing range
```

## Interpretation

1. **Intraday envelope.** The session high/low are the most-watched intraday
   reference levels; breaks frequently trigger stop runs and breakouts.
2. **Mean-reversion bounds.** Range-bound days oscillate between the developing
   session high and low.

## Common pitfalls

- **Continuous (24/7) instruments.** Without a meaningful day boundary the range
  resets at UTC (or offset) midnight, which may not match the venue's session.
- **Gaps.** A gap-open bar instantly sets a fresh range; it does not inherit the
  prior day's levels.

## See also

- [SessionRange](/Indicators/Indicator-SessionRange) — Asia/EU/US sub-session ranges.
- [OpeningRange](/Indicators/Indicator-OpeningRange) — first-N-bars range, manual reset.
- [InitialBalance](/Indicators/Indicator-InitialBalance) — locked opening balance.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
