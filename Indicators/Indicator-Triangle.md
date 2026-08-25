# Triangle (ascending / descending / symmetrical)

> Converging-trendline consolidation read from the last two swing highs and lows:
> ascending → `+1`, descending → `-1`, symmetrical → the sign of the latest
> swing.

## Quick reference

| Item               | Value                                                  |
|--------------------|--------------------------------------------------------|
| Family             | Chart Patterns                                         |
| Input type         | `Candle` (uses `high`, `low`)                          |
| Output type        | `f64` (`+1` / `-1` / `0`)                              |
| Output range       | `{-1.0, 0.0, +1.0}`                                    |
| Default parameters | none (swing threshold 5%, level tolerance 3%, baked)   |
| Warmup period      | `5`                                                    |
| Interpretation     | Continuation/bias of a converging range                |

## Formula

```
from the last four pivots derive (high_old, high_new, low_old, low_new):
  flat  = within ±3% ; rising/falling = beyond ±3%
  ascending   : flat highs   + rising lows    → +1
  descending  : falling highs + flat lows      → -1
  symmetrical : falling highs + rising lows     → +1 if last pivot a low, else -1
otherwise → 0
```

The symmetrical case is directionally neutral, so its sign follows the momentum
of the most recently confirmed swing. See
`crates/wickra-core/src/indicators/triangle.rs`.

## Parameters

None. Swing threshold `0.05` and level tolerance `0.03` are baked-in family
constants (`pattern_swing.rs`). `Triangle::new` is infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::Triangle, wickra::Candle) -> Option<f64> =
    <wickra::Triangle as wickra::Indicator>::update;
```

- **Python.** `update((o,h,l,c,v,ts))` → `float` (never `None`);
  `batch(open, high, low, close)` → `array.array('d')`.
- **Node.** `update(open, high, low, close)` → `number`;
  `batch(open, high, low, close)` → `number[]`.
- **WASM.** `update(open, high, low, close)` → `number`.

## Warmup

`warmup_period() == 5`. Four confirmed pivots are required; the earliest bar that
can confirm a fourth pivot is the fifth. Pinned by test `accessors_and_metadata`.

## Edge cases

- **Ascending triangle reports `+1`** (test `ascending_triangle_is_plus_one`).
- **Descending triangle reports `-1`** (test `descending_triangle_is_minus_one`).
- **Symmetrical ending on a low reports `+1`**
  (test `symmetrical_triangle_ending_low_is_plus_one`).
- **Symmetrical ending on a high reports `-1`**
  (test `symmetrical_triangle_ending_high_is_minus_one`).
- **Broadening (expanding) swings report `0.0`**
  (test `expanding_swings_are_not_a_triangle`).
- **`reset` clears state** (test `reset_clears_state`).
- **Streaming equals batch** (test `batch_equals_streaming`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, Triangle};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Flat highs (120, 120), rising lows (100 → 110) → ascending triangle.
    let bars = [
        (129.87, 130.0, 129.87, 129.87),
        (100.0, 128.7, 100.0, 100.0),
        (101.0, 120.0, 101.0, 101.0),
        (110.0, 118.8, 110.0, 110.0),
        (111.1, 120.0, 111.1, 111.1),
        (108.0, 118.8, 108.0, 108.0),
    ];
    let mut pat = Triangle::new();
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
    (129.87, 130.0, 129.87, 129.87, 1.0, 0),
    (100.0, 128.7, 100.0, 100.0, 1.0, 1),
    (101.0, 120.0, 101.0, 101.0, 1.0, 2),
    (110.0, 118.8, 110.0, 110.0, 1.0, 3),
    (111.1, 120.0, 111.1, 111.1, 1.0, 4),
    (108.0, 118.8, 108.0, 108.0, 1.0, 5),
]
pat = ta.Triangle()
print([pat.update(b) for b in bars][-1])  # 1.0
```

### Node

```javascript
const wickra = require('wickra');
const bars = [
  [129.87, 130.0, 129.87, 129.87], [100.0, 128.7, 100.0, 100.0],
  [101.0, 120.0, 101.0, 101.0], [110.0, 118.8, 110.0, 110.0],
  [111.1, 120.0, 111.1, 111.1], [108.0, 118.8, 108.0, 108.0],
];
const pat = new wickra.Triangle();
let last = 0;
for (const [o, h, l, c] of bars) last = pat.update(o, h, l, c);
console.log(last); // 1
```

### Streaming

```python
pat = ta.Triangle()
for o, h, l, c, v, ts in candle_feed:
    bias = pat.update((o, h, l, c, v, ts))
    if bias > 0:
        pass  # ascending / up-biased symmetrical — lean long on breakout
    elif bias < 0:
        pass  # descending / down-biased symmetrical — lean short on breakout
```

## Interpretation

1. **Bias, not breakout.** The sign encodes the structural bias of the converging
   range; the actual breakout (price clearing a trendline) should still confirm
   the trade. Ascending favours an upside break, descending a downside break.
2. **Symmetrical is conditional.** With no inherent direction, the symmetrical
   sign tracks the latest swing — re-evaluate as new pivots confirm.

## Common pitfalls

- **Apex proximity.** Triangles lose meaning very close to the apex; the detector
  has no apex-distance filter, so combine with elapsed-bar context.
- **One signal per confirmed pivot.** The bias can flip between consecutive pivots
  as the legs evolve; it is a running read, not a one-shot flag.

## See also

- [Wedge](/Indicators/Indicator-Wedge) — same-direction converging trendlines.
- [RectangleRange](/Indicators/Indicator-RectangleRange) — parallel (non-converging) range.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
