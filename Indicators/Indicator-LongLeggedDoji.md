# LongLeggedDoji

> Single-bar indecision signal. A doji with long shadows on *both* sides:
> price ranged widely up and down yet closed essentially where it opened —
> a tug-of-war that often precedes a turn.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` detected (indecision), `0.0` otherwise |
| Output range | `{0.0, +1.0}` |
| Default parameters | none — `LongLeggedDoji::new()` |
| Warmup period | `1` |
| Interpretation | Non-directional indecision; potential turning point |

## Formula

```
range = high − low
doji       = |close − open| <= 0.1 · range
long upper = high − max(open, close) >= 0.3 · range
long lower = min(open, close) − low  >= 0.3 · range
```

A **non-directional** flag: `+1.0` means "long-legged doji detected", not a
bullish bias — it never emits `−1.0`. For the directional single-shadow
variants use [DragonflyDoji](/Indicators/Indicator-DragonflyDoji) /
[GravestoneDoji](/Indicators/Indicator-GravestoneDoji). See
`crates/wickra-core/src/indicators/long_legged_doji.rs`.

## Parameters

None. Constructed with `LongLeggedDoji::new()`.

## Signed ±1 encoding

Indecision flag: `+1.0` detected, `0.0` no pattern — one feature-matrix
dimension (the `+1.0` here marks *detection*, not direction).

## Inputs / Outputs

```rust
use wickra::{Indicator, LongLeggedDoji, Candle};
// LongLeggedDoji: Input = Candle, Output = f64
const _: fn(&mut LongLeggedDoji, Candle) -> Option<f64> = <LongLeggedDoji as Indicator>::update;
```

- **Always emits a value.** Never `None`; non-matching bars return `0.0`.
- **Node.** `update(open, high, low, close)` → `number`; `batch(open, high, low,
  close)` → `Array<number>`.
- **Python.** `update(candle)` → `float`; `batch(open, high, low, close)` → 1-D
  `numpy.ndarray` (`0.0` on no-match).

## Warmup

`warmup_period() == 1` — emits from the first candle (`accessors_and_metadata`).

## Edge cases

- **One-sided shadow.** A doji with only one long shadow is a dragonfly or
  gravestone, not long-legged, and yields `0.0` (`one_sided_shadow_yields_zero`).
- **Not a doji.** A real body yields `0.0` (`non_doji_yields_zero`); a flat bar
  yields `0.0` (`zero_range_yields_zero`).
- **Reset.** `reset()` clears the has-emitted flag (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, LongLeggedDoji};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = LongLeggedDoji::new();
    // Tiny body near the middle, long shadows both sides.
    println!("{:?}", t.update(Candle::new(10.0, 12.0, 8.0, 10.05, 1.0, 0)?));
    Ok(())
}
```

Output:

```
Some(1.0)
```

`range = 4.0`, body `0.05`, upper shadow ≈ `1.95`, lower shadow `2.0` (both
`> 0.3·range`) — a long-legged doji. This matches `long_legged_is_plus_one`.

### Python

```python
import numpy as np
import wickra as ta

print(ta.LongLeggedDoji().batch(
    np.array([10.0]), np.array([12.0]), np.array([8.0]), np.array([10.05])))  # [1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.LongLeggedDoji();
console.log(t.update(10, 12, 8, 10.05)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, LongLeggedDoji};

let mut t = LongLeggedDoji::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if t.update(bar) == Some(1.0) { /* indecision — watch for the resolution */ }
}
```

## Interpretation

1. **Balanced indecision.** Wide two-sided shadows with a flat close show neither
   side won — momentum is paused.
2. **Direction comes from context.** As a non-directional flag, read the next bar
   or the prevailing trend to anticipate the resolution.
3. **Reversal hint at extremes.** Most meaningful after a strong move, where the
   pause can precede a turn.

## Common pitfalls

- **Reading +1.0 as bullish.** It marks detection, not direction.
- **Confusing with a rickshaw man.** [RickshawMan](/Indicators/Indicator-RickshawMan) adds
  the constraint that the body sits at the *centre* of the range.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [RickshawMan](/Indicators/Indicator-RickshawMan) — centred long-legged doji.
- [Doji](/Indicators/Indicator-Doji) — the general doji detector.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
