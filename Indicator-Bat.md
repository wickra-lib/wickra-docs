# Bat

> Five-point (X-A-B-C-D) harmonic with a shallow B and a deep `0.886` D
> completion. Bullish (D a swing low) → `+1`, bearish → `-1`.

## Quick reference

| Item               | Value                                                  |
|--------------------|--------------------------------------------------------|
| Family             | Harmonic Patterns                                      |
| Input type         | `Candle` (uses `high`, `low`)                          |
| Output type        | `f64` (`+1` / `-1` / `0`)                              |
| Output range       | `{-1.0, 0.0, +1.0}`                                    |
| Default parameters | none (swing threshold 5%, baked)                       |
| Warmup period      | `6`                                                    |
| Interpretation     | Reversal at the D completion                           |

## Formula

```
last five pivots X-A-B-C-D:
  AB / XA ∈ [0.382, 0.50]   (shallow B)
  BC / AB ∈ [0.382, 0.886]
  CD / BC ∈ [1.618, 2.618]
  AD / XA ∈ [0.84, 0.93]    (≈ 0.886 — the defining D completion)
direction: D a swing low → +1, a swing high → -1
```

See `crates/wickra-core/src/indicators/bat.rs`.

## Parameters

None. Swing threshold `0.05` is a baked-in family constant (`pattern_swing.rs`);
the Fibonacci windows are documented detector constants. `Bat::new` is infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::Bat, wickra::Candle) -> Option<f64> =
    <wickra::Bat as wickra::Indicator>::update;
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

- **Bullish Bat reports `+1`** (test `bullish_bat_is_plus_one`).
- **Bearish Bat reports `-1`** (test `bearish_bat_is_minus_one`).
- **Legs outside the windows report `0.0`** (test `out_of_ratio_does_not_trigger`).
- **`reset` clears state** (test `reset_clears_state`).
- **Streaming equals batch** (test `batch_equals_streaming`).

## Examples

### Rust

```rust
use wickra::{Bat, Candle, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let bars = [
        (149.85, 150.0, 149.85, 149.85),
        (100.0, 148.5, 100.0, 100.0),
        (101.0, 140.0, 101.0, 101.0),
        (122.0, 138.6, 122.0, 122.0),
        (123.22, 137.0, 123.22, 123.22),
        (104.56, 135.63, 104.56, 104.56),
        (105.6056, 115.016, 105.6056, 105.6056), // D confirms → bullish
    ];
    let mut pat = Bat::new();
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
    (122.0, 138.6, 122.0, 122.0, 1.0, 3),
    (123.22, 137.0, 123.22, 123.22, 1.0, 4),
    (104.56, 135.63, 104.56, 104.56, 1.0, 5),
    (105.6056, 115.016, 105.6056, 105.6056, 1.0, 6),
]
pat = ta.Bat()
print([pat.update(b) for b in bars][-1])  # 1.0
```

### Node

```javascript
const wickra = require('wickra');
const bars = [
  [149.85, 150.0, 149.85, 149.85], [100.0, 148.5, 100.0, 100.0],
  [101.0, 140.0, 101.0, 101.0], [122.0, 138.6, 122.0, 122.0],
  [123.22, 137.0, 123.22, 123.22], [104.56, 135.63, 104.56, 104.56],
  [105.6056, 115.016, 105.6056, 105.6056],
];
const pat = new wickra.Bat();
let last = 0;
for (const [o, h, l, c] of bars) last = pat.update(o, h, l, c);
console.log(last); // 1
```

### Streaming

```python
pat = ta.Bat()
for o, h, l, c, v, ts in candle_feed:
    signal = pat.update((o, h, l, c, v, ts))
    if signal != 0:
        pass  # Bat completed at D — reversal setup (long if +1, short if -1)
```

## Interpretation

1. **Deep D, tight stop.** The `0.886` D sits close to X, so the protective stop
   just beyond X is tight relative to the potential reversal — a favourable
   risk/reward that makes the Bat popular.
2. **Shallow B is the tell.** The `0.382`–`0.50` B retracement distinguishes the
   Bat from the Gartley (`0.618` B).

## Common pitfalls

- **B vs Gartley overlap.** A B near `0.5` could read as either; the deciding leg
  is the D completion (`0.886` Bat vs `0.786` Gartley).
- **Confirmation lag.** Non-repainting but lags the visual D.

## References

- Carney, S. *Harmonic Trading* (2010).

## See also

- [Gartley](Indicator-Gartley), [Butterfly](Indicator-Butterfly), [Crab](Indicator-Crab).
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
