# Cypher

> Five-point (X-A-B-C-D) harmonic whose C point projects the XA leg beyond A and
> whose D retraces the XC leg by `0.786`. Bullish (D a swing low) → `+1`,
> bearish → `-1`.

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
  AB / XA ∈ [0.382, 0.618]
  XC / XA ∈ [1.272, 1.414]  (the X-to-C projection — C extends beyond A)
  CD / XC ∈ [0.74, 0.83]    (≈ 0.786 retracement of the XC leg — the D completion)
direction: D a swing low → +1, a swing high → -1
```

The C constraint is the X-to-C projection, not B-to-C. That is what sets the
Cypher apart from the Gartley family, where the third point is measured against
AB. See `crates/wickra-core/src/indicators/cypher.rs`.

## Parameters

None. Swing threshold `0.05` is a baked-in family constant (`pattern_swing.rs`);
the Fibonacci windows are documented detector constants. `Cypher::new` is
infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::Cypher, wickra::Candle) -> Option<f64> =
    <wickra::Cypher as wickra::Indicator>::update;
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

- **Bullish Cypher reports `+1`** (test `bullish_cypher_is_plus_one`).
- **Bearish Cypher reports `-1`** (test `bearish_cypher_is_minus_one`).
- **Legs outside the windows report `0.0`** (test `out_of_ratio_does_not_trigger`).
- **`reset` clears state** (test `reset_clears_state`).
- **Streaming equals batch** (test `batch_equals_streaming`).

## Examples

### Rust

```rust
use wickra::{Candle, Cypher, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let bars = [
        (149.85, 150.0, 149.85, 149.85),
        (100.0, 148.5, 100.0, 100.0),
        (101.0, 140.0, 101.0, 101.0),
        (120.0, 138.6, 120.0, 120.0),
        (121.2, 168.0, 121.2, 121.2),
        (114.55, 166.32, 114.55, 114.55),
        (115.6955, 126.005, 115.6955, 115.6955), // D confirms → bullish
    ];
    let mut pat = Cypher::new();
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
    (121.2, 168.0, 121.2, 121.2, 1.0, 4),
    (114.55, 166.32, 114.55, 114.55, 1.0, 5),
    (115.6955, 126.005, 115.6955, 115.6955, 1.0, 6),
]
pat = ta.Cypher()
print([pat.update(b) for b in bars][-1])  # 1.0
```

### Node

```javascript
const wickra = require('wickra');
const bars = [
  [149.85, 150.0, 149.85, 149.85], [100.0, 148.5, 100.0, 100.0],
  [101.0, 140.0, 101.0, 101.0], [120.0, 138.6, 120.0, 120.0],
  [121.2, 168.0, 121.2, 121.2], [114.55, 166.32, 114.55, 114.55],
  [115.6955, 126.005, 115.6955, 115.6955],
];
const pat = new wickra.Cypher();
let last = 0;
for (const [o, h, l, c] of bars) last = pat.update(o, h, l, c);
console.log(last); // 1
```

### Streaming

```python
pat = ta.Cypher()
for o, h, l, c, v, ts in candle_feed:
    signal = pat.update((o, h, l, c, v, ts))
    if signal != 0:
        pass  # Cypher completed at D — reversal setup
```

## Interpretation

1. **Different ratio basis.** Because C is measured X-to-C against XA and D
   against XC, the Cypher often coexists with — but is not interchangeable
   with — the Gartley family; run both if you want full coverage.
2. **0.786 D of XC.** The reversal zone is the `0.786` retracement of the whole
   X→C move, not of a single sub-leg.

## Common pitfalls

- **Ratio basis confusion.** The Cypher constrains XC/XA, measured from the
  pattern origin. Comparing it to the Gartley's BC/AB reads a different leg and
  will accept shapes the Cypher rejects.
- **Confirmation lag.** Non-repainting but lags the visual D.

## References

- Pesavento, L. and others; Carney, S. *Harmonic Trading* (2010) for the modern
  ratio conventions.

## See also

- [Shark](/Indicators/Indicator-Shark), [Gartley](/Indicators/Indicator-Gartley), [Bat](/Indicators/Indicator-Bat).
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
