# Shark

> Five-point (X-A-B-C-D) harmonic distinguished by an **expansion** leg (AB longer
> than XA) and a `0.886`–`1.13` D completion near A. Bullish (D a swing low) →
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
| Interpretation     | Reversal at the D completion                           |

## Formula

```
last five pivots X-A-B-C-D (the 5-point reading of the Shark):
  AB / XA ∈ [1.13, 1.618]  (expansion — B overshoots X)
  BC / AB ∈ [1.618, 2.24]
  CD / BC ∈ [0.382, 0.886]
  AD / XA ∈ [0.886, 1.13]  (the defining D completion near A)
direction: D a swing low → +1, a swing high → -1
```

See `crates/wickra-core/src/indicators/shark.rs`.

## Parameters

None. Swing threshold `0.05` is a baked-in family constant (`pattern_swing.rs`);
the Fibonacci windows are documented detector constants. `Shark::new` is
infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::Shark, wickra::Candle) -> Option<f64> =
    <wickra::Shark as wickra::Indicator>::update;
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

- **Bullish Shark reports `+1`** (test `bullish_shark_is_plus_one`).
- **Bearish Shark reports `-1`** (test `bearish_shark_is_minus_one`).
- **Legs outside the windows report `0.0`** (test `out_of_ratio_does_not_trigger`).
- **`reset` clears state** (test `reset_clears_state`).
- **Streaming equals batch** (test `batch_equals_streaming`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, Shark};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let bars = [
        (149.85, 150.0, 149.85, 149.85),
        (100.0, 148.5, 100.0, 100.0),
        (101.0, 140.0, 101.0, 101.0),
        (88.0, 138.6, 88.0, 88.0),
        (88.88, 186.8, 88.88, 88.88),
        (100.0, 184.932, 100.0, 100.0),
        (101.0, 110.0, 101.0, 101.0), // D confirms → bullish
    ];
    let mut pat = Shark::new();
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
    (88.0, 138.6, 88.0, 88.0, 1.0, 3),
    (88.88, 186.8, 88.88, 88.88, 1.0, 4),
    (100.0, 184.932, 100.0, 100.0, 1.0, 5),
    (101.0, 110.0, 101.0, 101.0, 1.0, 6),
]
pat = ta.Shark()
print([pat.update(b) for b in bars][-1])  # 1.0
```

### Node

```javascript
const wickra = require('wickra');
const bars = [
  [149.85, 150.0, 149.85, 149.85], [100.0, 148.5, 100.0, 100.0],
  [101.0, 140.0, 101.0, 101.0], [88.0, 138.6, 88.0, 88.0],
  [88.88, 186.8, 88.88, 88.88], [100.0, 184.932, 100.0, 100.0],
  [101.0, 110.0, 101.0, 101.0],
];
const pat = new wickra.Shark();
let last = 0;
for (const [o, h, l, c] of bars) last = pat.update(o, h, l, c);
console.log(last); // 1
```

### Streaming

```python
pat = ta.Shark()
for o, h, l, c, v, ts in candle_feed:
    signal = pat.update((o, h, l, c, v, ts))
    if signal != 0:
        pass  # Shark completed at D — reversal setup
```

## Interpretation

1. **Expansion structure.** The Shark is unusual in that B overshoots X (AB > XA);
   the detector reads it as a 5-point XABCD with the expansion encoded in the
   `AB/XA > 1` window.
2. **Near-A completion.** D returns close to A (`0.886`–`1.13` of XA), a tighter
   reversal zone than the Crab/Butterfly extensions.

## Common pitfalls

- **5-point approximation.** Some literature defines the Shark on the O-X-A-B-C
  points; this detector uses the equivalent 5-pivot XABCD reading, documented in
  the source.
- **Confirmation lag.** Non-repainting but lags the visual D.

## References

- Carney, S. *Harmonic Trading, Volume Two* (2013) — the Shark pattern.

## See also

- [Cypher](/Indicators/Indicator-Cypher), [Crab](/Indicators/Indicator-Crab), [Gartley](/Indicators/Indicator-Gartley).
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
