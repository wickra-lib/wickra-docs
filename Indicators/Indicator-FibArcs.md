# Fibonacci Arcs

> Semicircular retracement levels centred on the swing end. Time is normalised by
> the leg's bar-width, so the construction is chart-scale-free: each arc starts on
> its retracement level and curves back to the swing-end price one leg-width later.

## Quick reference

| Item               | Value                                                  |
|--------------------|--------------------------------------------------------|
| Family             | Fibonacci                                              |
| Input type         | `Candle` (uses `high`, `low`)                          |
| Output type        | `FibArcsOutput` (`arc_382`, `arc_500`, `arc_618`)      |
| Output range       | between the retracement level and the swing-end price  |
| Default parameters | none (swing threshold 5%, baked)                       |
| Warmup period      | `2` (two confirmed pivots)                             |
| Interpretation     | Decaying time-and-price support/resistance             |

## Formula

```
last two pivots define a leg start -> end at bars (start_bar, end_bar):
  u      = (cur - end_bar) / (end_bar - start_bar)
  arc(r) = end + (start - end) * r * sqrt(max(0, 1 - u^2))
for r in {0.382, 0.5, 0.618}, cur = current bar index
```

At the end bar (`u = 0`) each arc sits exactly on its retracement level; as time
elapses it curves back toward `end`, reaching it at `u = 1` (one leg-width later)
and staying there (`u > 1` clamps the curve to 0). Normalising by the leg's
bar-width removes any dependence on chart scale. See
`crates/wickra-core/src/indicators/fib_arcs.rs`.

## Parameters

None. The swing threshold `0.05` is a baked-in family constant; the three arc
ratios are fixed. `FibArcs::new` is infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::FibArcs, wickra::Candle) -> Option<wickra::FibArcsOutput> =
    <wickra::FibArcs as wickra::Indicator>::update;
```

- **Python.** `update((o,h,l,c,v,ts))` → `(arc_382, arc_500, arc_618)` or `None`;
  `batch(high, low)` → `(n, 3)` `Matrix` (`NaN` warmup).
- **Node.** `update(high, low)` → `{ arc382, arc500, arc618 }` or `null`;
  `batch(high, low)` → flat `number[]` length `n*3`.
- **WASM.** `update(high, low)` → object (same camelCase keys) or `null`.

## Warmup

`warmup_period() == 2`. Two confirmed pivots define the leg; before that `update`
returns `None`. Pinned by tests `accessors_and_metadata` and
`no_output_before_two_pivots`.

## Edge cases

- **Arcs curve back toward the swing end** as time passes (test
  `arcs_curve_back_toward_the_swing_end`).
- **Beyond one leg-width the arcs collapse onto the swing-end price** as the curve
  clamps to zero (test `arc_clamps_to_zero_beyond_one_leg_width`).
- **`reset` clears all state** (test `reset_clears_state`).
- **Streaming equals batch** (test `batch_equals_streaming`).

## Examples

### Rust

```rust
use wickra::{Candle, FibArcs, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Leg 200 (bar 0) -> 100 (bar 2), confirmed at bar 3 → u = 0.5.
    let bars = [
        (199.0, 200.0, 199.0, 199.0),
        (160.0, 190.0, 160.0, 160.0),
        (100.0, 150.0, 100.0, 100.0),
        (105.0, 110.0, 105.0, 105.0),
    ];
    let mut arcs = FibArcs::new();
    let mut last = None;
    for (ts, (o, h, l, c)) in bars.iter().enumerate() {
        last = arcs.update(Candle::new(*o, *h, *l, *c, 1.0, ts as i64)?);
    }
    let v = last.unwrap();
    // curve = sqrt(0.75) ≈ 0.866; arc(r) = 100 + 100*r*curve.
    println!("{:.3} {:.3} {:.3}", v.arc_382, v.arc_500, v.arc_618);
    // 133.082 143.301 153.520
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
arcs = ta.FibArcs()
print([arcs.update(b) for b in bars][-1])
# (133.0821805, 143.3012702, 153.5203699)
```

### Node

```javascript
const wickra = require('wickra');
const arcs = new wickra.FibArcs();
const bars = [[200.0, 199.0], [190.0, 160.0], [150.0, 100.0], [110.0, 105.0]];
let last = null;
for (const [h, l] of bars) last = arcs.update(h, l);
console.log(last.arc382.toFixed(3)); // 133.082
```

### Streaming

```python
arcs = ta.FibArcs()
for o, h, l, c, v, ts in candle_feed:
    a = arcs.update((o, h, l, c, v, ts))
    if a is not None and abs(c - a[2]) < 0.5:
        pass  # price near the 61.8% arc — time-and-price confluence
```

## Interpretation

1. **Time + price.** Arcs combine retracement depth with elapsed time; a level
   matters less the longer price takes to reach it.
2. **Decaying relevance.** The inward curve encodes the idea that a retracement
   zone loses force as the swing ages.

## Common pitfalls

- **Scale convention.** The arc is normalised to the leg's bar-width, not to a
  pixel aspect ratio; values differ from a charting package that uses screen
  geometry. The formula above is exact and reproducible.
- **Collapses after one leg-width.** Past `u = 1` all arcs read the swing-end
  price — by design, not a bug.

## References

- Fischer, R. *Fibonacci Applications and Strategies for Traders* (1993).

## See also

- [FibFan](/Indicators/Indicator-FibFan), [FibChannel](/Indicators/Indicator-FibChannel),
  [FibRetracement](/Indicators/Indicator-FibRetracement).
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
