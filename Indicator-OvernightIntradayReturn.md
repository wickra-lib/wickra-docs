# Overnight vs. Intraday Return

> Decomposes a session's total return into its **overnight** (close-to-open) and
> **intraday** (open-to-close) components. Compounding the two reconstructs the
> previous-close to latest-close return.

## Quick reference

| Item               | Value                                                    |
|--------------------|----------------------------------------------------------|
| Family             | Seasonality & Session                                    |
| Input type         | `Candle` (uses `open`, `close`, `timestamp`)             |
| Output type        | `OvernightIntradayReturnOutput { overnight, intraday }`  |
| Output range       | unbounded (simple returns)                               |
| Default parameters | `utc_offset_minutes = 0` (UTC)                           |
| Warmup period      | `2`                                                      |
| Interpretation     | Where the session's return was earned                    |

## Formula

```
overnight = open / previous_close - 1     (fixed at the session open)
intraday  = close / open - 1              (updates each bar)
total     = (1 + overnight)(1 + intraday) - 1
```

See `crates/wickra-core/src/indicators/overnight_intraday_return.rs`.

## Parameters

| Name                 | Type  | Default | Constraint | Source                              | Description |
|----------------------|-------|---------|------------|-------------------------------------|-------------|
| `utc_offset_minutes` | `i32` | `0`     | none       | `overnight_intraday_return.rs:46`   | Shifts the instant before deriving the day boundary. |

`OvernightIntradayReturn::new` is infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::OvernightIntradayReturn, wickra::Candle) -> Option<wickra::OvernightIntradayReturnOutput> =
    <wickra::OvernightIntradayReturn as wickra::Indicator>::update;
```

- **Python.** `update((o,h,l,c,v,ts))` → `(overnight, intraday)`;
  `batch(...)` → `(n, 2)` array.
- **Node.** `update(...)` → `{ overnight, intraday }`; `batch(...)` → flat `number[]` length `n*2`.
- **WASM.** `update(...)` → `{ overnight, intraday }` object.

## Warmup

`warmup_period() == 2`. The first session yields `None` (no prior close); from
the second session onward both components are reported every bar.

## Edge cases

- **First session yields `None`** (test `first_session_yields_none`).
- **Decomposes both legs** at the boundary (test `decomposes_overnight_and_intraday`).
- **Intraday updates through the session** while overnight stays fixed
  (test `intraday_updates_through_the_session`).
- **Zero anchors** (prior close or open `0`) yield `0.0` components
  (test `zero_anchors_yield_zero_components`).
- **Reset** clears all anchors (test `reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, OvernightIntradayReturn};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let day = 24 * 3_600_000;
    let mut oi = OvernightIntradayReturn::new(0);
    oi.update(Candle::new(99.0, 101.0, 98.0, 100.0, 1.0, 0)?);           // day 1 closes 100
    let v = oi.update(Candle::new(110.0, 122.0, 109.0, 121.0, 1.0, day)?).unwrap();
    println!("{} {}", v.overnight, v.intraday); // 0.10 0.10
    Ok(())
}
```

### Python

```python
import wickra as ta

DAY = 24 * 3_600_000
oi = ta.OvernightIntradayReturn(0)
assert oi.update((99.0, 101.0, 98.0, 100.0, 1.0, 0)) is None
print(oi.update((110.0, 122.0, 109.0, 121.0, 1.0, DAY)))  # (0.10, 0.10)
```

### Node

```javascript
const wickra = require('wickra');
const DAY = 24 * 3_600_000;
const oi = new wickra.OvernightIntradayReturn(0);
oi.update(99, 101, 98, 100, 1, 0);
console.log(oi.update(110, 122, 109, 121, 1, DAY)); // { overnight: 0.10, intraday: 0.10 }
```

### Streaming

```python
oi = ta.OvernightIntradayReturn(-300)
for o, h, l, c, v, ts in candle_feed:
    legs = oi.update((o, h, l, c, v, ts))
    # attribute the day's P&L to overnight (gap) vs intraday (trading-hours) risk
```

## Interpretation

1. **Risk attribution.** Many equity indices earn most of their long-run return
   overnight; this indicator separates the two regimes for analysis.
2. **Strategy design.** Overnight-only and intraday-only strategies use this split
   to confirm where their edge lives.

## Common pitfalls

- **Compounding, not adding.** Total return is the product `(1+o)(1+i)-1`, not the
  sum — relevant for large moves.
- **Session boundary.** As with the rest of the family, set `utc_offset_minutes`
  to the venue's session.

## See also

- [OvernightGap](Indicator-OvernightGap) — the overnight leg in isolation.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
