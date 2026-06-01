# Shooting Star

> Single-bar bearish reversal candidate. Same geometry as
> [InvertedHammer](Indicator-InvertedHammer) — small body near the
> bottom, long upper shadow ≥ 2× body, short lower shadow — but
> read **bearishly** because it appears at the top of an uptrend.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Candlestick Patterns                                                 |
| Input type          | `Candle`                                                             |
| Output type         | `f64` — `-1.0` if Shooting Star, `0.0` otherwise                     |
| Output range        | `{-1.0, 0.0}`                                                        |
| Default parameters  | none — `ShootingStar::new()`                                         |
| Warmup period       | `1`                                                                  |
| Interpretation      | Bearish reversal candidate (in uptrend context)                       |

## Formula

```
body         = |close - open|
upper_shadow = high - max(open, close)
lower_shadow = min(open, close) - low

star = (upper_shadow >= 2 · body)
    AND (lower_shadow <= body)
    AND (body > 0)
```

Output is `-1.0` when the shape matches, `0.0` otherwise. See
`crates/wickra-core/src/indicators/shooting_star.rs`.

## Parameters

None.

## Signed ±1 encoding

A Shooting Star is bearish by definition, so under the uniform
candlestick sign convention (`+1.0` bullish, `−1.0` bearish, `0.0`
none) it emits `−1.0` when the shape matches and `0.0` otherwise —
never `+1.0`. The same geometry read at the bottom of a downtrend
is the bullish [InvertedHammer](Indicator-InvertedHammer), which
carries the opposite sign.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python / Node same as
other single-bar candlestick patterns.

## Warmup

`warmup_period() == 1`. Stateless.

## Edge cases

- **Same shape as InvertedHammer.** Inverted Hammer emits `+1.0`
  (bullish reading); Shooting Star emits `-1.0` (bearish reading).
- **No trend filter.** Shape only — combine with uptrend context.
- **Reset.** Stateless.

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, ShootingStar};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Long upper shadow, small body at bottom
    let c = Candle::new(100.5, 105.0, 100.0, 100.2, 1.0, 0)?;
    let mut ss = ShootingStar::new();
    println!("{:?}", ss.update(c));  // -1.0
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

o = np.array([100.5])
h = np.array([105.0])
l = np.array([100.0])
c = np.array([100.2])

ss = ta.ShootingStar()
print(ss.batch(o, h, l, c))
```

### Node

```javascript
const wickra = require('wickra');
const ss = new wickra.ShootingStar();
console.log(ss.batch([100.5], [105], [100], [100.2]));
```

### Streaming with uptrend filter

```rust
use wickra::{Candle, Indicator, ShootingStar, Sma};

let mut ss = ShootingStar::new();
let mut sma = Sma::new(50).unwrap();
let candle_stream: Vec<Candle> = Vec::new(); // your live OHLCV feed
for bar in candle_stream {
    let trend = sma.update(bar.close);
    if ss.update(bar) == Some(-1.0)
        && matches!(trend, Some(s) if bar.close > s)
    {
        /* bearish reversal candidate at top of uptrend */
    }
}
```

## Interpretation

- **Bearish exhaustion.** Buyers pushed price to a new high
  intra-bar but couldn't hold it; sellers won the close. Classic
  exhaustion-of-rally signal.
- **Confirmation.** Many traders wait for the next bar to close
  below the Shooting Star's body before acting.
- **Same shape, opposite signal.** Shooting Star and Inverted
  Hammer are identical shapes — context determines which reading
  applies.

## Common pitfalls

- **Acting on shape without context.** A Shooting Star shape in
  a downtrend is meaningless. Always pair with trend filter.
- **Multiple shooting stars in a row.** A consecutive series of
  Shooting Stars at the top of an uptrend is more
  significant than a single one — signals persistent rejection
  of higher prices.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [InvertedHammer](Indicator-InvertedHammer) — same shape,
  bullish reading.
- [HangingMan](Indicator-HangingMan) — bearish, with long lower
  shadow.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
