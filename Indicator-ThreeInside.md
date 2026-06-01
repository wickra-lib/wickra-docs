# Three Inside Up / Down

> Three-bar reversal pattern. A confirmed Harami: the first two
> bars form a Harami (small inside body) and the third bar
> confirms direction by closing beyond the first bar's body. Three
> Inside Up = bullish; Three Inside Down = bearish.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Candlestick Patterns                                                 |
| Input type          | `Candle`                                                             |
| Output type         | `f64` — `+1.0` Up, `-1.0` Down, `0.0` otherwise                      |
| Output range        | `{-1.0, 0.0, +1.0}`                                                  |
| Default parameters  | none — `ThreeInside::new()`                                          |
| Warmup period       | `3`                                                                  |
| Interpretation      | Confirmed Harami reversal — stronger than Harami alone               |

## Formula

**Three Inside Up** (`+1.0`):

```
Bar 1: long red candle
Bar 2: small green candle, body inside Bar 1's body  (Harami)
Bar 3: green candle, close > Bar 1's open            (confirmation)
```

**Three Inside Down** (`-1.0`): mirror — long green, small red
inside, red closing below Bar 1's open. See
`crates/wickra-core/src/indicators/three_inside.rs`.

## Parameters

None.

## Signed ±1 encoding

This pattern already emits the uniform candlestick sign convention
shared across the family — `+1.0` bullish, `−1.0` bearish, `0.0`
no pattern — so it drops straight into a machine-learning feature
matrix where the bullish and bearish variants of the pattern
occupy a single dimension.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python / Node: same as
other three-bar candle patterns; first two bars return `0.0`.

## Warmup

`warmup_period() == 3`. Pattern emits on bar 3 of the three-bar
sequence.

## Edge cases

- **Same as Harami + confirmation.** This indicator fires only
  when both (a) bars 1+2 form a valid Harami AND (b) bar 3
  closes beyond bar 1's body.
- **No size requirement on bar 3.** The third bar's body size is
  unconstrained — only its closing price relative to bar 1's
  open matters.
- **Reset.** Clears the two-bar history.

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, ThreeInside};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let b1 = Candle::new(12.0, 12.5, 9.5, 10.0, 1.0, 0)?;   // long red
    let b2 = Candle::new(10.5, 11.5, 10.4, 11.0, 1.0, 1)?;   // small green inside
    let b3 = Candle::new(11.0, 13.0, 10.9, 12.5, 1.0, 2)?;   // green closes above 12 (b1.open)
    let mut ti = ThreeInside::new();
    ti.update(b1); ti.update(b2);
    println!("{:?}", ti.update(b3));  // +1.0
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

o = np.array([12.0, 10.5, 11.0])
h = np.array([12.5, 11.5, 13.0])
l = np.array([ 9.5, 10.4, 10.9])
c = np.array([10.0, 11.0, 12.5])

ti = ta.ThreeInside()
print(ti.batch(o, h, l, c))
```

### Node

```javascript
const wickra = require('wickra');
const ti = new wickra.ThreeInside();
console.log(ti.batch([12, 10.5, 11], [12.5, 11.5, 13], [9.5, 10.4, 10.9], [10, 11, 12.5]));
```

### Streaming

```rust
use wickra::{Candle, Indicator, ThreeInside};

let mut ti = ThreeInside::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if ti.update(bar) == Some(1.0) { /* Three Inside Up */ }
    if ti.update(bar) == Some(-1.0) { /* Three Inside Down */ }
}
```

## Interpretation

- **Confirmed Harami.** The third-bar confirmation is what
  distinguishes this from a plain Harami. Statistically more
  reliable as a reversal signal.
- **At trend extremes.** Most powerful at swing highs / lows.
  In ranges, it's just noise.
- **Vs Three Outside.** Three Inside requires the smaller body
  to come *first* (Harami pattern); Three Outside requires the
  smaller body to come *second* (Engulfing-style). See
  [ThreeOutside](Indicator-ThreeOutside).

## Common pitfalls

- **Wrong body order.** Three Inside requires the order Harami →
  confirmation; Three Outside requires Engulfing → confirmation.
- **No conviction filter.** The third bar can have any size; some
  traders require it to be a "strong" body before acting.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [Harami](Indicator-Harami) — unconfirmed two-bar version.
- [ThreeOutside](Indicator-ThreeOutside) — sibling three-bar
  pattern.
- [MorningEveningStar](Indicator-MorningEveningStar) — another
  three-bar reversal.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
