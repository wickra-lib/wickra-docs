# Morning Star / Evening Star

> Three-bar reversal pattern. A long candle, then a small "star"
> (small-body bar of either colour), then a long candle in the
> opposite direction whose close passes the first bar's midpoint.
> Morning Star is bullish (long red → star → long green); Evening
> Star is the bearish mirror. Among the strongest classical
> candlestick reversal patterns.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Candlestick Patterns                                                 |
| Input type          | `Candle`                                                             |
| Output type         | `f64` — `+1.0` Morning, `-1.0` Evening, `0.0` otherwise              |
| Output range        | `{-1.0, 0.0, +1.0}`                                                  |
| Default parameters  | none — `MorningEveningStar::new()`                                   |
| Warmup period       | `3`                                                                  |
| Interpretation      | Strong three-bar reversal signal                                      |

## Formula

**Morning Star** (`+1.0`):

```
Bar 1: long red candle
Bar 2: small-body candle ("star")  — colour does not matter
Bar 3: long green candle, close > (bar1.open + bar1.close) / 2

"long" enforced by: outer_body >= 2 · star_body
```

**Evening Star** (`-1.0`): mirror — long green, small star, long
red closing below Bar 1's midpoint. See
`crates/wickra-core/src/indicators/morning_evening_star.rs`.

## Parameters

None.

## Signed ±1 encoding

This pattern already emits the uniform candlestick sign convention
shared across the family — `+1.0` bullish, `−1.0` bearish, `0.0`
no pattern — so it drops straight into a machine-learning feature
matrix where the bullish and bearish variants of the pattern
occupy a single dimension.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python: `(n,)` array with
`NaN` for the first 2 bars. Node: same.

## Warmup

`warmup_period() == 3`. First two bars return `0.0`; the pattern
emits on bar 3 of the three-bar sequence.

## Edge cases

- **Star colour is arbitrary.** The middle "star" bar can be red,
  green, or doji — the pattern only requires it to be smaller than
  the outer bars (at least 2:1 ratio).
- **Strict midpoint test.** Bar 3 must close *past* Bar 1's
  midpoint for Morning; *below* for Evening. The midpoint
  requirement is what separates a true Star pattern from a noisy
  3-bar pause.
- **Reset.** Clears the two-bar history.

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, MorningEveningStar};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Morning Star
    let b1 = Candle::new(12.0, 12.2, 9.5, 10.0, 1.0, 0)?;  // long red
    let b2 = Candle::new(9.9, 10.1, 9.7, 9.95, 1.0, 1)?;    // doji-ish star
    let b3 = Candle::new(10.0, 12.0, 9.9, 11.5, 1.0, 2)?;   // long green closes above midpoint (11.0)
    let mut s = MorningEveningStar::new();
    s.update(b1); s.update(b2);
    println!("{:?}", s.update(b3));  // +1.0
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

o = np.array([12.0, 9.9, 10.0])
h = np.array([12.2, 10.1, 12.0])
l = np.array([ 9.5, 9.7, 9.9])
c = np.array([10.0, 9.95, 11.5])

s = ta.MorningEveningStar()
print(s.batch(o, h, l, c))  # [0, 0, 1.0]
```

### Node

```javascript
const wickra = require('wickra');
const s = new wickra.MorningEveningStar();
console.log(s.batch([12, 9.9, 10], [12.2, 10.1, 12], [9.5, 9.7, 9.9], [10, 9.95, 11.5]));
```

### Streaming

```rust
use wickra::{Candle, Indicator, MorningEveningStar};

let mut s = MorningEveningStar::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if s.update(bar) == Some(1.0) { /* Morning Star */ }
    if s.update(bar) == Some(-1.0) { /* Evening Star */ }
}
```

## Interpretation

- **Strong reversal.** Among the highest-conviction classical
  candlestick patterns. The star bar in the middle marks
  capitulation; the third bar confirms the new direction.
- **Best at extremes.** Morning Star at a key support level is
  particularly powerful; the same pattern in the middle of a
  range is just noise.
- **Gap variant.** Classical Morning Star has gaps between Bars
  1-2 and 2-3. Modern markets gap less, so Wickra implements the
  relaxed version that does not require gaps.

## Common pitfalls

- **Confused with Doji-only middle bar.** The middle bar must be
  small but not strictly a Doji. Many Stars have a small green or
  red middle bar.
- **Midpoint test.** Bar 3 must close past Bar 1's *midpoint*, not
  past Bar 1's high (Morning) or low (Evening). A weaker close
  inside Bar 1's range still qualifies.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991)
  — Morning / Evening Star definitions.

## See also

- [Doji](Indicator-Doji) — common shape of the middle "star" bar.
- [Engulfing](Indicator-Engulfing) — two-bar reversal sibling.
- [ThreeInside](Indicator-ThreeInside) /
  [ThreeOutside](Indicator-ThreeOutside) — other three-bar
  confirmations.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
