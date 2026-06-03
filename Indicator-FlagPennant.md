# Flag / Pennant

> A brief, shallow consolidation against a sharp prior move (the "pole"),
> resolving in the pole's direction. Bull flag → `+1`; bear flag → `-1`.

## Quick reference

| Item               | Value                                                  |
|--------------------|--------------------------------------------------------|
| Family             | Chart Patterns                                         |
| Input type         | `Candle` (uses `high`, `low`)                          |
| Output type        | `f64` (`+1` / `-1` / `0`)                              |
| Output range       | `{-1.0, 0.0, +1.0}`                                    |
| Default parameters | none (swing threshold 5%, baked)                       |
| Warmup period      | `4`                                                    |
| Interpretation     | Continuation in the pole direction                     |

## Formula

```
from the last three pivots pole_start, pole_end, consolidation:
  pole     = |pole_end - pole_start|
  pullback = |consolidation - pole_end|
  qualifies when pullback < 0.5 * pole
  bull flag : pole_end is a swing high → +1
  bear flag : pole_end is a swing low  → -1
otherwise → 0
```

A flag/pennant is the same structure at this resolution; both are a small
counter-move after an impulse. See
`crates/wickra-core/src/indicators/flag_pennant.rs`.

## Parameters

None. Swing threshold `0.05` and the `0.5` max-retrace fraction are baked-in
constants. `FlagPennant::new` is infallible.

## Inputs / Outputs

```rust
const _: fn(&mut wickra::FlagPennant, wickra::Candle) -> Option<f64> =
    <wickra::FlagPennant as wickra::Indicator>::update;
```

- **Python.** `update((o,h,l,c,v,ts))` → `float` (never `None`);
  `batch(open, high, low, close)` → 1-D `ndarray`.
- **Node.** `update(open, high, low, close)` → `number`;
  `batch(open, high, low, close)` → `number[]`.
- **WASM.** `update(open, high, low, close)` → `number`.

## Warmup

`warmup_period() == 4`. Three confirmed pivots are required; the earliest bar
that can confirm a third pivot is the fourth. Pinned by test
`accessors_and_metadata`.

## Edge cases

- **Bull flag reports `+1`** (test `bull_flag_is_plus_one`).
- **Bear flag reports `-1`** (test `bear_flag_is_minus_one`).
- **Deep pullback (≥ half the pole) reports `0.0`**
  (test `deep_pullback_is_not_a_flag`).
- **`reset` clears state** (test `reset_clears_state`).
- **Streaming equals batch** (test `batch_equals_streaming`).

## Examples

### Rust

```rust
use wickra::{Candle, FlagPennant, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Up-pole 100 → 140 (40), shallow pullback to 130 (10 < 20) → bull flag.
    let bars = [
        (149.85, 150.0, 149.85, 149.85),
        (100.0, 148.5, 100.0, 100.0),
        (101.0, 140.0, 101.0, 101.0),
        (130.0, 138.6, 130.0, 130.0),
        (131.3, 143.0, 131.3, 131.3),
    ];
    let mut pat = FlagPennant::new();
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
    (130.0, 138.6, 130.0, 130.0, 1.0, 3),
    (131.3, 143.0, 131.3, 131.3, 1.0, 4),
]
pat = ta.FlagPennant()
print([pat.update(b) for b in bars][-1])  # 1.0
```

### Node

```javascript
const wickra = require('wickra');
const bars = [
  [149.85, 150.0, 149.85, 149.85], [100.0, 148.5, 100.0, 100.0],
  [101.0, 140.0, 101.0, 101.0], [130.0, 138.6, 130.0, 130.0],
  [131.3, 143.0, 131.3, 131.3],
];
const pat = new wickra.FlagPennant();
let last = 0;
for (const [o, h, l, c] of bars) last = pat.update(o, h, l, c);
console.log(last); // 1
```

### Streaming

```python
pat = ta.FlagPennant()
for o, h, l, c, v, ts in candle_feed:
    signal = pat.update((o, h, l, c, v, ts))
    if signal > 0:
        pass  # bull flag — continuation higher expected
    elif signal < 0:
        pass  # bear flag — continuation lower expected
```

## Interpretation

1. **Continuation bias.** The flag confirms on the consolidation pivot and
   anticipates a breakout in the pole's direction — it is a trend-continuation
   signal, the opposite intent of the reversal patterns.
2. **Pole quality.** A larger pole relative to the pullback means a cleaner flag;
   the half-pole retrace cap keeps deep, range-like pullbacks out.

## Common pitfalls

- **No volume filter.** Classic flags weaken on declining volume; this detector
  is price-only, so add a volume check for higher-conviction setups.
- **Resolution dependence.** "Flag" vs "pennant" is a visual distinction this
  swing-based detector does not separate — both map to the same continuation
  signal.

## See also

- [RectangleRange](Indicator-RectangleRange) — a deeper, two-sided consolidation.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
