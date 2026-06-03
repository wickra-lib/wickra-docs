# Fibonacci Retracement

> The seven canonical retracement levels (0/23.6/38.2/50/61.8/78.6/100%) of the
> most recent confirmed swing leg, recomputed each time a new pivot confirms.

## Quick reference

| Item               | Value                                                  |
|--------------------|--------------------------------------------------------|
| Family             | Fibonacci                                              |
| Input type         | `Candle` (uses `high`, `low`)                          |
| Output type        | `FibRetracementOutput` (7 prices)                      |
| Output range       | bracketed by the leg's start and end prices            |
| Default parameters | none (swing threshold 5%, baked)                       |
| Warmup period      | `2` (two confirmed pivots)                             |
| Interpretation     | Pullback support/resistance inside the last swing      |

## Formula

```
last two confirmed pivots define a leg start -> end:
  level(r) = end + r * (start - end)
for r in {0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0}
```

`level_0` sits on `end` (the most recent confirmed extreme) and `level_1000` on
`start` (the prior pivot); the interior ratios are the classic Fibonacci
pullbacks. Pivots are confirmed by the shared non-repainting 5% swing tracker.
See `crates/wickra-core/src/indicators/fib_retracement.rs`.

## Parameters

None. The swing threshold `0.05` is a baked-in family constant
(`pattern_swing.rs`); the seven ratios are fixed. `FibRetracement::new` is
infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::FibRetracement, wickra::Candle) -> Option<wickra::FibRetracementOutput> =
    <wickra::FibRetracement as wickra::Indicator>::update;
```

- **Python.** `update((o,h,l,c,v,ts))` → `(level_0, level_236, level_382,
  level_500, level_618, level_786, level_1000)` or `None` during warmup;
  `batch(high, low)` → `(n, 7)` `ndarray` (rows are `NaN` until ready).
- **Node.** `update(high, low)` → `{ level0, level236, level382, level500,
  level618, level786, level1000 }` or `null`; `batch(high, low)` → flat
  `number[]` of length `n*7` (`NaN` warmup).
- **WASM.** `update(high, low)` → object (same camelCase keys) or `null`.

## Warmup

`warmup_period() == 2`. Two confirmed pivots are required to define a leg;
before that `update` returns `None`. Pinned by tests `accessors_and_metadata`
and `no_output_before_two_pivots`.

## Edge cases

- **Levels of a confirmed down leg** are exact (test
  `retracement_levels_of_a_down_leg`).
- **Levels refresh once a newer leg confirms** — only the latest two pivots are
  kept (test `levels_refresh_on_a_new_leg`).
- **`reset` clears all state** (test `reset_clears_state`).
- **Streaming equals batch** (test `batch_equals_streaming`).

## Examples

### Rust

```rust
use wickra::{Candle, FibRetracement, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // A swing high at 200 confirmed, then a swing low at 100: a 100-point leg.
    let bars = [
        (199.8, 200.0, 199.8, 199.8),
        (100.0, 198.0, 100.0, 100.0), // confirms high @200 (one pivot)
        (101.0, 110.0, 101.0, 101.0), // confirms low @100 (leg complete)
    ];
    let mut fib = FibRetracement::new();
    let mut last = None;
    for (ts, (o, h, l, c)) in bars.iter().enumerate() {
        last = fib.update(Candle::new(*o, *h, *l, *c, 1.0, ts as i64)?);
    }
    let v = last.unwrap();
    println!("{} {} {}", v.level_0, v.level_618, v.level_1000); // 100 161.8 200
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
fib = ta.FibRetracement()
print([fib.update(b) for b in bars][-1])
# (100.0, 123.6, 138.2, 150.0, 161.8, 178.6, 200.0)
```

### Node

```javascript
const wickra = require('wickra');
const fib = new wickra.FibRetracement();
let last = null;
for (const [h, l] of [[200.0, 199.8], [198.0, 100.0], [110.0, 101.0]]) {
  last = fib.update(h, l);
}
console.log(last.level0, last.level618, last.level1000); // 100 161.8 200
```

### Streaming

```python
fib = ta.FibRetracement()
for o, h, l, c, v, ts in candle_feed:
    levels = fib.update((o, h, l, c, v, ts))
    if levels is not None:
        golden = levels[4]  # 61.8% — watch for a bounce here
```

## Interpretation

1. **Pullback map.** After a strong leg, traders expect price to retrace to one
   of these levels before continuing; 38.2%, 50% and 61.8% are the most watched.
2. **Non-repainting anchor.** The leg only shifts when a *new* pivot confirms at
   the 5% threshold, so the levels are stable intra-swing — they do not redraw on
   every bar like a discretionary fib drawn by eye.
3. **Pairs with the Golden Pocket.** [GoldenPocket](Indicator-GoldenPocket)
   narrows the 61.8-65% sub-zone of the same leg.

## Common pitfalls

- **Leg selection is mechanical.** The tool always uses the *latest* leg; for the
  dominant recent swing use [AutoFib](Indicator-AutoFib) instead.
- **Threshold sensitivity.** Tiny wiggles below 5% never form pivots, so on very
  quiet series the leg can lag the visual swing.

## References

- Fischer, R. *Fibonacci Applications and Strategies for Traders* (1993).

## See also

- [FibExtension](Indicator-FibExtension), [GoldenPocket](Indicator-GoldenPocket),
  [AutoFib](Indicator-AutoFib), [FibConfluence](Indicator-FibConfluence).
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
