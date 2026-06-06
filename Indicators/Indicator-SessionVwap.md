# Session VWAP

> Volume-weighted average price accumulated since the start of the current
> calendar-day session, re-anchored automatically at each day boundary. Each bar
> contributes its typical price `(high + low + close) / 3` weighted by volume.

## Quick reference

| Item               | Value                                                          |
|--------------------|----------------------------------------------------------------|
| Family             | Seasonality & Session                                          |
| Input type         | `Candle` (uses `high`, `low`, `close`, `volume`, `timestamp`)  |
| Output type        | `f64`                                                          |
| Output range       | unbounded (price units)                                        |
| Default parameters | `utc_offset_minutes = 0` (UTC)                                 |
| Warmup period      | `1`                                                            |
| Interpretation     | Intraday fair-value anchor; price above/below = relative strength |

## Formula

```
typical_t = (high_t + low_t + close_t) / 3
within the current local day:
  vwap_t = Σ(typical · volume) / Σ volume
  (falls back to typical_t while Σ volume == 0)
```

The local day is the wall-clock day of `Candle::timestamp` shifted by
`utc_offset_minutes`. See
`crates/wickra-core/src/indicators/session_vwap.rs`.

## Parameters

| Name                 | Type  | Default | Constraint | Source                | Description |
|----------------------|-------|---------|------------|-----------------------|-------------|
| `utc_offset_minutes` | `i32` | `0`     | none       | `session_vwap.rs:38`  | Shifts the instant before deriving the day boundary (`-300` = US Eastern standard time). |

`SessionVwap::new` is infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::SessionVwap, wickra::Candle) -> Option<f64> =
    <wickra::SessionVwap as wickra::Indicator>::update;
```

- **Python.** `SessionVwap(utc_offset_minutes).update((o,h,l,c,v,ts))`;
  `batch(open, high, low, close, volume, timestamp)` → 1-D `ndarray`.
- **Node.** `update(open, high, low, close, volume, timestamp)`;
  `batch(...)` → `number[]`.
- **WASM.** `update(open, high, low, close, volume, timestamp)` (`timestamp` is a `BigInt`).

## Warmup

`warmup_period() == 1` — a value is produced from the first bar.

## Edge cases

- **Day rollover re-anchors.** Crossing a local day boundary restarts the
  accumulation (test `re_anchors_on_new_day`).
- **Zero-volume session.** Falls back to the latest typical price so the output
  is always finite (test `zero_volume_session_falls_back_to_typical`).
- **Typical price.** Uses `(high + low + close) / 3`, verified by
  `typical_price_uses_high_low_close`.
- **Reset.** Clears the day anchor and accumulators (test `reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, SessionVwap};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let hour = 3_600_000;
    let mut vwap = SessionVwap::new(0);
    vwap.update(Candle::new(100.0, 100.0, 100.0, 100.0, 10.0, 0)?);
    let v = vwap.update(Candle::new(110.0, 110.0, 110.0, 110.0, 30.0, hour)?).unwrap();
    println!("{v}"); // 107.5 = (100*10 + 110*30) / 40
    Ok(())
}
```

### Python

```python
import wickra as ta

HOUR = 3_600_000
vwap = ta.SessionVwap(0)
vwap.update((100.0, 100.0, 100.0, 100.0, 10.0, 0))
print(vwap.update((110.0, 110.0, 110.0, 110.0, 30.0, HOUR)))  # 107.5
```

### Node

```javascript
const wickra = require('wickra');
const HOUR = 3_600_000;
const vwap = new wickra.SessionVwap(0);
vwap.update(100, 100, 100, 100, 10, 0);
console.log(vwap.update(110, 110, 110, 110, 30, HOUR)); // 107.5
```

### Streaming

```python
vwap = ta.SessionVwap(-300)  # anchor to US Eastern standard time
for o, h, l, c, v, ts in candle_feed:
    fair = vwap.update((o, h, l, c, v, ts))
    # price above `fair` = trading rich vs the session's volume-weighted mean
```

## Interpretation

1. **Fair-value anchor.** Intraday mean-reversion strategies fade excursions from
   the session VWAP; trend strategies require price to hold above (long) or below
   (short) it.
2. **Execution benchmark.** VWAP is the canonical execution benchmark — fills
   better than session VWAP beat the volume-weighted crowd.
3. **Offset matters.** For exchange-local session anchoring, set
   `utc_offset_minutes` to the venue's standard-time offset.

## Common pitfalls

- **Wrong day boundary.** Leaving `utc_offset_minutes = 0` anchors at UTC
  midnight, which rarely matches an equity/futures session open.
- **Sparse early session.** Very early in a session, Σ volume is small and the
  VWAP is noisy; treat the first few bars with caution.

## See also

- [RollingVwap](/Indicators/Indicator-RollingVwap) — fixed-window VWAP, no session anchor.
- [AnchoredVwap](/Indicators/Indicator-AnchoredVwap) — anchors at a caller-chosen bar.
- [SessionHighLow](/Indicators/Indicator-SessionHighLow) — companion session range.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
