# Double Top / Bottom

> Twin-peak / twin-trough reversal detected from confirmed swing pivots: two
> matching highs around a trough → bearish `-1`; two matching lows around a peak
> → bullish `+1`.

## Quick reference

| Item               | Value                                                  |
|--------------------|--------------------------------------------------------|
| Family             | Chart Patterns                                         |
| Input type         | `Candle` (uses `high`, `low`)                          |
| Output type        | `f64` (`+1` / `-1` / `0`)                              |
| Output range       | `{-1.0, 0.0, +1.0}`                                    |
| Default parameters | none (swing threshold 5%, level tolerance 3%, baked)   |
| Warmup period      | `5`                                                    |
| Interpretation     | Reversal — confirmed on the second matching extreme    |

## Formula

```
swing pivots are confirmed by a 5% non-repainting zig-zag (pattern_swing)
on each new pivot, look at the last three pivots p1, p2, p3:
  double top    : High , Low , High   with  High₁ ≈ High₃ (±3%)  → -1
  double bottom : Low  , High , Low    with  Low₁  ≈ Low₃  (±3%)  → +1
otherwise → 0
```

Two extremes count as the same level when they are within 3% of the larger
magnitude. Because pivots strictly alternate high/low, the trough between twin
tops (or the peak between twin bottoms) is beyond both by construction. See
`crates/wickra-core/src/indicators/double_top_bottom.rs`.

## Parameters

None. The swing threshold (`SWING_THRESHOLD = 0.05`) and level tolerance
(`LEVEL_TOLERANCE = 0.03`) are baked-in constants shared across the family
(`crates/wickra-core/src/indicators/pattern_swing.rs`), mirroring how the
candlestick patterns bake in their geometric thresholds. `DoubleTopBottom::new`
is infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::DoubleTopBottom, wickra::Candle) -> Option<f64> =
    <wickra::DoubleTopBottom as wickra::Indicator>::update;
```

- **Python.** `update((o,h,l,c,v,ts))` → `float` (`0.0` until a pattern, never
  `None`); `batch(open, high, low, close)` → `array.array('d')`.
- **Node.** `update(open, high, low, close)` → `number`;
  `batch(open, high, low, close)` → `number[]`.
- **WASM.** `update(open, high, low, close)` → `number`.

## Warmup

`warmup_period() == 5`. Three confirmed pivots are required and the earliest bar
that can confirm a third pivot is the fifth; before that the detector returns
`0.0`. The metadata is pinned by test `accessors_and_metadata`.

## Edge cases

- **Double top reports `-1`** (test `double_top_is_minus_one`).
- **Double bottom reports `+1`** (test `double_bottom_is_plus_one`).
- **Mismatched second peak reports `0.0`** (test `unequal_tops_do_not_trigger`).
- **`reset` clears the swing state and history** (test `reset_clears_state`).
- **Streaming equals batch** (test `batch_equals_streaming`).

## Examples

### Rust

```rust
use wickra::{Candle, DoubleTopBottom, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let bars = [
        (119.88, 120.0, 119.88, 119.88),
        (100.0, 118.8, 100.0, 100.0),  // confirms the first top at 120
        (101.0, 120.0, 101.0, 101.0),  // confirms the trough at 100
        (108.0, 118.8, 108.0, 108.0),  // confirms the second top → double top
    ];
    let mut pat = DoubleTopBottom::new();
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
    (101.0, 120.0, 101.0, 101.0, 1.0, 2),
    (108.0, 118.8, 108.0, 108.0, 1.0, 3),
]
pat = ta.DoubleTopBottom()
print([pat.update(b) for b in bars][-1])  # -1.0
```

### Node

```javascript
const wickra = require('wickra');
const bars = [
  [119.88, 120.0, 119.88, 119.88],
  [100.0, 118.8, 100.0, 100.0],
  [101.0, 120.0, 101.0, 101.0],
  [108.0, 118.8, 108.0, 108.0],
];
const pat = new wickra.DoubleTopBottom();
let last = 0;
for (const [o, h, l, c] of bars) last = pat.update(o, h, l, c);
console.log(last); // -1
```

### Streaming

```python
pat = ta.DoubleTopBottom()
for o, h, l, c, v, ts in candle_feed:
    signal = pat.update((o, h, l, c, v, ts))
    if signal < 0:
        pass  # double top confirmed — potential short / exit longs
    elif signal > 0:
        pass  # double bottom confirmed — potential long / exit shorts
```

## Interpretation

1. **Confirmation lag.** The pattern fires on the bar that confirms the second
   matching extreme via the zig-zag, so it is non-repainting but lags the visual
   peak/trough by the threshold move. Treat it as confirmation, not prediction.
2. **Reversal strength.** A double top/bottom is a classic reversal; combine the
   signal with the broader trend and the neckline (the intervening extreme) for
   an entry/stop framework.

## Common pitfalls

- **Threshold sensitivity.** The 5% swing threshold suits swing/daily data; on
  very low-volatility series few pivots confirm and the pattern rarely fires.
- **Not a target.** The detector reports the reversal, not a price target — the
  classic measured move (height of the pattern projected from the neckline) is
  left to the caller.

## See also

- [TripleTopBottom](/Indicators/Indicator-TripleTopBottom) — the three-extreme variant.
- [HeadAndShoulders](/Indicators/Indicator-HeadAndShoulders) — asymmetric three-peak reversal.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
