# Butterfly

> Five-point (X-A-B-C-D) harmonic with a `0.786` B and an **extended** D that
> overshoots X (AD/XA 1.27–1.618). Bullish (D a swing low) → `+1`, bearish → `-1`.

## Quick reference

| Item               | Value                                                  |
|--------------------|--------------------------------------------------------|
| Family             | Harmonic Patterns                                      |
| Input type         | `Candle` (uses `high`, `low`)                          |
| Output type        | `f64` (`+1` / `-1` / `0`)                              |
| Output range       | `{-1.0, 0.0, +1.0}`                                    |
| Default parameters | none (swing threshold 5%, baked)                       |
| Warmup period      | `6`                                                    |
| Interpretation     | Reversal at an extended D                              |

## Formula

```
last five pivots X-A-B-C-D:
  AB / XA ∈ [0.74, 0.84]   (≈ 0.786)
  BC / AB ∈ [0.382, 0.886]
  CD / BC ∈ [1.618, 2.618]
  AD / XA ∈ [1.27, 1.618]  (extended D — overshoots X)
direction: D a swing low → +1, a swing high → -1
```

See `crates/wickra-core/src/indicators/butterfly.rs`.

## Parameters

None. Swing threshold `0.05` is a baked-in family constant (`pattern_swing.rs`);
the Fibonacci windows are documented detector constants. `Butterfly::new` is
infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::Butterfly, wickra::Candle) -> Option<f64> =
    <wickra::Butterfly as wickra::Indicator>::update;
```

- **Python.** `update((o,h,l,c,v,ts))` → `float` (never `None`);
  `batch(open, high, low, close)` → `array.array('d')`.
- **Node.** `update(open, high, low, close)` → `number`;
  `batch(open, high, low, close)` → `number[]`.
- **WASM.** `update(open, high, low, close)` → `number`.

## Warmup

`warmup_period() == 6`. Five confirmed pivots are required. Pinned by test
`accessors_and_metadata`.

## Edge cases

- **Bullish Butterfly reports `+1`** (test `bullish_butterfly_is_plus_one`).
- **Bearish Butterfly reports `-1`** (test `bearish_butterfly_is_minus_one`).
- **Legs outside the windows report `0.0`** (test `out_of_ratio_does_not_trigger`).
- **`reset` clears state** (test `reset_clears_state`).
- **Streaming equals batch** (test `batch_equals_streaming`).

## Examples

### Rust

```rust
use wickra::{Butterfly, Candle, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let bars = [
        (149.85, 150.0, 149.85, 149.85),
        (100.0, 148.5, 100.0, 100.0),
        (101.0, 140.0, 101.0, 101.0),
        (108.6, 138.6, 108.6, 108.6),
        (109.686, 128.0, 109.686, 109.686),
        (79.8, 126.72, 79.8, 79.8),
        (80.598, 87.78, 80.598, 80.598), // extended D confirms → bullish
    ];
    let mut pat = Butterfly::new();
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
    (108.6, 138.6, 108.6, 108.6, 1.0, 3),
    (109.686, 128.0, 109.686, 109.686, 1.0, 4),
    (79.8, 126.72, 79.8, 79.8, 1.0, 5),
    (80.598, 87.78, 80.598, 80.598, 1.0, 6),
]
pat = ta.Butterfly()
print([pat.update(b) for b in bars][-1])  # 1.0
```

### Node

```javascript
const wickra = require('wickra');
const bars = [
  [149.85, 150.0, 149.85, 149.85], [100.0, 148.5, 100.0, 100.0],
  [101.0, 140.0, 101.0, 101.0], [108.6, 138.6, 108.6, 108.6],
  [109.686, 128.0, 109.686, 109.686], [79.8, 126.72, 79.8, 79.8],
  [80.598, 87.78, 80.598, 80.598],
];
const pat = new wickra.Butterfly();
let last = 0;
for (const [o, h, l, c] of bars) last = pat.update(o, h, l, c);
console.log(last); // 1
```

### Streaming

```python
pat = ta.Butterfly()
for o, h, l, c, v, ts in candle_feed:
    signal = pat.update((o, h, l, c, v, ts))
    if signal != 0:
        pass  # Butterfly completed at an extended D — reversal setup
```

## Interpretation

1. **Overshoot reversal.** Unlike Gartley/Bat (D inside XA), the Butterfly's D
   extends beyond X, catching exhaustion at a new extreme — often a strong
   reversal but with a wider stop.
2. **0.786 B.** The deep B retracement is the family marker shared with the
   Crab's structure but distinguished by the extension windows.

## Common pitfalls

- **Wide stops.** The extended D means the protective stop (beyond D) is larger;
  size positions accordingly.
- **Confirmation lag.** Non-repainting but lags the visual D.

## References

- Carney, S. *Harmonic Trading* (2010).

## See also

- [Gartley](/Indicators/Indicator-Gartley), [Bat](/Indicators/Indicator-Bat), [Crab](/Indicators/Indicator-Crab).
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
