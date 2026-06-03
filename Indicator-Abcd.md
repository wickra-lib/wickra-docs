# AB=CD

> The simplest four-point harmonic: an A→B leg, a B→C retracement, and a C→D leg
> that mirrors A→B in length. Bullish (D a swing low) → `+1`, bearish → `-1`.

## Quick reference

| Item               | Value                                                  |
|--------------------|--------------------------------------------------------|
| Family             | Harmonic Patterns                                      |
| Input type         | `Candle` (uses `high`, `low`)                          |
| Output type        | `f64` (`+1` / `-1` / `0`)                              |
| Output range       | `{-1.0, 0.0, +1.0}`                                    |
| Default parameters | none (swing threshold 5%, baked)                       |
| Warmup period      | `5`                                                    |
| Interpretation     | Reversal at the D completion                           |

## Formula

```
last four pivots A-B-C-D:
  BC / AB ∈ [0.382, 0.886]   (C retraces AB)
  CD / BC ∈ [1.13, 2.618]    (D extends BC)
  AB ≈ CD (within 10%)        (the two legs are equal — the defining symmetry)
direction: D a swing low → +1, a swing high → -1
```

The AB=CD is the structural core of the five-point harmonics; here it stands
alone as a four-pivot pattern. See `crates/wickra-core/src/indicators/abcd.rs`.

## Parameters

None. Swing threshold `0.05` is a baked-in family constant (`pattern_swing.rs`);
the Fibonacci windows and the 10% leg-equality tolerance are documented detector
constants. `Abcd::new` is infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::Abcd, wickra::Candle) -> Option<f64> =
    <wickra::Abcd as wickra::Indicator>::update;
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

- **Bullish AB=CD reports `+1`** (test `bullish_abcd_is_plus_one`).
- **Bearish AB=CD reports `-1`** (test `bearish_abcd_is_minus_one`).
- **Unequal legs report `0.0`** (test `unequal_legs_do_not_trigger`).
- **`reset` clears state** (test `reset_clears_state`).
- **Streaming equals batch** (test `batch_equals_streaming`).

## Examples

### Rust

```rust
use wickra::{Abcd, Candle, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // A=140 B=100 (AB=40) C=124.7 (BC=24.7, 0.618) D=84.7 (CD=40 = AB) → bullish.
    let bars = [
        (139.86, 140.0, 139.86, 139.86),
        (100.0, 138.6, 100.0, 100.0),
        (101.0, 124.7, 101.0, 101.0),
        (84.7, 123.453, 84.7, 84.7),
        (85.547, 93.17, 85.547, 85.547), // D confirms → bullish
    ];
    let mut pat = Abcd::new();
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
    (139.86, 140.0, 139.86, 139.86, 1.0, 0),
    (100.0, 138.6, 100.0, 100.0, 1.0, 1),
    (101.0, 124.7, 101.0, 101.0, 1.0, 2),
    (84.7, 123.453, 84.7, 84.7, 1.0, 3),
    (85.547, 93.17, 85.547, 85.547, 1.0, 4),
]
pat = ta.Abcd()
print([pat.update(b) for b in bars][-1])  # 1.0
```

### Node

```javascript
const wickra = require('wickra');
const bars = [
  [139.86, 140.0, 139.86, 139.86], [100.0, 138.6, 100.0, 100.0],
  [101.0, 124.7, 101.0, 101.0], [84.7, 123.453, 84.7, 84.7],
  [85.547, 93.17, 85.547, 85.547],
];
const pat = new wickra.Abcd();
let last = 0;
for (const [o, h, l, c] of bars) last = pat.update(o, h, l, c);
console.log(last); // 1
```

### Streaming

```python
pat = ta.Abcd()
for o, h, l, c, v, ts in candle_feed:
    signal = pat.update((o, h, l, c, v, ts))
    if signal != 0:
        pass  # AB=CD completed at D — reversal setup
```

## Interpretation

1. **The building block.** Every five-point harmonic embeds an AB=CD into its
   B-C-D legs; as a standalone it is the most common, lowest-bar-count harmonic.
2. **Equal legs.** The defining feature is `AB ≈ CD`; the BC retracement and CD
   extension windows keep the proportions Fibonacci-consistent.

## Common pitfalls

- **Looser than five-point patterns.** With only three legs constrained, AB=CD
  fires more often; treat it as a weaker standalone signal than the named
  five-point harmonics.
- **Confirmation lag.** Non-repainting but lags the visual D.

## References

- Gartley, H. M. (1935); Carney, S. *Harmonic Trading* (2010).

## See also

- [Gartley](Indicator-Gartley), [Bat](Indicator-Bat), [ThreeDrives](Indicator-ThreeDrives).
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
