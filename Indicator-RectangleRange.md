# Rectangle / Range

> Price oscillating between a roughly horizontal support and resistance — a
> mean-reversion structure. A bounce off support → `+1`; a rejection at
> resistance → `-1`.

## Quick reference

| Item               | Value                                                  |
|--------------------|--------------------------------------------------------|
| Family             | Chart Patterns                                         |
| Input type         | `Candle` (uses `high`, `low`)                          |
| Output type        | `f64` (`+1` / `-1` / `0`)                              |
| Output range       | `{-1.0, 0.0, +1.0}`                                    |
| Default parameters | none (swing threshold 5%, level tolerance 3%, baked)   |
| Warmup period      | `5`                                                    |
| Interpretation     | Range-trade / mean-reversion off the touched boundary  |

## Formula

```
from the last four pivots derive (high_old, high_new, low_old, low_new):
  flat highs (resistance) AND flat lows (support), each within ±3%:
    last pivot a low  → +1  (bounce off support)
    last pivot a high → -1  (rejection at resistance)
otherwise → 0
```

Unlike the breakout patterns the rectangle is range-bound, so the sign encodes
the actionable mean-reversion direction of the just-confirmed touch. See
`crates/wickra-core/src/indicators/rectangle_range.rs`.

## Parameters

None. Swing threshold `0.05` and level tolerance `0.03` are baked-in family
constants (`pattern_swing.rs`). `RectangleRange::new` is infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::RectangleRange, wickra::Candle) -> Option<f64> =
    <wickra::RectangleRange as wickra::Indicator>::update;
```

- **Python.** `update((o,h,l,c,v,ts))` → `float` (never `None`);
  `batch(open, high, low, close)` → 1-D `ndarray`.
- **Node.** `update(open, high, low, close)` → `number`;
  `batch(open, high, low, close)` → `number[]`.
- **WASM.** `update(open, high, low, close)` → `number`.

## Warmup

`warmup_period() == 5`. Four confirmed pivots are required; the earliest bar that
can confirm a fourth pivot is the fifth. Pinned by test `accessors_and_metadata`.

## Edge cases

- **Bounce off support reports `+1`** (test `range_bounce_off_support_is_plus_one`).
- **Rejection at resistance reports `-1`**
  (test `range_rejection_at_resistance_is_minus_one`).
- **Trending highs (no flat resistance) report `0.0`**
  (test `trending_highs_are_not_a_rectangle`).
- **`reset` clears state** (test `reset_clears_state`).
- **Streaming equals batch** (test `batch_equals_streaming`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, RectangleRange};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Flat highs (120, 121), flat lows (100, 99); last pivot a low → +1.
    let bars = [
        (119.88, 120.0, 119.88, 119.88),
        (100.0, 118.8, 100.0, 100.0),
        (101.0, 121.0, 101.0, 101.0),
        (99.0, 119.79, 99.0, 99.0),
        (99.99, 108.9, 99.99, 99.99),
    ];
    let mut pat = RectangleRange::new();
    let mut last = 0.0;
    for (ts, (o, h, l, c)) in bars.iter().enumerate() {
        last = pat.update(Candle::new(*o, *h, *l, *c, 1.0, ts as i64)?).unwrap();
    }
    println!("{last}"); // 1
    Ok(())
}
```

### Python

```python
import wickra as ta

bars = [
    (119.88, 120.0, 119.88, 119.88, 1.0, 0),
    (100.0, 118.8, 100.0, 100.0, 1.0, 1),
    (101.0, 121.0, 101.0, 101.0, 1.0, 2),
    (99.0, 119.79, 99.0, 99.0, 1.0, 3),
    (99.99, 108.9, 99.99, 99.99, 1.0, 4),
]
pat = ta.RectangleRange()
print([pat.update(b) for b in bars][-1])  # 1.0
```

### Node

```javascript
const wickra = require('wickra');
const bars = [
  [119.88, 120.0, 119.88, 119.88], [100.0, 118.8, 100.0, 100.0],
  [101.0, 121.0, 101.0, 101.0], [99.0, 119.79, 99.0, 99.0],
  [99.99, 108.9, 99.99, 99.99],
];
const pat = new wickra.RectangleRange();
let last = 0;
for (const [o, h, l, c] of bars) last = pat.update(o, h, l, c);
console.log(last); // 1
```

### Streaming

```python
pat = ta.RectangleRange()
for o, h, l, c, v, ts in candle_feed:
    signal = pat.update((o, h, l, c, v, ts))
    if signal > 0:
        pass  # touched support inside a range — fade long
    elif signal < 0:
        pass  # touched resistance inside a range — fade short
```

## Interpretation

1. **Mean reversion, not breakout.** The sign points back into the range from the
   just-touched boundary. When the range eventually breaks, expect the detector to
   stop firing (the highs or lows are no longer flat).
2. **Boundary quality.** Tighter flat highs/lows (well within tolerance) mark a
   cleaner range and a more reliable fade.

## Common pitfalls

- **Breakout blindness.** This detector does not signal the breakout itself — it
  signals range touches; pair it with a breakout/trend detector for the exit.
- **Overlap with triple top/bottom.** A rectangle with three touches resembles a
  triple pattern; both detectors may fire on the same structure.

## See also

- [Triangle](Indicator-Triangle) — converging (non-parallel) range.
- [TripleTopBottom](Indicator-TripleTopBottom) — three rejections at one level.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
