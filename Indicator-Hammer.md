# Hammer

> Single-bar bullish reversal candidate. A Hammer has a small real
> body sitting near the top of the bar, a long lower shadow at
> least twice the body, and a short or absent upper shadow.
> Traditionally read as rejection of lower prices — sellers tried to
> push price down, buyers pushed it back up.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Candlestick Patterns                                                 |
| Input type          | `Candle`                                                             |
| Output type         | `f64` — `+1.0` if Hammer, `0.0` otherwise                            |
| Output range        | `{0.0, +1.0}`                                                        |
| Default parameters  | none — `Hammer::new()`                                               |
| Warmup period       | `1`                                                                  |
| Interpretation      | Bullish reversal candidate (in downtrend context)                    |

## Formula

```
body         = |close - open|
upper_shadow = high - max(open, close)
lower_shadow = min(open, close) - low

hammer = (lower_shadow >= 2 · body)
       AND (upper_shadow <= body)
       AND (body > 0)
```

Output is `+1.0` when the shape matches, `0.0` otherwise. See
`crates/wickra-core/src/indicators/hammer.rs`.

## Parameters

None — `Hammer::new()` takes no arguments. The shape rules use
fixed ratios (lower shadow `≥ 2 · body`, upper shadow `≤ body`).

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python:
`Hammer().batch(open, high, low, close)` returns a 1-D
`np.ndarray`. Node: `update(candle)` returns `number | null`.

## Warmup

`warmup_period() == 1`. Stateless; every bar emits.

## Edge cases

- **Zero-body bar.** `body == 0` fails the `body > 0` clause —
  pure Doji is *not* a Hammer.
- **Pure rejection (close == high).** `upper_shadow == 0`,
  passes the `≤ body` clause; common Hammer shape.
- **Trend-context filter.** This indicator only checks shape — it
  does not verify that the prior trend was down. Combine with a
  trend indicator for actionable signals.
- **Reset.** Stateless.

## Examples

### Rust

```rust
use wickra::{Candle, Hammer, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Hammer: o=100, h=101, l=95, c=100.5 — small body, long lower shadow
    let c = Candle::new(100.0, 101.0, 95.0, 100.5, 1.0, 0)?;
    let mut h = Hammer::new();
    println!("hammer = {:?}", h.update(c));  // +1.0
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

o = np.array([100.0])
h = np.array([101.0])
l = np.array([ 95.0])
c = np.array([100.5])

ha = ta.Hammer()
print(ha.batch(o, h, l, c))  # [1.0]
```

### Node

```javascript
const wickra = require('wickra');
const ha = new wickra.Hammer();
console.log(ha.batch([100], [101], [95], [100.5]));
```

### Streaming with trend filter

```rust
use wickra::{Candle, Hammer, Indicator, Sma};

let mut h = Hammer::new();
let mut sma = Sma::new(50).unwrap();
for bar in candle_stream {
    let trend = sma.update(bar.close);
    if h.update(bar) == Some(1.0) {
        // Only act if trend is down (price below long SMA)
        if matches!(trend, Some(s) if bar.close < s) {
            // bullish reversal candidate
        }
    }
}
```

## Interpretation

- **Bullish reversal.** Most powerful at the bottom of a
  downtrend or at established support. Without that context, a
  Hammer is just one of many candle shapes.
- **Pair with confirmation.** Many traders require the next bar
  to close above the Hammer's high before entering — see
  [ThreeOutside](Indicator-ThreeOutside) for the confirmed
  three-bar variant of the broader engulfing pattern.

## Common pitfalls

- **Treating Hammer alone as a signal.** False-positive rate is
  very high without trend context.
- **Confusing with Hanging Man.** Same shape, opposite trend
  context — Hammer at the *bottom* is bullish; the same shape at
  the *top* of an uptrend is a Hanging Man (bearish). See
  [HangingMan](Indicator-HangingMan).

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [HangingMan](Indicator-HangingMan) — same shape, bearish
  context.
- [InvertedHammer](Indicator-InvertedHammer) — mirror with long
  upper shadow.
- [ShootingStar](Indicator-ShootingStar) — Inverted Hammer's
  bearish twin.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
