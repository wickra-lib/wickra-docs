# Morning Star / Evening Star

> Three-bar reversal pattern. A long candle, then a small "star"
> (small-body bar of either colour) whose body gaps away from the
> first bar's body, then a long candle in the opposite direction
> that closes at least 30% of the way into the first bar's body.
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
Bar 2: small-body candle ("star")  — colour does not matter,
       body gaps below Bar 1's body: max(open2, close2) < close1
Bar 3: long green candle, close3 > close1 + 0.3 · body1
       (body1 = |close1 − open1|)

"long" enforced by: outer_body >= 2 · star_body
```

**Evening Star** (`-1.0`): mirror — long green, a small star whose
body gaps above it (`min(open2, close2) > close1`), long red closing
at least 30% of the way down into Bar 1's body
(`close3 < close1 − 0.3 · body1`). The star's body gap is the defining
feature (Nison; TA-Lib `CDLMORNINGSTAR` / `CDLEVENINGSTAR`). The 30%
penetration is TA-Lib's default `penetration = 0.3`; earlier releases
required Bar 3 to pass Bar 1's midpoint (50%). See
`crates/wickra-core/src/indicators/morning_evening_star.rs`.

**TA-Lib parity.** On the TA-Lib reference pattern series the signals are
identical to `CDLMORNINGSTAR` / `CDLEVENINGSTAR` with `penetration = 0.3`
(`+1` / `−1` here, `+100` / `−100` there). The one structural difference:
TA-Lib sizes bodies against a rolling average of the previous bars ("candle
settings"), while Wickra sizes them against the pattern's own bars (the
outer bodies must be at least twice the star's body).

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

`warmup_period() == 3`. First two bars return `None`
(`first_two_bars_return_zero`); the pattern emits on bar 3 of the
three-bar sequence.

## Edge cases

- **Star colour is arbitrary.** The middle "star" bar can be red,
  green, or doji — the pattern only requires it to be smaller than
  the outer bars (at least 2:1 ratio).
- **Star body must gap.** For Morning the star's whole body must sit
  below Bar 1's close (`max(open2, close2) < close1`); for Evening
  above it (`min(open2, close2) > close1`). A star whose body overlaps
  Bar 1's body yields `0.0`. Only wicks may overlap, and no gap is
  required between Bar 2 and Bar 3.
- **30% penetration, strict.** Bar 3 must close *more than* 30% of
  Bar 1's body into it — above `close1 + 0.3 · body1` for Morning,
  below `close1 − 0.3 · body1` for Evening. A close exactly on the
  threshold yields `0.0`. The penetration requirement is what
  separates a true Star pattern from a noisy 3-bar pause.
- **Reset.** Clears the two-bar history.

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, MorningEveningStar};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Morning Star
    let b1 = Candle::new(12.0, 12.2, 9.5, 10.0, 1.0, 0)?;  // long red
    let b2 = Candle::new(9.9, 10.1, 9.7, 9.95, 1.0, 1)?;    // doji-ish star, body below 10.0
    let b3 = Candle::new(10.0, 12.0, 9.9, 10.8, 1.0, 2)?;   // long green, closes 40% into bar 1's body
    let mut s = MorningEveningStar::new();
    s.update(b1); s.update(b2);
    println!("{:?}", s.update(b3));  // Some(1.0)
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
c = np.array([10.0, 9.95, 10.8])

s = ta.MorningEveningStar()
print(s.batch(o, h, l, c))  # array('d', [nan, nan, 1.0])
```

### Node

```javascript
const wickra = require('wickra');
const s = new wickra.MorningEveningStar();
console.log(s.batch([12, 9.9, 10], [12.2, 10.1, 12], [9.5, 9.7, 9.9], [10, 9.95, 10.8]));
// [ NaN, NaN, 1 ]
```

Bar 1's body is `12.0 − 10.0 = 2.0`, so Bar 3 must close above
`10.0 + 0.3 · 2.0 = 10.6`. The close of `10.8` passes (it would have failed
the old midpoint rule at `11.0`); a close of `10.5` returns `0.0`.

### Streaming

```rust
use wickra::{Candle, Indicator, MorningEveningStar};

let mut s = MorningEveningStar::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    match s.update(bar) {
        Some(v) if v > 0.0 => { /* Morning Star */ }
        Some(v) if v < 0.0 => { /* Evening Star */ }
        _ => {}
    }
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
  1-2 and 2-3. Wickra follows Nison and TA-Lib in requiring the
  star's *body* to gap away from Bar 1's body (wicks may overlap),
  but does not require a gap between Bars 2 and 3.

## Common pitfalls

- **Confused with Doji-only middle bar.** The middle bar must be
  small but not strictly a Doji. Many Stars have a small green or
  red middle bar.
- **Star overlapping Bar 1's body.** A small bar that opens or
  closes inside Bar 1's body is not a star here, however small its
  body.
- **Penetration threshold.** Bar 3 only needs to close 30% of the
  way into Bar 1's body, not past its midpoint and not past Bar 1's
  open. Code that assumed the older 50% (midpoint) rule will see
  more signals.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991)
  — Morning / Evening Star definitions.
- TA-Lib `CDLMORNINGSTAR` / `CDLEVENINGSTAR`.

## See also

- [Doji](/Indicators/Indicator-Doji) — common shape of the middle "star" bar.
- [Engulfing](/Indicators/Indicator-Engulfing) — two-bar reversal sibling.
- [ThreeInside](/Indicators/Indicator-ThreeInside) /
  [ThreeOutside](/Indicators/Indicator-ThreeOutside) — other three-bar
  confirmations.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
