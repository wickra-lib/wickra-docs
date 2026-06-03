# Fibonacci Fan

> Three trendlines fanning from the start of the most recent swing leg through
> its 38.2 / 50 / 61.8 % retracement levels at the leg's end bar, extended to the
> current bar.

## Quick reference

| Item               | Value                                                  |
|--------------------|--------------------------------------------------------|
| Family             | Fibonacci                                              |
| Input type         | `Candle` (uses `high`, `low`)                          |
| Output type        | `FibFanOutput` (`fan_382`, `fan_500`, `fan_618`)       |
| Output range       | diverges from the swing start over time                |
| Default parameters | none (swing threshold 5%, baked)                       |
| Warmup period      | `2` (two confirmed pivots)                             |
| Interpretation     | Sloped, time-aware support/resistance                  |

## Formula

```
last two pivots define a leg start -> end at bars (start_bar, end_bar):
  progress = (cur - start_bar) / (end_bar - start_bar)
  fan(r)   = start + r * (end - start) * progress
for r in {0.382, 0.5, 0.618}, cur = current bar index
```

All three lines emanate from `(start_bar, start)` and pass through the
retracement levels located at `end_bar`; as `cur` advances past the end bar the
fan opens. Consecutive pivots sit at strictly increasing bars, so the span is
never zero. See `crates/wickra-core/src/indicators/fib_fan.rs`.

## Parameters

None. The swing threshold `0.05` is a baked-in family constant; the three fan
ratios are fixed. `FibFan::new` is infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::FibFan, wickra::Candle) -> Option<wickra::FibFanOutput> =
    <wickra::FibFan as wickra::Indicator>::update;
```

- **Python.** `update((o,h,l,c,v,ts))` → `(fan_382, fan_500, fan_618)` or `None`;
  `batch(high, low)` → `(n, 3)` `ndarray` (`NaN` warmup).
- **Node.** `update(high, low)` → `{ fan382, fan500, fan618 }` or `null`;
  `batch(high, low)` → flat `number[]` length `n*3`.
- **WASM.** `update(high, low)` → object (same camelCase keys) or `null`.

## Warmup

`warmup_period() == 2`. Two confirmed pivots define the leg; before that `update`
returns `None`. Pinned by tests `accessors_and_metadata` and
`no_output_before_two_pivots`.

## Edge cases

- **Fan lines open with elapsed time** — at one leg-width past the end the fan
  has doubled its spread (test `fan_lines_open_with_elapsed_time`).
- **`reset` clears all state** (test `reset_clears_state`).
- **Streaming equals batch** (test `batch_equals_streaming`).

## Examples

### Rust

```rust
use wickra::{Candle, FibFan, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Leg start 200 (bar 0) -> end 100 (bar 2), confirmed at bar 3.
    let bars = [
        (199.0, 200.0, 199.0, 199.0),
        (160.0, 190.0, 160.0, 160.0), // confirm high @200
        (100.0, 150.0, 100.0, 100.0), // extend low to 100 (bar 2)
        (105.0, 110.0, 105.0, 105.0), // confirm low @100 -> two pivots
    ];
    let mut fan = FibFan::new();
    let mut last = None;
    for (ts, (o, h, l, c)) in bars.iter().enumerate() {
        last = fan.update(Candle::new(*o, *h, *l, *c, 1.0, ts as i64)?);
    }
    let v = last.unwrap();
    // progress = 3 / 2 = 1.5.
    println!("{} {} {}", v.fan_382, v.fan_500, v.fan_618); // 142.7 125 107.3
    Ok(())
}
```

### Python

```python
import wickra as ta

bars = [
    (199.0, 200.0, 199.0, 199.0, 1.0, 0),
    (160.0, 190.0, 160.0, 160.0, 1.0, 1),
    (100.0, 150.0, 100.0, 100.0, 1.0, 2),
    (105.0, 110.0, 105.0, 105.0, 1.0, 3),
]
fan = ta.FibFan()
print([fan.update(b) for b in bars][-1])  # (142.7, 125.0, 107.3)
```

### Node

```javascript
const wickra = require('wickra');
const fan = new wickra.FibFan();
const bars = [[200.0, 199.0], [190.0, 160.0], [150.0, 100.0], [110.0, 105.0]];
let last = null;
for (const [h, l] of bars) last = fan.update(h, l);
console.log(last.fan382, last.fan500, last.fan618); // 142.7 125 107.3
```

### Streaming

```python
fan = ta.FibFan()
for o, h, l, c, v, ts in candle_feed:
    lines = fan.update((o, h, l, c, v, ts))
    if lines is not None and c < lines[2]:
        pass  # price below the 61.8% fan line — trend weakening
```

## Interpretation

1. **Time-aware levels.** Unlike a flat retracement grid, fan lines slope, so the
   "support" price they imply moves with each bar.
2. **Trend health.** Holding above the fan lines (in an uptrend) signals strength;
   slicing through them suggests the trend is rolling over.

## Common pitfalls

- **Diverges without bound.** Far past the leg, the fan lines spread widely and
  lose practical meaning; they are most useful near the swing.
- **Latest leg only.** Re-anchors when a new leg confirms.

## References

- Fischer, R. *Fibonacci Applications and Strategies for Traders* (1993).

## See also

- [FibArcs](Indicator-FibArcs), [FibChannel](Indicator-FibChannel),
  [FibRetracement](Indicator-FibRetracement).
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
