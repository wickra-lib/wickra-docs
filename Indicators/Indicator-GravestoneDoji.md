# GravestoneDoji

> Single-bar bearish reversal. Open, close and low sit at the bottom of
> the bar while a long upper shadow shows price was pushed up hard and
> then sold all the way back to the open — sellers rejecting the highs.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `-1.0` bearish, `0.0` otherwise (never `+1.0`) |
| Output range | `{-1.0, 0.0}` |
| Default parameters | none — `GravestoneDoji::new()` |
| Warmup period | `1` |
| Interpretation | Bearish rejection of the highs |

## Formula

```
range = high − low
doji          = |close − open| <= 0.1 · range
no lower wick = min(open, close) − low  <= 0.1 · range
long upper    = high − max(open, close) >= 0.5 · range
```

Bearish-only (never `+1.0`). The mirror is
[DragonflyDoji](/Indicators/Indicator-DragonflyDoji). See
`crates/wickra-core/src/indicators/gravestone_doji.rs`.

## Parameters

None. Constructed with `GravestoneDoji::new()`.

## Signed ±1 encoding

Single-direction shape: `−1.0` bearish, `0.0` no pattern — one feature-matrix
dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, GravestoneDoji, Candle};
// GravestoneDoji: Input = Candle, Output = f64
const _: fn(&mut GravestoneDoji, Candle) -> Option<f64> = <GravestoneDoji as Indicator>::update;
```

- **Always emits a value.** Never `None`; non-matching bars return `0.0`.
- **Node.** `update(open, high, low, close)` → `number`; `batch(open, high, low,
  close)` → `Array<number>`.
- **Python.** `update(candle)` → `float`; `batch(open, high, low, close)` → 1-D
  `array.array('d')` (`0.0` on no-match).

## Warmup

`warmup_period() == 1` — emits from the first candle (`accessors_and_metadata`).

## Edge cases

- **Lower shadow.** A meaningful lower wick yields `0.0`
  (`lower_shadow_yields_zero`).
- **Short upper shadow.** Without the long upper wick the result is `0.0`
  (`short_upper_shadow_yields_zero`).
- **Not a doji.** A real body yields `0.0` (`non_doji_yields_zero`); a flat bar
  yields `0.0` (`zero_range_yields_zero`).
- **Reset.** `reset()` clears the has-emitted flag (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, GravestoneDoji, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = GravestoneDoji::new();
    // Body at the bottom (open=close=10, low=9.95), long upper shadow to 14.0.
    println!("{:?}", t.update(Candle::new(10.0, 14.0, 9.95, 10.0, 1.0, 0)?));
    Ok(())
}
```

Output:

```
Some(-1.0)
```

`range = 4.05`, body `0`, lower shadow `0.05`, upper shadow `4.0` (`> 0.5·range`)
— a gravestone. This matches `gravestone_is_minus_one`.

### Python

```python
import numpy as np
import wickra as ta

print(ta.GravestoneDoji().batch(
    np.array([10.0]), np.array([14.0]), np.array([9.95]), np.array([10.0])))  # [-1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.GravestoneDoji();
console.log(t.update(10, 14.0, 9.95, 10)); // -1
```

### Streaming

```rust
use wickra::{Candle, Indicator, GravestoneDoji};

let mut t = GravestoneDoji::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if t.update(bar) == Some(-1.0) { /* rejection of the highs */ }
}
```

## Interpretation

1. **Top reversal.** A long upper shadow sold back to the low is a bearish
   rejection — strongest at resistance or the top of an advance.
2. **Confirm.** A single doji is weak evidence; pair with a follow-through down
   candle or resistance context.

## Common pitfalls

- **No location context.** A gravestone mid-range means little.
- **Confusing with a shooting star.** A [ShootingStar](/Indicators/Indicator-ShootingStar)
  has a small *body*; a gravestone's body is effectively zero (a doji).

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [DragonflyDoji](/Indicators/Indicator-DragonflyDoji) — the bullish mirror.
- [ShootingStar](/Indicators/Indicator-ShootingStar) — small-bodied bearish cousin.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
