# Gartley

> The classic five-point (X-A-B-C-D) harmonic pattern with a `0.618` B
> retracement and a `0.786` D completion. Bullish (D a swing low) → `+1`,
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
swing pivots confirmed by a 5% non-repainting zig-zag (pattern_swing)
last five pivots X-A-B-C-D, legs measured as absolute price differences:
  AB / XA ∈ [0.55, 0.70]   (≈ 0.618)
  BC / AB ∈ [0.382, 0.886]
  CD / BC ∈ [1.13, 1.618]
  AD / XA ∈ [0.74, 0.84]   (≈ 0.786 — the defining D completion)
direction: D a swing low → +1 (bullish), D a swing high → -1 (bearish)
```

See `crates/wickra-core/src/indicators/gartley.rs`.

## Parameters

None. The swing threshold (`SWING_THRESHOLD = 0.05`) is a baked-in family
constant (`pattern_swing.rs`) and the Fibonacci windows are documented constants
in the detector. `Gartley::new` is infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::Gartley, wickra::Candle) -> Option<f64> =
    <wickra::Gartley as wickra::Indicator>::update;
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

- **Bullish Gartley reports `+1`** (test `bullish_gartley_is_plus_one`).
- **Bearish Gartley reports `-1`** (test `bearish_gartley_is_minus_one`).
- **Legs outside the windows report `0.0`** (test `out_of_ratio_does_not_trigger`).
- **`reset` clears state** (test `reset_clears_state`).
- **Streaming equals batch** (test `batch_equals_streaming`).

## Examples

### Rust

```rust
use wickra::{Candle, Gartley, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // X=100 A=140 B=115.3 C=127.65 D=108.56 → AB/XA≈0.618, AD/XA≈0.786.
    let bars = [
        (149.85, 150.0, 149.85, 149.85),
        (100.0, 148.5, 100.0, 100.0),
        (101.0, 140.0, 101.0, 101.0),
        (115.3, 138.6, 115.3, 115.3),
        (116.453, 127.65, 116.453, 116.453),
        (108.56, 126.3735, 108.56, 108.56),
        (109.6456, 119.416, 109.6456, 109.6456), // D confirms → bullish
    ];
    let mut pat = Gartley::new();
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
    (115.3, 138.6, 115.3, 115.3, 1.0, 3),
    (116.453, 127.65, 116.453, 116.453, 1.0, 4),
    (108.56, 126.3735, 108.56, 108.56, 1.0, 5),
    (109.6456, 119.416, 109.6456, 109.6456, 1.0, 6),
]
pat = ta.Gartley()
print([pat.update(b) for b in bars][-1])  # 1.0
```

### Node

```javascript
const wickra = require('wickra');
const bars = [
  [149.85, 150.0, 149.85, 149.85], [100.0, 148.5, 100.0, 100.0],
  [101.0, 140.0, 101.0, 101.0], [115.3, 138.6, 115.3, 115.3],
  [116.453, 127.65, 116.453, 116.453], [108.56, 126.3735, 108.56, 108.56],
  [109.6456, 119.416, 109.6456, 109.6456],
];
const pat = new wickra.Gartley();
let last = 0;
for (const [o, h, l, c] of bars) last = pat.update(o, h, l, c);
console.log(last); // 1
```

### Streaming

```python
pat = ta.Gartley()
for o, h, l, c, v, ts in candle_feed:
    signal = pat.update((o, h, l, c, v, ts))
    if signal > 0:
        pass  # bullish Gartley completed at D — reversal long setup
    elif signal < 0:
        pass  # bearish Gartley — reversal short setup
```

## Interpretation

1. **Reversal at D.** The signal fires when price completes the D leg inside the
   Gartley windows; the potential reversal zone is around D. Combine with the
   structure's stop (just beyond X) for risk control.
2. **Tightest of the four.** Gartley's `0.786` D is shallower than Bat (`0.886`),
   Butterfly/Crab (extensions) — the family differs only in these ratio windows.

## Common pitfalls

- **Window tolerance.** The windows use standard harmonic ranges with a small
  tolerance; real-world patterns that miss a ratio by more than the band will not
  register — by design, to avoid false positives.
- **Confirmation lag.** Non-repainting but lags the visual D by the threshold
  move that confirms the pivot.

## References

- Gartley, H. M. *Profits in the Stock Market* (1935); Carney, S. *Harmonic
  Trading* (2010) for the modern Fibonacci ratios.

## See also

- [Bat](/Indicators/Indicator-Bat), [Butterfly](/Indicators/Indicator-Butterfly), [Crab](/Indicators/Indicator-Crab),
  [Shark](/Indicators/Indicator-Shark), [Cypher](/Indicators/Indicator-Cypher).
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
