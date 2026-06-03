# Fibonacci Confluence

> The densest cluster of retracement levels across recent swing legs — where
> 38.2/50/61.8% levels from different legs stack up, reported as the cluster mean
> price and its strength (member count).

## Quick reference

| Item               | Value                                                  |
|--------------------|--------------------------------------------------------|
| Family             | Fibonacci                                              |
| Input type         | `Candle` (uses `high`, `low`)                          |
| Output type        | `FibConfluenceOutput` (`price`, `strength`)            |
| Output range       | `price` a market price; `strength` a count (>= 1)      |
| Default parameters | none (swing threshold 5%, 6-pivot history, baked)      |
| Warmup period      | `3` (two legs)                                         |
| Interpretation     | Strongest stacked support/resistance zone              |

## Formula

```
for every leg among the last six pivots, take its 38.2/50/61.8% levels;
group levels within 3% (relative) of each other;
report the densest group:
  price    = mean of the group's levels
  strength = number of levels in the group
```

The 3% grouping tolerance is the shared `LEVEL_TOLERANCE` family constant. See
`crates/wickra-core/src/indicators/fib_confluence.rs`.

## Parameters

None. The swing threshold `0.05`, the six-pivot history, the three ratios and the
3% cluster tolerance are baked-in constants. `FibConfluence::new` is infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::FibConfluence, wickra::Candle) -> Option<wickra::FibConfluenceOutput> =
    <wickra::FibConfluence as wickra::Indicator>::update;
```

- **Python.** `update((o,h,l,c,v,ts))` → `(price, strength)` or `None`;
  `batch(high, low)` → `(n, 2)` `ndarray` (`NaN` warmup).
- **Node.** `update(high, low)` → `{ price, strength }` or `null`;
  `batch(high, low)` → flat `number[]` length `n*2`.
- **WASM.** `update(high, low)` → object (`price`/`strength`) or `null`.

## Warmup

`warmup_period() == 3`. At least two legs (three pivots) are needed for levels to
cluster; before that `update` returns `None`. Pinned by tests
`accessors_and_metadata` and `no_output_before_two_legs`.

## Edge cases

- **Picks the densest cluster** when levels from two legs overlap within
  tolerance (test `picks_the_densest_cluster`).
- **`reset` clears all state** (test `reset_clears_state`).
- **Streaming equals batch** (test `batch_equals_streaming`).

## Examples

### Rust

```rust
use wickra::{Candle, FibConfluence, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Legs 200->100 and 100->160: their 38.2% levels (138.2 and ~137.08)
    // cluster within 3% → strength 2, mean ~137.64.
    let bars = [
        (199.8, 200.0, 199.8, 199.8),
        (100.0, 198.0, 100.0, 100.0), // confirm high @200
        (101.0, 160.0, 101.0, 101.0), // confirm low  @100
        (144.0, 158.4, 144.0, 144.0), // confirm high @160 (two legs)
    ];
    let mut fib = FibConfluence::new();
    let mut last = None;
    for (ts, (o, h, l, c)) in bars.iter().enumerate() {
        last = fib.update(Candle::new(*o, *h, *l, *c, 1.0, ts as i64)?);
    }
    let v = last.unwrap();
    println!("{:.2} {}", v.price, v.strength); // 137.64 2
    Ok(())
}
```

### Python

```python
import wickra as ta

bars = [
    (199.8, 200.0, 199.8, 199.8, 1.0, 0),
    (100.0, 198.0, 100.0, 100.0, 1.0, 1),
    (101.0, 160.0, 101.0, 101.0, 1.0, 2),
    (144.0, 158.4, 144.0, 144.0, 1.0, 3),
]
fib = ta.FibConfluence()
print([fib.update(b) for b in bars][-1])  # (137.64, 2.0)
```

### Node

```javascript
const wickra = require('wickra');
const fib = new wickra.FibConfluence();
const bars = [[200.0, 199.8], [198.0, 100.0], [160.0, 101.0], [158.4, 144.0]];
let last = null;
for (const [h, l] of bars) last = fib.update(h, l);
console.log(last.price.toFixed(2), last.strength); // 137.64 2
```

### Streaming

```python
fib = ta.FibConfluence()
for o, h, l, c, v, ts in candle_feed:
    cl = fib.update((o, h, l, c, v, ts))
    if cl is not None and cl[1] >= 2:
        pass  # multiple legs agree on cl[0] — a strong zone
```

## Interpretation

1. **Strength in agreement.** A price where retracements from several legs
   coincide is a higher-conviction zone than any single fib level.
2. **`strength` is conviction.** A strength of 1 means no real confluence; 2+
   means independent legs point at the same area.

## Common pitfalls

- **Strength 1 is weak.** With non-overlapping legs the "densest" cluster is just
  one level — check `strength` before trusting the price.
- **Window-bounded.** Only the last six pivots feed the search, so very old levels
  drop out.

## References

- Fischer, R. *Fibonacci Applications and Strategies for Traders* (1993);
  Bulkowski, T. *Encyclopedia of Chart Patterns* (2005).

## See also

- [FibRetracement](Indicator-FibRetracement), [AutoFib](Indicator-AutoFib),
  [GoldenPocket](Indicator-GoldenPocket).
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
