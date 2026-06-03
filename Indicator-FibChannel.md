# Fibonacci Channel

> A sloped base trendline through the two same-direction outer pivots, plus
> parallel lines offset by Fibonacci multiples of the channel width set by the
> opposite middle pivot.

## Quick reference

| Item               | Value                                                  |
|--------------------|--------------------------------------------------------|
| Family             | Fibonacci                                              |
| Input type         | `Candle` (uses `high`, `low`)                          |
| Output type        | `FibChannelOutput` (`base`, `level_618/1000/1618`)     |
| Output range       | parallel channel lines at the current bar              |
| Default parameters | none (swing threshold 5%, baked)                       |
| Warmup period      | `3` (three confirmed pivots)                           |
| Interpretation     | Sloped channel support/resistance                      |

## Formula

```
last three pivots p0, p1, p2 (p0/p2 same direction, p1 opposite):
  slope     = (p2 - p0) / (bar2 - bar0)
  base(bar) = p0 + slope * (bar - bar0)
  width     = p1 - base(bar1)
  level(r)  = base(cur) + r * width
for r in {0.618, 1.0, 1.618}, cur = current bar index
```

`level_1000` is the opposite channel boundary (through `p1`); the 61.8% and
161.8% lines sit inside and beyond it. The two same-direction pivots occur at
distinct bars, so the slope is well-defined. See
`crates/wickra-core/src/indicators/fib_channel.rs`.

## Parameters

None. The swing threshold `0.05` is a baked-in family constant; the three ratios
are fixed. `FibChannel::new` is infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::FibChannel, wickra::Candle) -> Option<wickra::FibChannelOutput> =
    <wickra::FibChannel as wickra::Indicator>::update;
```

- **Python.** `update((o,h,l,c,v,ts))` → `(base, level_618, level_1000,
  level_1618)` or `None`; `batch(high, low)` → `(n, 4)` `ndarray` (`NaN` warmup).
- **Node.** `update(high, low)` → `{ base, level618, level1000, level1618 }` or
  `null`; `batch(high, low)` → flat `number[]` length `n*4`.
- **WASM.** `update(high, low)` → object (same camelCase keys) or `null`.

## Warmup

`warmup_period() == 3`. Three confirmed pivots are required (two to slope the
base, one for the width); before that `update` returns `None`. Pinned by tests
`accessors_and_metadata` and `no_output_before_three_pivots`.

## Edge cases

- **Channel levels from three pivots** are exact (test
  `channel_levels_from_three_pivots`).
- **`reset` clears all state** (test `reset_clears_state`).
- **Streaming equals batch** (test `batch_equals_streaming`).

## Examples

### Rust

```rust
use wickra::{Candle, FibChannel, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Highs at (bar0, 200) and (bar3, 220); low (bar1, 100) sets the width.
    let bars = [
        (199.0, 200.0, 199.0, 199.0),
        (100.0, 190.0, 100.0, 100.0), // confirm high @200, low @100
        (108.0, 110.0, 108.0, 108.0), // confirm low @100
        (210.0, 220.0, 210.0, 210.0), // extend high to 220 (bar 3)
        (150.0, 200.0, 150.0, 150.0), // confirm high @220 -> three pivots
    ];
    let mut chan = FibChannel::new();
    let mut last = None;
    for (ts, (o, h, l, c)) in bars.iter().enumerate() {
        last = chan.update(Candle::new(*o, *h, *l, *c, 1.0, ts as i64)?);
    }
    let v = last.unwrap();
    println!("{:.3} {}", v.base, v.level_1000); // 226.667 120
    Ok(())
}
```

### Python

```python
import wickra as ta

bars = [
    (199.0, 200.0, 199.0, 199.0, 1.0, 0),
    (100.0, 190.0, 100.0, 100.0, 1.0, 1),
    (108.0, 110.0, 108.0, 108.0, 1.0, 2),
    (210.0, 220.0, 210.0, 210.0, 1.0, 3),
    (150.0, 200.0, 150.0, 150.0, 1.0, 4),
]
chan = ta.FibChannel()
print([chan.update(b) for b in bars][-1])
# (226.6666667, 160.7466667, 120.0, 54.08)
```

### Node

```javascript
const wickra = require('wickra');
const chan = new wickra.FibChannel();
const bars = [[200.0, 199.0], [190.0, 100.0], [110.0, 108.0],
              [220.0, 210.0], [200.0, 150.0]];
let last = null;
for (const [h, l] of bars) last = chan.update(h, l);
console.log(last.base.toFixed(3), last.level1000); // 226.667 120
```

### Streaming

```python
chan = ta.FibChannel()
for o, h, l, c, v, ts in candle_feed:
    lines = chan.update((o, h, l, c, v, ts))
    if lines is not None and c > lines[3]:
        pass  # price above the 161.8% channel line — strong breakout
```

## Interpretation

1. **Sloped band.** The channel rides the trend's slope, unlike a flat
   support/resistance zone, so the boundaries adapt as the trend advances.
2. **Width-scaled targets.** The 61.8% / 161.8% lines extrapolate the established
   channel width as the next reaction levels.

## Common pitfalls

- **Needs a clean three-pivot structure.** With erratic swings the base slope can
  be steep; read it together with the raw pivots.
- **Re-anchors on new pivots.** Each new confirmed pivot shifts the three-point
  window and can re-slope the channel.

## References

- Fischer, R. *Fibonacci Applications and Strategies for Traders* (1993).

## See also

- [FibFan](Indicator-FibFan), [FibArcs](Indicator-FibArcs),
  [LinRegChannel](Indicator-LinRegChannel).
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
