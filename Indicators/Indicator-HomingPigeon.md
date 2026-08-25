# HomingPigeon

> Two-bar bullish reversal. Two black candles in a decline, the second a
> small body sitting entirely inside the first body (a same-colour
> harami). The shrinking range signals selling pressure is fading.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` bullish, `0.0` otherwise (never `-1.0`) |
| Output range | `{0.0, +1.0}` |
| Default parameters | none — `HomingPigeon::new()` |
| Warmup period | `2` (first bar always `0.0`) |
| Interpretation | Bullish reversal warning after a decline |

## Formula

```
bar1 black (close < open)
bar2 black & its body sits inside bar1's body:  open2 <= open1 && close2 >= close1
bar2 body is smaller than bar1's
```

Bullish-only (never `−1.0`). A same-colour harami: like a bullish harami but
both candles are black, so it is a softer, warning-grade reversal. See
`crates/wickra-core/src/indicators/homing_pigeon.rs`.

## Parameters

None. Constructed with `HomingPigeon::new()`.

## Signed ±1 encoding

Single-direction shape: `+1.0` bullish, `0.0` no pattern — one feature-matrix
dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, HomingPigeon, Candle};
// HomingPigeon: Input = Candle, Output = f64
const _: fn(&mut HomingPigeon, Candle) -> Option<f64> = <HomingPigeon as Indicator>::update;
```

- **Always emits a value.** Never `None`; warmup and no-match bars return `0.0`.
- **Node.** `update(open, high, low, close)` → `number`; `batch(open, high, low,
  close)` → `Array<number>`.
- **Python.** `update(candle)` → `float`; `batch(open, high, low, close)` → 1-D
  `array.array('d')` (`0.0` on warmup / no-match).

## Warmup

`warmup_period() == 2`. The first bar returns `0.0` (`first_bar_returns_zero`,
`accessors_and_metadata`).

## Edge cases

- **Second bar must be black.** A white second bar makes it an ordinary harami,
  not a homing pigeon (`second_bar_white_yields_zero`).
- **Second body must be inside the first.** Otherwise `0.0`
  (`second_body_not_inside_yields_zero`).
- **Reset.** `reset()` clears the one-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, HomingPigeon};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = HomingPigeon::new();
    println!("{:?}", t.update(Candle::new(15.0, 15.1, 9.9, 10.0, 1.0, 0)?));  // long black
    println!("{:?}", t.update(Candle::new(14.0, 14.1, 10.9, 11.0, 1.0, 1)?)); // small black, inside
    Ok(())
}
```

Output:

```
Some(0.0)
Some(1.0)
```

The second black body `(11, 14)` sits inside the first `(10, 15)` — a homing
pigeon. This matches `homing_pigeon_is_plus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([15.0, 14.0])
h = np.array([15.1, 14.1])
l = np.array([9.9,  10.9])
c = np.array([10.0, 11.0])

print(ta.HomingPigeon().batch(o, h, l, c))  # [0. 1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.HomingPigeon();
t.update(15, 15.1, 9.9, 10);
console.log(t.update(14, 14.1, 10.9, 11)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, HomingPigeon};

let mut t = HomingPigeon::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if t.update(bar) == Some(1.0) { /* selling pressure fading — watch for a turn */ }
}
```

## Interpretation

1. **Fading downside momentum.** The contracted second black body shows sellers
   losing range — a bullish warning at the foot of a decline.
2. **Softer than a harami.** Because both candles are black it lacks the
   colour-flip of a true bullish harami; treat it as a heads-up and confirm.
3. **Best at support.** Most meaningful after an extended decline.

## Common pitfalls

- **Expecting a colour flip.** Unlike a bullish [Harami](/Indicators/Indicator-Harami), the
  inside bar here is the *same* colour (black).
- **No downtrend context.** Only meaningful after a decline.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [Harami](/Indicators/Indicator-Harami) — the colour-flip inside-bar reversal.
- [MatchingLow](/Indicators/Indicator-MatchingLow) — another soft two-bar bottoming pattern.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
