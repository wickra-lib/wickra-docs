# Overnight Gap

> Close-to-open return across the session boundary: `open / previous_close - 1`,
> detected automatically at each local day boundary and held for the session.

## Quick reference

| Item               | Value                                                 |
|--------------------|-------------------------------------------------------|
| Family             | Seasonality & Session                                 |
| Input type         | `Candle` (uses `open`, `close`, `timestamp`)          |
| Output type        | `f64` (simple return)                                 |
| Output range       | unbounded (typically small, e.g. `±0.05`)             |
| Default parameters | `utc_offset_minutes = 0` (UTC)                        |
| Warmup period      | `2`                                                   |
| Interpretation     | Overnight repricing; gap-fill / continuation setups   |

## Formula

```
At each new local day:
  gap = open_first_bar / close_last_bar_of_prior_day - 1
held constant until the next day boundary
```

The first session yields no gap. See
`crates/wickra-core/src/indicators/overnight_gap.rs`.

## Parameters

| Name                 | Type  | Default | Constraint | Source                | Description |
|----------------------|-------|---------|------------|-----------------------|-------------|
| `utc_offset_minutes` | `i32` | `0`     | none       | `overnight_gap.rs:34` | Shifts the instant before deriving the day boundary. |

`OvernightGap::new` is infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::OvernightGap, wickra::Candle) -> Option<f64> =
    <wickra::OvernightGap as wickra::Indicator>::update;
```

- **Python.** `update((o,h,l,c,v,ts))` → `float | None`;
  `batch(...)` → `array.array('d')` (`NaN` warmup).
- **Node.** `update(...)` → `number | null`; `batch(...)` → `number[]`.
- **WASM.** `update(...)` → `number | undefined`.

## Warmup

`warmup_period() == 2`. The first session has no prior close, so it returns
`None`; from the first boundary crossing onward a value is held for the session.

## Edge cases

- **First session has no gap** (test `first_session_has_no_gap`).
- **Gap computed at the day boundary and held** (test `computes_gap_at_day_boundary`).
- **Negative (gap-down)** values are supported (test `negative_gap_down`).
- **Zero prior close** yields a `0.0` gap rather than a non-finite value
  (test `zero_prev_close_yields_zero_gap`).
- **Reset** clears the prior close and gap (test `reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, OvernightGap};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let day = 24 * 3_600_000;
    let mut gap = OvernightGap::new(0);
    gap.update(Candle::new(99.0, 101.0, 98.0, 100.0, 1.0, 0)?);            // day 1 closes 100
    let g = gap.update(Candle::new(105.0, 106.0, 104.0, 105.5, 1.0, day)?).unwrap();
    println!("{g}"); // 0.05
    Ok(())
}
```

### Python

```python
import wickra as ta

DAY = 24 * 3_600_000
gap = ta.OvernightGap(0)
assert gap.update((99.0, 101.0, 98.0, 100.0, 1.0, 0)) is None
print(gap.update((105.0, 106.0, 104.0, 105.5, 1.0, DAY)))  # 0.05
```

### Node

```javascript
const wickra = require('wickra');
const DAY = 24 * 3_600_000;
const gap = new wickra.OvernightGap(0);
gap.update(99, 101, 98, 100, 1, 0);
console.log(gap.update(105, 106, 104, 105.5, 1, DAY)); // 0.05
```

### Streaming

```python
gap = ta.OvernightGap(-300)  # US Eastern session open
for o, h, l, c, v, ts in candle_feed:
    g = gap.update((o, h, l, c, v, ts))
    if g is not None and abs(g) > 0.02:
        pass  # large overnight gap — fade (gap-fill) or follow (continuation)
```

## Interpretation

1. **Gap-fill vs continuation.** Small gaps tend to fill intraday; large
   news-driven gaps more often continue. The gap magnitude is the key signal.
2. **Overnight risk.** The gap quantifies the portion of return earned while the
   position was held but unmonitored.

## Common pitfalls

- **Session definition.** For equities the "overnight" is the RTH close→open;
  set `utc_offset_minutes` so the day boundary matches the session, not UTC.
- **Continuous markets.** On 24/7 instruments the "gap" is whatever happens
  across the chosen midnight boundary, which may be economically meaningless.

## See also

- [OvernightIntradayReturn](/Indicators/Indicator-OvernightIntradayReturn) — splits the full
  return into overnight + intraday legs.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
