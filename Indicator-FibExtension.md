# Fibonacci Extension

> The five canonical extension ratios (127.2/141.4/161.8/200/261.8%) of the most
> recent swing leg, projected in the direction of the move — the targets a
> continuation would reach.

## Quick reference

| Item               | Value                                                  |
|--------------------|--------------------------------------------------------|
| Family             | Fibonacci                                              |
| Input type         | `Candle` (uses `high`, `low`)                          |
| Output type        | `FibExtensionOutput` (5 prices)                        |
| Output range       | beyond the leg end, in the move direction              |
| Default parameters | none (swing threshold 5%, baked)                       |
| Warmup period      | `2` (two confirmed pivots)                             |
| Interpretation     | Continuation price targets                             |

## Formula

```
last two confirmed pivots define a leg start -> end:
  level(e) = start + e * (end - start)
for e in {1.272, 1.414, 1.618, 2.0, 2.618}
```

Each level is a multiple of the leg measured from its origin, so every ratio
projects past `end` in the direction of the move. See
`crates/wickra-core/src/indicators/fib_extension.rs`.

## Parameters

None. The swing threshold `0.05` is a baked-in family constant
(`pattern_swing.rs`); the five ratios are fixed. `FibExtension::new` is
infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::FibExtension, wickra::Candle) -> Option<wickra::FibExtensionOutput> =
    <wickra::FibExtension as wickra::Indicator>::update;
```

- **Python.** `update((o,h,l,c,v,ts))` → `(level_1272, level_1414, level_1618,
  level_2000, level_2618)` or `None`; `batch(high, low)` → `(n, 5)` `ndarray`
  (`NaN` warmup rows).
- **Node.** `update(high, low)` → `{ level1272, level1414, level1618, level2000,
  level2618 }` or `null`; `batch(high, low)` → flat `number[]` length `n*5`.
- **WASM.** `update(high, low)` → object (same camelCase keys) or `null`.

## Warmup

`warmup_period() == 2`. Two confirmed pivots define the leg; before that `update`
returns `None`. Pinned by tests `accessors_and_metadata` and
`no_output_before_two_pivots`.

## Edge cases

- **Extension levels of a confirmed down leg** are exact, including the 200%
  level landing on `0` for a 200→100 leg (test `extension_levels_of_a_down_leg`).
- **`reset` clears all state** (test `reset_clears_state`).
- **Streaming equals batch** (test `batch_equals_streaming`).

## Examples

### Rust

```rust
use wickra::{Candle, FibExtension, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Leg 200 (high) -> 100 (low); extensions project the drop further down.
    let bars = [
        (199.8, 200.0, 199.8, 199.8),
        (100.0, 198.0, 100.0, 100.0),
        (101.0, 110.0, 101.0, 101.0),
    ];
    let mut fib = FibExtension::new();
    let mut last = None;
    for (ts, (o, h, l, c)) in bars.iter().enumerate() {
        last = fib.update(Candle::new(*o, *h, *l, *c, 1.0, ts as i64)?);
    }
    let v = last.unwrap();
    println!("{} {} {}", v.level_1272, v.level_1618, v.level_2000); // 72.8 38.2 0
    Ok(())
}
```

### Python

```python
import wickra as ta

bars = [
    (199.8, 200.0, 199.8, 199.8, 1.0, 0),
    (100.0, 198.0, 100.0, 100.0, 1.0, 1),
    (101.0, 110.0, 101.0, 101.0, 1.0, 2),
]
fib = ta.FibExtension()
print([fib.update(b) for b in bars][-1])
# (72.8, 58.6, 38.2, 0.0, -61.8)
```

### Node

```javascript
const wickra = require('wickra');
const fib = new wickra.FibExtension();
let last = null;
for (const [h, l] of [[200.0, 199.8], [198.0, 100.0], [110.0, 101.0]]) {
  last = fib.update(h, l);
}
console.log(last.level1272, last.level1618); // 72.8 38.2
```

### Streaming

```python
fib = ta.FibExtension()
for o, h, l, c, v, ts in candle_feed:
    ext = fib.update((o, h, l, c, v, ts))
    if ext is not None:
        target = ext[2]  # 161.8% — a common take-profit
```

## Interpretation

1. **Where might it reach.** Once a leg completes and price breaks past it,
   extensions mark plausible continuation targets; 161.8% is the most cited.
2. **Mirror of retracement.** [FibRetracement](Indicator-FibRetracement) maps the
   0-100% pullback of the same leg; extensions map the >100% continuation.

## Common pitfalls

- **Two-point, not measured-move.** This projects a *single* leg. For an A-B-C
  measured move use [FibProjection](Indicator-FibProjection).
- **Direction follows the leg.** A down leg extends downward (levels can fall
  below zero in synthetic data); always read levels relative to the leg sign.

## References

- Fischer, R. *Fibonacci Applications and Strategies for Traders* (1993).

## See also

- [FibRetracement](Indicator-FibRetracement), [FibProjection](Indicator-FibProjection),
  [FibConfluence](Indicator-FibConfluence).
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
