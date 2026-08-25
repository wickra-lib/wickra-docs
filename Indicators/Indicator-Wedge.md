# Wedge (rising / falling)

> Both trendlines slope the same way but converge, signalling exhaustion. Rising
> wedge → bearish `-1`; falling wedge → bullish `+1`.

## Quick reference

| Item               | Value                                                  |
|--------------------|--------------------------------------------------------|
| Family             | Chart Patterns                                         |
| Input type         | `Candle` (uses `high`, `low`)                          |
| Output type        | `f64` (`+1` / `-1` / `0`)                              |
| Output range       | `{-1.0, 0.0, +1.0}`                                    |
| Default parameters | none (swing threshold 5%, baked)                       |
| Warmup period      | `5`                                                    |
| Interpretation     | Reversal — converging same-direction trendlines        |

## Formula

```
from the last four pivots derive (high_old, high_new, low_old, low_new):
  high_slope = high_new - high_old ; low_slope = low_new - low_old
  rising wedge  : both slopes > 0 and low_slope  > high_slope → -1 (bearish)
  falling wedge : both slopes < 0 and high_slope < low_slope  → +1 (bullish)
otherwise → 0
```

Convergence is the key: in a rising wedge the lower line climbs faster than the
upper; in a falling wedge the upper line drops faster than the lower. See
`crates/wickra-core/src/indicators/wedge.rs`.

## Parameters

None. Swing threshold `0.05` is a baked-in family constant (`pattern_swing.rs`).
`Wedge::new` is infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::Wedge, wickra::Candle) -> Option<f64> =
    <wickra::Wedge as wickra::Indicator>::update;
```

- **Python.** `update((o,h,l,c,v,ts))` → `float` (never `None`);
  `batch(open, high, low, close)` → `array.array('d')`.
- **Node.** `update(open, high, low, close)` → `number`;
  `batch(open, high, low, close)` → `number[]`.
- **WASM.** `update(open, high, low, close)` → `number`.

## Warmup

`warmup_period() == 5`. Four confirmed pivots are required; the earliest bar that
can confirm a fourth pivot is the fifth. Pinned by test `accessors_and_metadata`.

## Edge cases

- **Rising wedge reports `-1`** (test `rising_wedge_is_minus_one`).
- **Falling wedge reports `+1`** (test `falling_wedge_is_plus_one`).
- **Diverging (broadening) swings report `0.0`**
  (test `diverging_swings_are_not_a_wedge`).
- **`reset` clears state** (test `reset_clears_state`).
- **Streaming equals batch** (test `batch_equals_streaming`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, Wedge};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Highs 100 → 103 (+3), lows 90 → 94 (+4, steeper) → rising wedge.
    let bars = [
        (109.89, 110.0, 109.89, 109.89),
        (90.0, 108.9, 90.0, 90.0),
        (90.9, 100.0, 90.9, 90.9),
        (94.0, 99.0, 94.0, 94.0),
        (94.94, 103.0, 94.94, 94.94),
        (92.7, 101.97, 92.7, 92.7),
    ];
    let mut pat = Wedge::new();
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
    (109.89, 110.0, 109.89, 109.89, 1.0, 0),
    (90.0, 108.9, 90.0, 90.0, 1.0, 1),
    (90.9, 100.0, 90.9, 90.9, 1.0, 2),
    (94.0, 99.0, 94.0, 94.0, 1.0, 3),
    (94.94, 103.0, 94.94, 94.94, 1.0, 4),
    (92.7, 101.97, 92.7, 92.7, 1.0, 5),
]
pat = ta.Wedge()
print([pat.update(b) for b in bars][-1])  # -1.0
```

### Node

```javascript
const wickra = require('wickra');
const bars = [
  [109.89, 110.0, 109.89, 109.89], [90.0, 108.9, 90.0, 90.0],
  [90.9, 100.0, 90.9, 90.9], [94.0, 99.0, 94.0, 94.0],
  [94.94, 103.0, 94.94, 94.94], [92.7, 101.97, 92.7, 92.7],
];
const pat = new wickra.Wedge();
let last = 0;
for (const [o, h, l, c] of bars) last = pat.update(o, h, l, c);
console.log(last); // -1
```

### Streaming

```python
pat = ta.Wedge()
for o, h, l, c, v, ts in candle_feed:
    signal = pat.update((o, h, l, c, v, ts))
    if signal < 0:
        pass  # rising wedge — momentum fading despite higher highs (bearish)
    elif signal > 0:
        pass  # falling wedge — selling exhausting despite lower lows (bullish)
```

## Interpretation

1. **Exhaustion, not trend.** A rising wedge makes higher highs yet warns of a
   downside reversal because the lows rise faster (buyers stretching). The
   falling wedge is the mirror.
2. **Counter-trend by nature.** The signal often opposes the prevailing slope, so
   confirm with a trendline break before acting.

## Common pitfalls

- **Wedge vs triangle.** A wedge needs both lines sloping the *same* way; a
  triangle has at least one flat line. The detectors are distinct — check both.
- **Slope, not level.** The verdict is purely about the relative slopes of the
  last two highs and lows, not absolute price levels.

## See also

- [Triangle](/Indicators/Indicator-Triangle) — converging with at least one flat line.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
