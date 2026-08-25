# Fibonacci Projection

> A measured move from the last three confirmed pivots A-B-C: the A→B leg
> projected from C at the canonical ratios (61.8/100/161.8/261.8%) — the C→D
> target zone.

## Quick reference

| Item               | Value                                                  |
|--------------------|--------------------------------------------------------|
| Family             | Fibonacci                                              |
| Input type         | `Candle` (uses `high`, `low`)                          |
| Output type        | `FibProjectionOutput` (4 prices)                       |
| Output range       | projected from C in the A→B direction                  |
| Default parameters | none (swing threshold 5%, baked)                       |
| Warmup period      | `3` (three confirmed pivots)                           |
| Interpretation     | C→D measured-move targets                              |

## Formula

```
last three confirmed pivots A, B, C:
  level(p) = C + p * (B - A)
for p in {0.618, 1.0, 1.618, 2.618}
```

`level_1000` is the classic AB=CD measured move (the C→D leg equals A→B). See
`crates/wickra-core/src/indicators/fib_projection.rs`.

## Parameters

None. The swing threshold `0.05` is a baked-in family constant
(`pattern_swing.rs`); the four ratios are fixed. `FibProjection::new` is
infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::FibProjection, wickra::Candle) -> Option<wickra::FibProjectionOutput> =
    <wickra::FibProjection as wickra::Indicator>::update;
```

- **Python.** `update((o,h,l,c,v,ts))` → `(level_618, level_1000, level_1618,
  level_2618)` or `None`; `batch(high, low)` → `(n, 4)` `Matrix` (`NaN` warmup).
- **Node.** `update(high, low)` → `{ level618, level1000, level1618, level2618 }`
  or `null`; `batch(high, low)` → flat `number[]` length `n*4`.
- **WASM.** `update(high, low)` → object (same camelCase keys) or `null`.

## Warmup

`warmup_period() == 3`. Three confirmed pivots (A, B, C) are required; before
that `update` returns `None`. Pinned by tests `accessors_and_metadata` and
`no_output_before_three_pivots`.

## Edge cases

- **Measured move from three pivots** is exact (test
  `measured_move_from_three_pivots`).
- **`reset` clears all state** (test `reset_clears_state`).
- **Streaming equals batch** (test `batch_equals_streaming`).

## Examples

### Rust

```rust
use wickra::{Candle, FibProjection, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // A=200 (high), B=160 (low), C=190 (high): A->B = -40, projected from C.
    let bars = [
        (199.8, 200.0, 199.8, 199.8),
        (160.0, 198.0, 160.0, 160.0), // confirms A @200
        (161.6, 190.0, 161.6, 161.6), // confirms B @160
        (171.0, 188.1, 171.0, 171.0), // confirms C @190 (projection ready)
    ];
    let mut fib = FibProjection::new();
    let mut last = None;
    for (ts, (o, h, l, c)) in bars.iter().enumerate() {
        last = fib.update(Candle::new(*o, *h, *l, *c, 1.0, ts as i64)?);
    }
    let v = last.unwrap();
    println!("{} {}", v.level_1000, v.level_1618); // 150 125.28
    Ok(())
}
```

### Python

```python
import wickra as ta

bars = [
    (199.8, 200.0, 199.8, 199.8, 1.0, 0),
    (160.0, 198.0, 160.0, 160.0, 1.0, 1),
    (161.6, 190.0, 161.6, 161.6, 1.0, 2),
    (171.0, 188.1, 171.0, 171.0, 1.0, 3),
]
fib = ta.FibProjection()
print([fib.update(b) for b in bars][-1])
# (165.28, 150.0, 125.28, 85.28)
```

### Node

```javascript
const wickra = require('wickra');
const fib = new wickra.FibProjection();
const bars = [[200.0, 199.8], [198.0, 160.0], [190.0, 161.6], [188.1, 171.0]];
let last = null;
for (const [h, l] of bars) last = fib.update(h, l);
console.log(last.level1000, last.level1618); // 150 125.28
```

### Streaming

```python
fib = ta.FibProjection()
for o, h, l, c, v, ts in candle_feed:
    proj = fib.update((o, h, l, c, v, ts))
    if proj is not None:
        abcd_target = proj[1]  # 100% — the AB=CD completion price
```

## Interpretation

1. **Measured move.** After A→B→C, the projection answers "if D mirrors A→B, where
   does it land?" — the 100% level is the AB=CD target.
2. **Three-point vs two-point.** Unlike [FibExtension](/Indicators/Indicator-FibExtension),
   which extends a single leg, projection uses the A→B magnitude but anchors at C.

## Common pitfalls

- **Needs three pivots.** Returns `None` longer than the two-point tools; on short
  histories it may never emit.
- **Direction inherited from A→B.** The projection continues the A→B sign from C;
  read targets relative to that direction.

## References

- Carney, S. *Harmonic Trading* (2010); Fischer, R. *Fibonacci Applications* (1993).

## See also

- [FibExtension](/Indicators/Indicator-FibExtension), [FibRetracement](/Indicators/Indicator-FibRetracement),
  [Abcd](/Indicators/Indicator-Abcd).
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
