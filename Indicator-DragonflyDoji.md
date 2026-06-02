# DragonflyDoji

> Single-bar bullish reversal. Open, close and high sit at the top of the
> bar while a long lower shadow shows price was driven down hard and then
> bid all the way back to the open — buyers rejecting the lows.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` bullish, `0.0` otherwise (never `-1.0`) |
| Output range | `{0.0, +1.0}` |
| Default parameters | none — `DragonflyDoji::new()` |
| Warmup period | `1` |
| Interpretation | Bullish rejection of the lows |

## Formula

```
range = high − low
doji          = |close − open| <= 0.1 · range
no upper wick = high − max(open, close) <= 0.1 · range
long lower    = min(open, close) − low  >= 0.5 · range
```

Bullish-only (never `−1.0`). The mirror is
[GravestoneDoji](Indicator-GravestoneDoji); the stricter variant is
[Takuri](Indicator-Takuri). See
`crates/wickra-core/src/indicators/dragonfly_doji.rs`.

## Parameters

None. Constructed with `DragonflyDoji::new()`.

## Signed ±1 encoding

Single-direction shape: `+1.0` bullish, `0.0` no pattern — one feature-matrix
dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, DragonflyDoji, Candle};
// DragonflyDoji: Input = Candle, Output = f64
const _: fn(&mut DragonflyDoji, Candle) -> Option<f64> = <DragonflyDoji as Indicator>::update;
```

- **Always emits a value.** Never `None`; non-matching bars return `0.0`.
- **Node.** `update(open, high, low, close)` → `number`; `batch(open, high, low,
  close)` → `Array<number>`.
- **Python.** `update(candle)` → `float`; `batch(open, high, low, close)` → 1-D
  `numpy.ndarray` (`0.0` on no-match).

## Warmup

`warmup_period() == 1` — emits from the first candle (`accessors_and_metadata`).

## Edge cases

- **Upper shadow.** A meaningful upper wick yields `0.0`
  (`upper_shadow_yields_zero`).
- **Short lower shadow.** Without the long lower wick the result is `0.0`
  (`short_lower_shadow_yields_zero`).
- **Not a doji.** A real body yields `0.0` (`non_doji_yields_zero`); a flat bar
  yields `0.0` (`zero_range_yields_zero`).
- **Reset.** `reset()` clears the has-emitted flag (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, DragonflyDoji, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = DragonflyDoji::new();
    // Body at the top (open=close=10, high=10.05), long lower shadow to 6.0.
    println!("{:?}", t.update(Candle::new(10.0, 10.05, 6.0, 10.0, 1.0, 0)?));
    Ok(())
}
```

Output:

```
Some(1.0)
```

`range = 4.05`, body `0`, upper shadow `0.05`, lower shadow `4.0` (`> 0.5·range`)
— a dragonfly. This matches `dragonfly_is_plus_one`.

### Python

```python
import numpy as np
import wickra as ta

print(ta.DragonflyDoji().batch(
    np.array([10.0]), np.array([10.05]), np.array([6.0]), np.array([10.0])))  # [1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.DragonflyDoji();
console.log(t.update(10, 10.05, 6.0, 10)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, DragonflyDoji};

let mut t = DragonflyDoji::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if t.update(bar) == Some(1.0) { /* rejection of the lows */ }
}
```

## Interpretation

1. **Bottom reversal.** A long lower shadow recovered to the high is a bullish
   rejection — strongest at support or the foot of a decline.
2. **Confirm.** A single doji is weak evidence; pair with a follow-through up
   candle or support context.

## Common pitfalls

- **No location context.** A dragonfly mid-range means little.
- **Confusing with a hammer.** A [Hammer](Indicator-Hammer) has a small *body*;
  a dragonfly's body is effectively zero (a doji).

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [GravestoneDoji](Indicator-GravestoneDoji) — the bearish mirror.
- [Takuri](Indicator-Takuri) — stricter dragonfly with a very long lower shadow.
- [Hammer](Indicator-Hammer) — small-bodied bullish cousin.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
