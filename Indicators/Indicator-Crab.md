# Crab

> Five-point (X-A-B-C-D) harmonic with the deepest D of the family — a `1.618`
> extension of XA reached by a very long terminal leg. Bullish (D a swing low) →
> `+1`, bearish → `-1`.

## Quick reference

| Item               | Value                                                  |
|--------------------|--------------------------------------------------------|
| Family             | Harmonic Patterns                                      |
| Input type         | `Candle` (uses `high`, `low`)                          |
| Output type        | `f64` (`+1` / `-1` / `0`)                              |
| Output range       | `{-1.0, 0.0, +1.0}`                                    |
| Default parameters | none (swing threshold 5%, baked)                       |
| Warmup period      | `6`                                                    |
| Interpretation     | Reversal at a deep extended D                          |

## Formula

```
last five pivots X-A-B-C-D:
  AB / XA ∈ [0.382, 0.618]
  BC / AB ∈ [0.382, 0.886]
  CD / BC ∈ [2.24, 3.618]  (a very long terminal leg)
  AD / XA ∈ [1.55, 1.65]   (≈ 1.618 — the defining deep D completion)
direction: D a swing low → +1, a swing high → -1
```

See `crates/wickra-core/src/indicators/crab.rs`.

## Parameters

None. Swing threshold `0.05` is a baked-in family constant (`pattern_swing.rs`);
the Fibonacci windows are documented detector constants. `Crab::new` is
infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::Crab, wickra::Candle) -> Option<f64> =
    <wickra::Crab as wickra::Indicator>::update;
```

- **Python.** `update((o,h,l,c,v,ts))` → `float` (never `None`);
  `batch(open, high, low, close)` → 1-D `ndarray`.
- **Node.** `update(open, high, low, close)` → `number`;
  `batch(open, high, low, close)` → `number[]`.
- **WASM.** `update(open, high, low, close)` → `number`.

## Warmup

`warmup_period() == 6`. Five confirmed pivots are required. Pinned by test
`accessors_and_metadata`.

## Edge cases

- **Bullish Crab reports `+1`** (test `bullish_crab_is_plus_one`).
- **Bearish Crab reports `-1`** (test `bearish_crab_is_minus_one`).
- **Legs outside the windows report `0.0`** (test `out_of_ratio_does_not_trigger`).
- **`reset` clears state** (test `reset_clears_state`).
- **Streaming equals batch** (test `batch_equals_streaming`).

## Examples

### Rust

```rust
use wickra::{Candle, Crab, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let bars = [
        (149.85, 150.0, 149.85, 149.85),
        (100.0, 148.5, 100.0, 100.0),
        (101.0, 140.0, 101.0, 101.0),
        (120.0, 138.6, 120.0, 120.0),
        (121.2, 137.5, 121.2, 121.2),
        (75.3, 136.125, 75.3, 75.3),
        (76.053, 82.83, 76.053, 76.053), // deep D confirms → bullish
    ];
    let mut pat = Crab::new();
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
    (149.85, 150.0, 149.85, 149.85, 1.0, 0),
    (100.0, 148.5, 100.0, 100.0, 1.0, 1),
    (101.0, 140.0, 101.0, 101.0, 1.0, 2),
    (120.0, 138.6, 120.0, 120.0, 1.0, 3),
    (121.2, 137.5, 121.2, 121.2, 1.0, 4),
    (75.3, 136.125, 75.3, 75.3, 1.0, 5),
    (76.053, 82.83, 76.053, 76.053, 1.0, 6),
]
pat = ta.Crab()
print([pat.update(b) for b in bars][-1])  # 1.0
```

### Node

```javascript
const wickra = require('wickra');
const bars = [
  [149.85, 150.0, 149.85, 149.85], [100.0, 148.5, 100.0, 100.0],
  [101.0, 140.0, 101.0, 101.0], [120.0, 138.6, 120.0, 120.0],
  [121.2, 137.5, 121.2, 121.2], [75.3, 136.125, 75.3, 75.3],
  [76.053, 82.83, 76.053, 76.053],
];
const pat = new wickra.Crab();
let last = 0;
for (const [o, h, l, c] of bars) last = pat.update(o, h, l, c);
console.log(last); // 1
```

### Streaming

```python
pat = ta.Crab()
for o, h, l, c, v, ts in candle_feed:
    signal = pat.update((o, h, l, c, v, ts))
    if signal != 0:
        pass  # Crab completed at a deep D — reversal setup
```

## Interpretation

1. **Extreme reversal.** The `1.618` D is the deepest completion in the family,
   catching capitulation/blow-off moves. The reward can be large; the stop
   (beyond D) is correspondingly distant.
2. **Long CD leg.** The `2.24`–`3.618` CD is the structural fingerprint — a sharp
   terminal thrust to D.

## Common pitfalls

- **Rarity.** The deep extension is uncommon; expect few signals.
- **Confirmation lag.** Non-repainting but lags the visual D.

## References

- Carney, S. *Harmonic Trading* (2010).

## See also

- [Butterfly](/Indicators/Indicator-Butterfly), [Bat](/Indicators/Indicator-Bat), [Gartley](/Indicators/Indicator-Gartley).
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
