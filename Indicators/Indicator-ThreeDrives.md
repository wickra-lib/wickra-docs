# Three Drives

> A symmetric harmonic of two visible drives separated by two retracements, read
> from the last five pivots. Three rising drives → bearish `-1`; three falling
> drives → bullish `+1`.

## Quick reference

| Item               | Value                                                  |
|--------------------|--------------------------------------------------------|
| Family             | Harmonic Patterns                                      |
| Input type         | `Candle` (uses `high`, `low`)                          |
| Output type        | `f64` (`+1` / `-1` / `0`)                              |
| Output range       | `{-1.0, 0.0, +1.0}`                                    |
| Default parameters | none (swing threshold 5%, baked)                       |
| Warmup period      | `6`                                                    |
| Interpretation     | Exhaustion after three symmetric drives                |

## Formula

```
last five pivots X-A-B-C-D (drive legs A→B and C→D):
  AB / XA ∈ [1.13, 1.75]   (drive 1 extends the prior retracement)
  CD / BC ∈ [1.13, 1.75]   (drive 2 extends symmetrically)
  AB ≈ CD (within 20%)      (the two drives are similar in size)
  XA ≈ BC (within 30%)      (the two retracements are similar)
direction: terminal D a swing high → -1 (drives up), a swing low → +1 (drives down)
```

See `crates/wickra-core/src/indicators/three_drives.rs`.

## Parameters

None. Swing threshold `0.05` is a baked-in family constant (`pattern_swing.rs`);
the extension windows and symmetry tolerances are documented detector constants.
`ThreeDrives::new` is infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::ThreeDrives, wickra::Candle) -> Option<f64> =
    <wickra::ThreeDrives as wickra::Indicator>::update;
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

- **Three rising drives report `-1`** (test `bearish_three_drives_is_minus_one`).
- **Three falling drives report `+1`** (test `bullish_three_drives_is_plus_one`).
- **Asymmetric / non-extending drives report `0.0`**
  (test `asymmetric_drives_do_not_trigger`).
- **`reset` clears state** (test `reset_clears_state`).
- **Streaming equals batch** (test `batch_equals_streaming`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, ThreeDrives};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Three rising drives (120, 128, 136) with symmetric retracements → bearish.
    let bars = [
        (119.88, 120.0, 119.88, 119.88),
        (100.0, 118.8, 100.0, 100.0),
        (101.0, 128.0, 101.0, 101.0),
        (108.0, 126.72, 108.0, 108.0),
        (109.08, 136.0, 109.08, 109.08),
        (122.4, 134.64, 122.4, 122.4), // third drive confirms → bearish
    ];
    let mut pat = ThreeDrives::new();
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
    (119.88, 120.0, 119.88, 119.88, 1.0, 0),
    (100.0, 118.8, 100.0, 100.0, 1.0, 1),
    (101.0, 128.0, 101.0, 101.0, 1.0, 2),
    (108.0, 126.72, 108.0, 108.0, 1.0, 3),
    (109.08, 136.0, 109.08, 109.08, 1.0, 4),
    (122.4, 134.64, 122.4, 122.4, 1.0, 5),
]
pat = ta.ThreeDrives()
print([pat.update(b) for b in bars][-1])  # -1.0
```

### Node

```javascript
const wickra = require('wickra');
const bars = [
  [119.88, 120.0, 119.88, 119.88], [100.0, 118.8, 100.0, 100.0],
  [101.0, 128.0, 101.0, 101.0], [108.0, 126.72, 108.0, 108.0],
  [109.08, 136.0, 109.08, 109.08], [122.4, 134.64, 122.4, 122.4],
];
const pat = new wickra.ThreeDrives();
let last = 0;
for (const [o, h, l, c] of bars) last = pat.update(o, h, l, c);
console.log(last); // -1
```

### Streaming

```python
pat = ta.ThreeDrives()
for o, h, l, c, v, ts in candle_feed:
    signal = pat.update((o, h, l, c, v, ts))
    if signal < 0:
        pass  # three drives up — exhaustion, reversal lower
    elif signal > 0:
        pass  # three drives down — exhaustion, reversal higher
```

## Interpretation

1. **Symmetric exhaustion.** Three measured, equal drives with equal pullbacks
   signal that the move is overextended; the reversal target is back toward the
   pattern's origin.
2. **Symmetry is the filter.** The two `≈` checks (equal drives, equal
   retracements) keep ragged, accidental three-leg moves out.

## Common pitfalls

- **Two-drive reading.** This detector keys on the two *visible* drive legs of the
  five-pivot window; ensure the data actually shows the classic three-push
  structure before trusting the signal.
- **Confirmation lag.** Non-repainting but lags the third drive's extreme.

## References

- Pesavento, L. *Fibonacci Ratios with Pattern Recognition* (1997).

## See also

- [Gartley](/Indicators/Indicator-Gartley), [Crab](/Indicators/Indicator-Crab).
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
