# Fibonacci Time Zones

> Vertical markers at Fibonacci bar-distances (1, 2, 3, 5, 8, 13, …) from the most
> recent confirmed swing pivot — the bars at which trend changes are classically
> anticipated.

## Quick reference

| Item               | Value                                                  |
|--------------------|--------------------------------------------------------|
| Family             | Fibonacci                                              |
| Input type         | `Candle` (uses `high`, `low`)                          |
| Output type        | `FibTimeZonesOutput` (`on_zone`, `bars_to_next`)       |
| Output range       | `on_zone` ∈ {0, 1}; `bars_to_next` ≥ 1                 |
| Default parameters | none (swing threshold 5%, baked)                       |
| Warmup period      | `2` (one confirmed pivot)                              |
| Interpretation     | Timing windows for potential reversals                 |

## Formula

```
anchor = most recent confirmed pivot; distance = cur - anchor_bar
on_zone      = 1 if distance in {1, 2, 3, 5, 8, 13, …} else 0
bars_to_next = (smallest time-zone strictly greater than distance) - distance
```

The Fibonacci time-zone sequence starts `1, 2, 3, 5, 8, …` (each term the sum of
the previous two). `bars_to_next` is never `0` — on a zone it gives the gap to the
following one. See `crates/wickra-core/src/indicators/fib_time_zones.rs`.

## Parameters

None. The swing threshold `0.05` is a baked-in family constant; the sequence is
fixed. `FibTimeZones::new` is infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::FibTimeZones, wickra::Candle) -> Option<wickra::FibTimeZonesOutput> =
    <wickra::FibTimeZones as wickra::Indicator>::update;
```

- **Python.** `update((o,h,l,c,v,ts))` → `(on_zone, bars_to_next)` or `None`;
  `batch(high, low)` → `(n, 2)` `ndarray` (`NaN` warmup).
- **Node.** `update(high, low)` → `{ onZone, barsToNext }` or `null`;
  `batch(high, low)` → flat `number[]` length `n*2`.
- **WASM.** `update(high, low)` → object (`onZone`/`barsToNext`) or `null`.

## Warmup

`warmup_period() == 2`. One confirmed pivot is needed as the anchor; before that
`update` returns `None`. Pinned by tests `accessors_and_metadata` and
`no_output_before_first_pivot`.

## Edge cases

- **Flags zones and counts to the next** — `on_zone` is `1` at distances 1/2/3/5,
  `0` at 4, with `bars_to_next` decrementing toward each zone (test
  `flags_zones_and_counts_to_next`).
- **`reset` clears all state** (test `reset_clears_state`).
- **Streaming equals batch** (test `batch_equals_streaming`).

## Examples

### Rust

```rust
use wickra::{Candle, FibTimeZones, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // High @200 confirmed (anchor at bar 0); then flat bars advance time.
    let mut bars = vec![(199.0, 200.0, 199.0, 199.0), (150.0, 190.0, 150.0, 150.0)];
    for _ in 0..4 {
        bars.push((151.0, 155.0, 151.0, 151.0));
    }
    let mut tz = FibTimeZones::new();
    let mut last = None;
    for (ts, (o, h, l, c)) in bars.iter().enumerate() {
        last = tz.update(Candle::new(*o, *h, *l, *c, 1.0, ts as i64)?);
    }
    let v = last.unwrap(); // distance 5 → on a zone, next zone at 8
    println!("{} {}", v.on_zone, v.bars_to_next); // 1 3
    Ok(())
}
```

### Python

```python
import wickra as ta

bars = [
    (199.0, 200.0, 199.0, 199.0, 1.0, 0),
    (150.0, 190.0, 150.0, 150.0, 1.0, 1),
] + [(151.0, 155.0, 151.0, 151.0, 1.0, ts) for ts in range(2, 6)]
tz = ta.FibTimeZones()
print([tz.update(b) for b in bars][-1])  # (1.0, 3.0)
```

### Node

```javascript
const wickra = require('wickra');
const tz = new wickra.FibTimeZones();
const bars = [[200.0, 199.0], [190.0, 150.0], [155.0, 151.0],
              [155.0, 151.0], [155.0, 151.0], [155.0, 151.0]];
let last = null;
for (const [h, l] of bars) last = tz.update(h, l);
console.log(last.onZone, last.barsToNext); // 1 3
```

### Streaming

```python
tz = ta.FibTimeZones()
for o, h, l, c, v, ts in candle_feed:
    z = tz.update((o, h, l, c, v, ts))
    if z is not None and z[0] == 1.0:
        pass  # current bar lands on a Fibonacci time zone — watch for a turn
```

## Interpretation

1. **Timing, not price.** Where the other Fibonacci tools answer "at what price?",
   time zones answer "at which bar?" — they flag windows for potential reversals.
2. **Anchored on structure.** The grid resets to the latest confirmed swing pivot,
   so it tracks the most relevant recent turning point.

## Common pitfalls

- **A timing aid, not a signal.** Landing on a zone does not imply a reversal;
  confirm with price action.
- **Anchor shifts.** When a new pivot confirms, the grid re-anchors and distances
  restart.

## References

- Fischer, R. *Fibonacci Applications and Strategies for Traders* (1993).

## See also

- [FibFan](Indicator-FibFan), [FibArcs](Indicator-FibArcs),
  [ZigZag](Indicator-ZigZag).
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
