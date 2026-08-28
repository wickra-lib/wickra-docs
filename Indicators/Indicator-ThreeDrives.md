# Three Drives

> A symmetric harmonic of three drives separated by two retracements, read from
> the last seven pivots. Three rising drives → bearish `-1`; three falling
> drives → bullish `+1`.

## Quick reference

| Item               | Value                                                  |
|--------------------|--------------------------------------------------------|
| Family             | Harmonic Patterns                                      |
| Input type         | `Candle` (uses `high`, `low`)                          |
| Output type        | `f64` (`+1` / `-1` / `0`)                              |
| Output range       | `{-1.0, 0.0, +1.0}`                                    |
| Default parameters | none (swing threshold 5%, baked)                       |
| Warmup period      | `8`                                                    |
| Interpretation     | Exhaustion after three symmetric drives                |

## Formula

```
last seven pivots, six alternating legs R1 D1 R2 D2 R3 D3:
  D1 / R1 ∈ [1.13, 1.75]        (each drive extends the leg before it)
  D2 / R2 ∈ [1.13, 1.75]
  D3 / R3 ∈ [1.13, 1.75]
  D1 ≈ D2 ≈ D3 (within 20%)     (the three drives are similar in size)
  R1 ≈ R2 ≈ R3 (within 30%)     (the retracements between them are similar)
direction: terminal pivot a swing high → -1 (drives up), a swing low → +1
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
  `batch(open, high, low, close)` → `array.array('d')`.
- **Node.** `update(open, high, low, close)` → `number`;
  `batch(open, high, low, close)` → `number[]`.
- **WASM.** `update(open, high, low, close)` → `number`.

## Warmup

`warmup_period() == 8`. Seven confirmed pivots are required — a structure that
stops after two drives is incomplete, not a match, and the detector keeps
returning `None`. Pinned by tests `accessors_and_metadata` and
`two_drives_alone_do_not_complete_the_pattern`.

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
    // Three rising drives (124, 128, 132), each extending a 10-point
    // retracement by 14 → bearish exhaustion.
    let bars = [
        (119.88, 120.0, 119.88, 119.88),
        (110.0, 118.8, 110.0, 110.0),
        (111.1, 124.0, 111.1, 111.1),
        (114.0, 122.76, 114.0, 114.0),
        (115.14, 128.0, 115.14, 115.14),
        (118.0, 126.72, 118.0, 118.0),
        (119.18, 132.0, 119.18, 119.18),
        (118.8, 130.68, 118.8, 118.8), // third drive confirms → bearish
    ];
    let mut pat = ThreeDrives::new();
    let mut last = 0.0;
    for (ts, (o, h, l, c)) in bars.iter().enumerate() {
        last = pat
            .update(Candle::new(*o, *h, *l, *c, 1.0, ts as i64)?)
            .unwrap_or(last);
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
    (110.0, 118.8, 110.0, 110.0, 1.0, 1),
    (111.1, 124.0, 111.1, 111.1, 1.0, 2),
    (114.0, 122.76, 114.0, 114.0, 1.0, 3),
    (115.14, 128.0, 115.14, 115.14, 1.0, 4),
    (118.0, 126.72, 118.0, 118.0, 1.0, 5),
    (119.18, 132.0, 119.18, 119.18, 1.0, 6),
    (118.8, 130.68, 118.8, 118.8, 1.0, 7),
]
pat = ta.ThreeDrives()
print([pat.update(b) for b in bars][-1])  # -1.0
```

### Node

```javascript
const wickra = require('wickra');
const bars = [
  [119.88, 120.0, 119.88, 119.88], [110.0, 118.8, 110.0, 110.0],
  [111.1, 124.0, 111.1, 111.1], [114.0, 122.76, 114.0, 114.0],
  [115.14, 128.0, 115.14, 115.14], [118.0, 126.72, 118.0, 118.0],
  [119.18, 132.0, 119.18, 119.18], [118.8, 130.68, 118.8, 118.8],
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
