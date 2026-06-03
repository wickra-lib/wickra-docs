# Auto-Fibonacci

> Fibonacci retracement anchored automatically on the dominant
> (largest-magnitude) leg among the last six confirmed pivots, rather than the
> immediate last leg.

## Quick reference

| Item               | Value                                                  |
|--------------------|--------------------------------------------------------|
| Family             | Fibonacci                                              |
| Input type         | `Candle` (uses `high`, `low`)                          |
| Output type        | `AutoFibOutput` (7 prices)                             |
| Output range       | bracketed by the dominant leg's start and end          |
| Default parameters | none (swing threshold 5%, 6-pivot history, baked)      |
| Warmup period      | `2` (two confirmed pivots)                             |
| Interpretation     | Retracement of the swing the market most respects      |

## Formula

```
among the last six pivots, pick the leg with the largest |start - end|;
  level(r) = end + r * (start - end)
for r in {0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0}
```

Identical level maths to [FibRetracement](Indicator-FibRetracement), but the leg
is chosen by magnitude across the recent pivot window instead of always the last
one. See `crates/wickra-core/src/indicators/auto_fib.rs`.

## Parameters

None. The swing threshold `0.05` and the six-pivot history are baked-in family
constants. `AutoFib::new` is infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::AutoFib, wickra::Candle) -> Option<wickra::AutoFibOutput> =
    <wickra::AutoFib as wickra::Indicator>::update;
```

- **Python.** `update((o,h,l,c,v,ts))` → `(level_0, level_236, level_382,
  level_500, level_618, level_786, level_1000)` or `None`; `batch(high, low)` →
  `(n, 7)` `ndarray` (`NaN` warmup).
- **Node.** `update(high, low)` → `{ level0, level236, level382, level500,
  level618, level786, level1000 }` or `null`; `batch(high, low)` → flat
  `number[]` length `n*7`.
- **WASM.** `update(high, low)` → object (same camelCase keys) or `null`.

## Warmup

`warmup_period() == 2`. At least one leg (two pivots) must exist; before that
`update` returns `None`. Pinned by tests `accessors_and_metadata` and
`no_output_before_two_pivots`.

## Edge cases

- **Anchors on the largest leg** among several recent swings, not the last one
  (test `anchors_on_the_largest_leg`).
- **`reset` clears all state** (test `reset_clears_state`).
- **Streaming equals batch** (test `batch_equals_streaming`).

## Examples

### Rust

```rust
use wickra::{AutoFib, Candle, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Pivots 130 -> 120 (10) -> 220 (100, dominant) -> 200 (20).
    let bars = [
        (129.87, 130.0, 129.87, 129.87),
        (120.0, 128.7, 120.0, 120.0),  // confirm high @130
        (121.2, 220.0, 121.2, 121.2),  // confirm low  @120
        (200.0, 217.8, 200.0, 200.0),  // confirm high @220
        (202.0, 220.0, 202.0, 202.0),  // confirm low  @200
    ];
    let mut fib = AutoFib::new();
    let mut last = None;
    for (ts, (o, h, l, c)) in bars.iter().enumerate() {
        last = fib.update(Candle::new(*o, *h, *l, *c, 1.0, ts as i64)?);
    }
    let v = last.unwrap();
    // Dominant leg 120 -> 220: 0% on 220, 100% on 120.
    println!("{} {} {}", v.level_0, v.level_500, v.level_1000); // 220 170 120
    Ok(())
}
```

### Python

```python
import wickra as ta

bars = [
    (129.87, 130.0, 129.87, 129.87, 1.0, 0),
    (120.0, 128.7, 120.0, 120.0, 1.0, 1),
    (121.2, 220.0, 121.2, 121.2, 1.0, 2),
    (200.0, 217.8, 200.0, 200.0, 1.0, 3),
    (202.0, 220.0, 202.0, 202.0, 1.0, 4),
]
fib = ta.AutoFib()
print([fib.update(b) for b in bars][-1])
# (220.0, 196.4, 181.8, 170.0, 158.2, 141.4, 120.0)
```

### Node

```javascript
const wickra = require('wickra');
const fib = new wickra.AutoFib();
const bars = [[130.0, 129.87], [128.7, 120.0], [220.0, 121.2],
              [217.8, 200.0], [220.0, 202.0]];
let last = null;
for (const [h, l] of bars) last = fib.update(h, l);
console.log(last.level0, last.level1000); // 220 120
```

### Streaming

```python
fib = ta.AutoFib()
for o, h, l, c, v, ts in candle_feed:
    levels = fib.update((o, h, l, c, v, ts))
    if levels is not None:
        golden = levels[4]  # 61.8% of the dominant swing
```

## Interpretation

1. **Significance over recency.** Markets often respect the largest recent swing,
   not the most recent micro-leg; Auto-Fib tracks that dominant structure.
2. **Drop-in for discretionary fibs.** Mirrors how a trader picks the "obvious"
   big swing to draw retracements from.

## Common pitfalls

- **Window-bounded.** Only the last six pivots are considered; a historically
  huge leg eventually drops out of the window.
- **Switches anchor.** When a new, larger leg confirms, the levels jump to it —
  expected behaviour, but the output is not monotone across time.

## References

- Fischer, R. *Fibonacci Applications and Strategies for Traders* (1993).

## See also

- [FibRetracement](Indicator-FibRetracement), [GoldenPocket](Indicator-GoldenPocket),
  [FibConfluence](Indicator-FibConfluence), [ZigZag](Indicator-ZigZag).
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
