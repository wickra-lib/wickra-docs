# Three Outside Up / Down

> Three-bar reversal pattern. A confirmed Engulfing: the first two
> bars form an Engulfing pattern and the third bar confirms
> direction by closing beyond the second bar's close. Three
> Outside Up = bullish; Three Outside Down = bearish.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Candlestick Patterns                                                 |
| Input type          | `Candle`                                                             |
| Output type         | `f64` — `+1.0` Up, `-1.0` Down, `0.0` otherwise                      |
| Output range        | `{-1.0, 0.0, +1.0}`                                                  |
| Default parameters  | none — `ThreeOutside::new()`                                         |
| Warmup period       | `3`                                                                  |
| Interpretation      | Confirmed Engulfing reversal — strongest 3-bar candle reversal       |

## Formula

**Three Outside Up** (`+1.0`):

```
Bar 1: red candle
Bar 2: green candle, bullish Engulfing of Bar 1
Bar 3: green candle, close > Bar 2's close
```

**Three Outside Down** (`-1.0`): mirror — green, bearish
Engulfing, red close below Bar 2's close. See
`crates/wickra-core/src/indicators/three_outside.rs`.

## Parameters

None.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Same shape as other
three-bar patterns.

## Warmup

`warmup_period() == 3`.

## Edge cases

- **Engulfing + confirmation.** Bar 2 must be a *valid* Engulfing
  of Bar 1 (engulfing body, opposite direction); Bar 3 must close
  past Bar 2's close.
- **Reset.** Clears the two-bar history.

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, ThreeOutside};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let b1 = Candle::new(11.0, 11.2, 9.8, 10.0, 1.0, 0)?;     // red
    let b2 = Candle::new(9.5, 12.0, 9.5, 11.5, 1.0, 1)?;       // green, engulfing
    let b3 = Candle::new(11.5, 12.5, 11.4, 12.3, 1.0, 2)?;     // green, close > b2.close (11.5)
    let mut to = ThreeOutside::new();
    to.update(b1); to.update(b2);
    println!("{:?}", to.update(b3));  // +1.0
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

o = np.array([11.0, 9.5, 11.5])
h = np.array([11.2, 12.0, 12.5])
l = np.array([ 9.8, 9.5, 11.4])
c = np.array([10.0, 11.5, 12.3])

to = ta.ThreeOutside()
print(to.batch(o, h, l, c))
```

### Node

```javascript
const wickra = require('wickra');
const to = new wickra.ThreeOutside();
console.log(to.batch([11, 9.5, 11.5], [11.2, 12, 12.5], [9.8, 9.5, 11.4], [10, 11.5, 12.3]));
```

### Streaming

```rust
use wickra::{Candle, Indicator, ThreeOutside};

let mut to = ThreeOutside::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if to.update(bar) == Some(1.0) { /* Three Outside Up */ }
    if to.update(bar) == Some(-1.0) { /* Three Outside Down */ }
}
```

## Interpretation

- **Strongest three-bar candle reversal.** The combination of a
  full Engulfing plus directional confirmation produces one of
  the most reliable classical candlestick reversal signals.
- **Pair with trend / volume.** Best at trend extremes with
  volume expansion on the engulfing bar.
- **Vs Three Inside.** Three Outside starts with an Engulfing
  (large body on bar 2); Three Inside starts with a Harami
  (small body on bar 2). Different bar-2 shape → different signal
  feel.

## Common pitfalls

- **Body-only Engulfing check.** Bar 2's body must engulf Bar 1's
  body — wicks are ignored. Same as standalone Engulfing.
- **Without trend context.** Even the strongest candle reversal
  is just noise in choppy ranges.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [Engulfing](Indicator-Engulfing) — unconfirmed two-bar version.
- [ThreeInside](Indicator-ThreeInside) — sibling three-bar
  Harami confirmation.
- [MorningEveningStar](Indicator-MorningEveningStar) — three-bar
  Doji-anchored reversal.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
