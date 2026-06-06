# Golden Pocket

> The 0.618-0.65 "optimal trade entry" band of the most recent confirmed swing
> leg — the narrow retracement zone many swing traders watch for continuation.

## Quick reference

| Item               | Value                                                  |
|--------------------|--------------------------------------------------------|
| Family             | Fibonacci                                              |
| Input type         | `Candle` (uses `high`, `low`)                          |
| Output type        | `GoldenPocketOutput` (`low`, `mid`, `high`)            |
| Output range       | inside the last swing leg                              |
| Default parameters | none (swing threshold 5%, baked)                       |
| Warmup period      | `2` (two confirmed pivots)                             |
| Interpretation     | High-probability continuation entry zone               |

## Formula

```
last two confirmed pivots define a leg start -> end:
  edge_a = end + 0.618 * (start - end)
  edge_b = end + 0.650 * (start - end)
  low  = min(edge_a, edge_b)
  high = max(edge_a, edge_b)
  mid  = (low + high) / 2
```

Sorting the two edges makes `low <= high` regardless of swing direction. See
`crates/wickra-core/src/indicators/golden_pocket.rs`.

## Parameters

None. The swing threshold `0.05` and the 0.618/0.65 band are baked-in constants.
`GoldenPocket::new` is infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::GoldenPocket, wickra::Candle) -> Option<wickra::GoldenPocketOutput> =
    <wickra::GoldenPocket as wickra::Indicator>::update;
```

- **Python.** `update((o,h,l,c,v,ts))` → `(low, mid, high)` or `None`;
  `batch(high, low)` → `(n, 3)` `ndarray` (`NaN` warmup).
- **Node.** `update(high, low)` → `{ low, mid, high }` or `null`;
  `batch(high, low)` → flat `number[]` length `n*3`.
- **WASM.** `update(high, low)` → object (`low`/`mid`/`high`) or `null`.

## Warmup

`warmup_period() == 2`. Two confirmed pivots define the leg; before that `update`
returns `None`. Pinned by tests `accessors_and_metadata` and
`no_output_before_two_pivots`.

## Edge cases

- **Band of a confirmed down leg** is exact (test `zone_of_a_down_leg`).
- **Band stays sorted (`low <= high`) for an up leg** where the edges flip (test
  `band_is_sorted_for_an_up_leg`).
- **`reset` clears all state** (test `reset_clears_state`).
- **Streaming equals batch** (test `batch_equals_streaming`).

## Examples

### Rust

```rust
use wickra::{Candle, GoldenPocket, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Leg 200 (high) -> 100 (low): the 61.8-65% band sits at 161.8-165.
    let bars = [
        (199.8, 200.0, 199.8, 199.8),
        (100.0, 198.0, 100.0, 100.0),
        (101.0, 110.0, 101.0, 101.0),
    ];
    let mut gp = GoldenPocket::new();
    let mut last = None;
    for (ts, (o, h, l, c)) in bars.iter().enumerate() {
        last = gp.update(Candle::new(*o, *h, *l, *c, 1.0, ts as i64)?);
    }
    let v = last.unwrap();
    println!("{} {} {}", v.low, v.mid, v.high); // 161.8 163.4 165
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
gp = ta.GoldenPocket()
print([gp.update(b) for b in bars][-1])  # (161.8, 163.4, 165.0)
```

### Node

```javascript
const wickra = require('wickra');
const gp = new wickra.GoldenPocket();
let last = null;
for (const [h, l] of [[200.0, 199.8], [198.0, 100.0], [110.0, 101.0]]) {
  last = gp.update(h, l);
}
console.log(last.low, last.mid, last.high); // 161.8 163.4 165
```

### Streaming

```python
gp = ta.GoldenPocket()
for o, h, l, c, v, ts in candle_feed:
    zone = gp.update((o, h, l, c, v, ts))
    if zone is not None and zone[0] <= c <= zone[2]:
        pass  # price inside the golden pocket — continuation watch
```

## Interpretation

1. **Tight entry band.** Narrower than a full retracement grid; the 0.618-0.65
   zone is where continuation entries cluster after a pullback.
2. **Subset of retracement.** It is the `level_618`-to-0.65 slice of the same leg
   reported by [FibRetracement](/Indicators/Indicator-FibRetracement).

## Common pitfalls

- **Not a signal by itself.** Marks a zone, not a trade; combine with momentum or
  candlestick confirmation.
- **Latest leg only.** Uses the immediate last leg; for the dominant swing pair it
  with [AutoFib](/Indicators/Indicator-AutoFib).

## References

- Fischer, R. *Fibonacci Applications and Strategies for Traders* (1993).

## See also

- [FibRetracement](/Indicators/Indicator-FibRetracement), [AutoFib](/Indicators/Indicator-AutoFib),
  [FibConfluence](/Indicators/Indicator-FibConfluence).
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
