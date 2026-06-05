# Cup and Handle

> A rounded base (the cup) followed by a shallow pullback near the rim (the
> handle), then a breakout in the cup's direction. Bullish → `+1`; inverse → `-1`.

## Quick reference

| Item               | Value                                                  |
|--------------------|--------------------------------------------------------|
| Family             | Chart Patterns                                         |
| Input type         | `Candle` (uses `high`, `low`)                          |
| Output type        | `f64` (`+1` / `-1` / `0`)                              |
| Output range       | `{-1.0, 0.0, +1.0}`                                    |
| Default parameters | none (swing threshold 5%, level tolerance 3%, baked)   |
| Warmup period      | `5`                                                    |
| Interpretation     | Continuation — breakout from a rounded base            |

## Formula

```
from the last four pivots:
  cup-and-handle (bullish, +1):  Rim(high), Cup(low), Rim(high), Handle(low)
    rims match (±3%) ; handle low ABOVE the cup low ; handle below the right rim
  inverse (bearish, -1):         Rim(low), Cap(high), Rim(low), Handle(high)
    rims match ; handle high BELOW the cap high ; handle above the right rim
otherwise → 0
```

The shallow handle (closer to the rim than the cup extreme) distinguishes a
cup-and-handle from a plain double bottom/top. See
`crates/wickra-core/src/indicators/cup_and_handle.rs`.

## Parameters

None. Swing threshold `0.05` and level tolerance `0.03` are baked-in family
constants (`pattern_swing.rs`). `CupAndHandle::new` is infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::CupAndHandle, wickra::Candle) -> Option<f64> =
    <wickra::CupAndHandle as wickra::Indicator>::update;
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

- **Cup-and-handle reports `+1`** (test `cup_and_handle_is_plus_one`).
- **Inverse reports `-1`** (test `inverse_cup_and_handle_is_minus_one`).
- **Deep handle (below the cup low) reports `0.0`** — that is a double bottom, not
  cup-and-handle (test `deep_handle_is_not_cup_and_handle`).
- **Inverse with mismatched rims reports `0.0`**
  (test `inverse_with_mismatched_rims_does_not_trigger`).
- **`reset` clears state** (test `reset_clears_state`).
- **Streaming equals batch** (test `batch_equals_streaming`).

## Examples

### Rust

```rust
use wickra::{Candle, CupAndHandle, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Rims 120/121, cup 90 (deep), handle 110 (shallow, above the cup) → +1.
    let bars = [
        (119.88, 120.0, 119.88, 119.88),
        (90.0, 118.8, 90.0, 90.0),
        (90.9, 121.0, 90.9, 90.9),
        (110.0, 119.79, 110.0, 110.0),
        (111.1, 121.0, 111.1, 111.1),
    ];
    let mut pat = CupAndHandle::new();
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
    (90.0, 118.8, 90.0, 90.0, 1.0, 1),
    (90.9, 121.0, 90.9, 90.9, 1.0, 2),
    (110.0, 119.79, 110.0, 110.0, 1.0, 3),
    (111.1, 121.0, 111.1, 111.1, 1.0, 4),
]
pat = ta.CupAndHandle()
print([pat.update(b) for b in bars][-1])  # 1.0
```

### Node

```javascript
const wickra = require('wickra');
const bars = [
  [119.88, 120.0, 119.88, 119.88], [90.0, 118.8, 90.0, 90.0],
  [90.9, 121.0, 90.9, 90.9], [110.0, 119.79, 110.0, 110.0],
  [111.1, 121.0, 111.1, 111.1],
];
const pat = new wickra.CupAndHandle();
let last = 0;
for (const [o, h, l, c] of bars) last = pat.update(o, h, l, c);
console.log(last); // 1
```

### Streaming

```python
pat = ta.CupAndHandle()
for o, h, l, c, v, ts in candle_feed:
    signal = pat.update((o, h, l, c, v, ts))
    if signal > 0:
        pass  # cup-and-handle — continuation breakout higher
    elif signal < 0:
        pass  # inverse cup-and-handle — breakdown lower
```

## Interpretation

1. **Shallow handle is the tell.** The handle must retrace less than the cup
   depth; a deeper pullback degenerates into a double bottom, which the detector
   reports as `0.0` (defer to [DoubleTopBottom](/Indicators/Indicator-DoubleTopBottom)).
2. **Continuation.** Classically a bullish continuation after a base; the inverse
   is its bearish mirror.

## Common pitfalls

- **U vs V.** This swing-based approximation cannot tell a rounded "U" cup from a
  sharp "V"; it keys on the rim/cup/handle pivot levels, not curvature.
- **Rim tolerance.** The two rims must match within 3%; an asymmetric base will
  not register.

## See also

- [DoubleTopBottom](/Indicators/Indicator-DoubleTopBottom) — the deeper-handle degenerate case.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
