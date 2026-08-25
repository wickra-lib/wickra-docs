# Head and Shoulders

> Five-pivot reversal: a central extreme (the head) flanked by two matching
> shoulders over a roughly flat neckline. Top → bearish `-1`; inverse → bullish
> `+1`.

## Quick reference

| Item               | Value                                                  |
|--------------------|--------------------------------------------------------|
| Family             | Chart Patterns                                         |
| Input type         | `Candle` (uses `high`, `low`)                          |
| Output type        | `f64` (`+1` / `-1` / `0`)                              |
| Output range       | `{-1.0, 0.0, +1.0}`                                    |
| Default parameters | none (swing threshold 5%, level tolerance 3%, baked)   |
| Warmup period      | `6`                                                    |
| Interpretation     | Reversal — confirmed on the right shoulder             |

## Formula

```
swing pivots confirmed by a 5% non-repainting zig-zag (pattern_swing)
last five pivots: LeftShoulder, Neck1, Head, Neck2, RightShoulder
top (-1) : Head > both shoulders ; LeftShoulder ≈ RightShoulder (±3%)
                                 ; Neck1 ≈ Neck2 (±3%)
inverse (+1) : Head < both shoulders ; shoulders ≈ ; necks ≈
otherwise → 0
```

See `crates/wickra-core/src/indicators/head_and_shoulders.rs`.

## Parameters

None. Swing threshold `0.05` and level tolerance `0.03` are baked-in family
constants (`pattern_swing.rs`). `HeadAndShoulders::new` is infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::HeadAndShoulders, wickra::Candle) -> Option<f64> =
    <wickra::HeadAndShoulders as wickra::Indicator>::update;
```

- **Python.** `update((o,h,l,c,v,ts))` → `float` (never `None`);
  `batch(open, high, low, close)` → `array.array('d')`.
- **Node.** `update(open, high, low, close)` → `number`;
  `batch(open, high, low, close)` → `number[]`.
- **WASM.** `update(open, high, low, close)` → `number`.

## Warmup

`warmup_period() == 6`. Five confirmed pivots are required; the earliest bar that
can confirm a fifth pivot is the sixth. Pinned by test `accessors_and_metadata`.

## Edge cases

- **Head-and-shoulders top reports `-1`** (test `head_and_shoulders_top_is_minus_one`).
- **Inverse reports `+1`** (test `inverse_head_and_shoulders_is_plus_one`).
- **Mismatched shoulders report `0.0`** (test `mismatched_shoulders_do_not_trigger`).
- **Three equal highs (no dominant head) report `0.0`** — that is a triple top,
  not H&S (test `equal_highs_without_taller_head_do_not_trigger`).
- **Inverse with mismatched shoulders reports `0.0`** (test
  `inverse_mismatched_shoulders_do_not_trigger`).
- **`reset` clears state** (test `reset_clears_state`).
- **Streaming equals batch** (test `batch_equals_streaming`).

## Examples

### Rust

```rust
use wickra::{Candle, HeadAndShoulders, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // LS 100, trough 90, head 120, trough 92, RS 101 → head-and-shoulders top.
    let bars = [
        (99.9, 100.0, 99.9, 99.9),
        (90.0, 99.0, 90.0, 90.0),
        (90.9, 120.0, 90.9, 90.9),
        (92.0, 118.8, 92.0, 92.0),
        (92.92, 101.0, 92.92, 92.92),
        (90.9, 99.99, 90.9, 90.9), // right shoulder confirms → top
    ];
    let mut pat = HeadAndShoulders::new();
    let mut last = 0.0;
    for (ts, (o, h, l, c)) in bars.iter().enumerate() {
        last = pat.update(Candle::new(*o, *h, *l, *c, 1.0, ts as i64)?).unwrap();
    }
    println!("{last}"); // -1
    Ok(())
}
```

### Python

```python
import wickra as ta

bars = [
    (99.9, 100.0, 99.9, 99.9, 1.0, 0),
    (90.0, 99.0, 90.0, 90.0, 1.0, 1),
    (90.9, 120.0, 90.9, 90.9, 1.0, 2),
    (92.0, 118.8, 92.0, 92.0, 1.0, 3),
    (92.92, 101.0, 92.92, 92.92, 1.0, 4),
    (90.9, 99.99, 90.9, 90.9, 1.0, 5),
]
pat = ta.HeadAndShoulders()
print([pat.update(b) for b in bars][-1])  # -1.0
```

### Node

```javascript
const wickra = require('wickra');
const bars = [
  [99.9, 100.0, 99.9, 99.9], [90.0, 99.0, 90.0, 90.0],
  [90.9, 120.0, 90.9, 90.9], [92.0, 118.8, 92.0, 92.0],
  [92.92, 101.0, 92.92, 92.92], [90.9, 99.99, 90.9, 90.9],
];
const pat = new wickra.HeadAndShoulders();
let last = 0;
for (const [o, h, l, c] of bars) last = pat.update(o, h, l, c);
console.log(last); // -1
```

### Streaming

```python
pat = ta.HeadAndShoulders()
for o, h, l, c, v, ts in candle_feed:
    signal = pat.update((o, h, l, c, v, ts))
    if signal < 0:
        pass  # H&S top — distribution / reversal lower
    elif signal > 0:
        pass  # inverse H&S — accumulation / reversal higher
```

## Interpretation

1. **Neckline break.** Textbook H&S confirms on the neckline break; this detector
   confirms one pivot earlier (the right shoulder), so pair it with a neckline
   (the average of the two necks) for a precise entry/stop.
2. **Symmetry.** The tighter the shoulder match and the flatter the neckline, the
   more reliable the reversal.

## Common pitfalls

- **Head dominance.** If all three highs are equal the detector returns `0.0` and
  defers to [TripleTopBottom](/Indicators/Indicator-TripleTopBottom) — H&S requires a head
  taller (or, inverted, lower) than both shoulders.
- **Confirmation lag.** Non-repainting but lagging the visual right shoulder by
  the threshold move.

## See also

- [DoubleTopBottom](/Indicators/Indicator-DoubleTopBottom), [TripleTopBottom](/Indicators/Indicator-TripleTopBottom).
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
