# Triple Top / Bottom

> Three-extreme reversal — a stronger cousin of the double top/bottom. Three
> matching highs → bearish `-1`; three matching lows → bullish `+1`.

## Quick reference

| Item               | Value                                                  |
|--------------------|--------------------------------------------------------|
| Family             | Chart Patterns                                         |
| Input type         | `Candle` (uses `high`, `low`)                          |
| Output type        | `f64` (`+1` / `-1` / `0`)                              |
| Output range       | `{-1.0, 0.0, +1.0}`                                    |
| Default parameters | none (swing threshold 5%, level tolerance 3%, baked)   |
| Warmup period      | `6`                                                    |
| Interpretation     | Reversal — confirmed on the third matching extreme     |

## Formula

```
swing pivots confirmed by a 5% non-repainting zig-zag (pattern_swing)
on each new pivot, inspect the three same-direction extremes (n-5, n-3, n-1):
  triple top    : High₁ ≈ High₂ ≈ High₃ (±3%)  → -1
  triple bottom : Low₁  ≈ Low₂  ≈ Low₃  (±3%)  → +1
otherwise → 0
```

See `crates/wickra-core/src/indicators/triple_top_bottom.rs`.

## Parameters

None. Swing threshold `0.05` and level tolerance `0.03` are baked-in family
constants (`pattern_swing.rs`). `TripleTopBottom::new` is infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::TripleTopBottom, wickra::Candle) -> Option<f64> =
    <wickra::TripleTopBottom as wickra::Indicator>::update;
```

- **Python.** `update((o,h,l,c,v,ts))` → `float` (never `None`);
  `batch(open, high, low, close)` → 1-D `ndarray`.
- **Node.** `update(open, high, low, close)` → `number`;
  `batch(open, high, low, close)` → `number[]`.
- **WASM.** `update(open, high, low, close)` → `number`.

## Warmup

`warmup_period() == 6`. Five confirmed pivots are required; the earliest bar that
can confirm a fifth pivot is the sixth. Pinned by test `accessors_and_metadata`.

## Edge cases

- **Triple top reports `-1`** (test `triple_top_is_minus_one`).
- **Triple bottom reports `+1`** (test `triple_bottom_is_plus_one`).
- **Divergent third peak reports `0.0`** (test `unequal_third_peak_does_not_trigger`).
- **`reset` clears state** (test `reset_clears_state`).
- **Streaming equals batch** (test `batch_equals_streaming`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, TripleTopBottom};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let bars = [
        (119.88, 120.0, 119.88, 119.88),
        (100.0, 118.8, 100.0, 100.0),
        (101.0, 121.0, 101.0, 101.0),
        (99.0, 119.79, 99.0, 99.0),
        (99.99, 119.0, 99.99, 99.99),
        (107.1, 117.81, 107.1, 107.1), // third matching top → triple top
    ];
    let mut pat = TripleTopBottom::new();
    let mut last = 0.0;
    for (ts, (o, h, l, c)) in bars.iter().enumerate() {
        last = pat.update(Candle::new(*o, *h, *l, *c, 1.0, ts as i64)?).unwrap();
    }
    println!("{last}"); // -1
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
    (99.99, 119.0, 99.99, 99.99, 1.0, 4),
    (107.1, 117.81, 107.1, 107.1, 1.0, 5),
]
pat = ta.TripleTopBottom()
print([pat.update(b) for b in bars][-1])  # -1.0
```

### Node

```javascript
const wickra = require('wickra');
const bars = [
  [119.88, 120.0, 119.88, 119.88], [100.0, 118.8, 100.0, 100.0],
  [101.0, 121.0, 101.0, 101.0], [99.0, 119.79, 99.0, 99.0],
  [99.99, 119.0, 99.99, 99.99], [107.1, 117.81, 107.1, 107.1],
];
const pat = new wickra.TripleTopBottom();
let last = 0;
for (const [o, h, l, c] of bars) last = pat.update(o, h, l, c);
console.log(last); // -1
```

### Streaming

```python
pat = ta.TripleTopBottom()
for o, h, l, c, v, ts in candle_feed:
    signal = pat.update((o, h, l, c, v, ts))
    if signal != 0:
        pass  # triple reversal confirmed (strong: three rejections at a level)
```

## Interpretation

1. **Stronger than a double.** Three rejections at the same level imply a more
   durable supply/demand zone; the breakout that follows a failed triple often
   carries further.
2. **Confirmation lag.** Like all swing patterns it confirms on the third pivot,
   one threshold move after the visual extreme.

## Common pitfalls

- **Rarity.** Three matching extremes within tolerance is uncommon; expect far
  fewer signals than the double top/bottom.
- **Overlap with rectangle.** A triple top with a flat trough resembles a
  rectangle; the two detectors can fire on overlapping structures.

## See also

- [DoubleTopBottom](Indicator-DoubleTopBottom) — the two-extreme variant.
- [RectangleRange](Indicator-RectangleRange) — flat support/resistance range.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
