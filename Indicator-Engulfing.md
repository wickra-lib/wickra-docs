# Engulfing

> Two-bar reversal pattern. The current candle's body fully engulfs
> the prior candle's body and points in the opposite direction. One
> of the strongest single-name candlestick reversal patterns —
> visually striking and statistically reasonably reliable.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Candlestick Patterns                                                 |
| Input type          | `Candle`                                                             |
| Output type         | `f64` — `+1.0` bullish, `-1.0` bearish, `0.0` otherwise              |
| Output range        | `{-1.0, 0.0, +1.0}`                                                  |
| Default parameters  | none — `Engulfing::new()`                                            |
| Warmup period       | `2`                                                                  |
| Interpretation      | Two-bar reversal; bullish engulfing at lows, bearish at highs        |

## Formula

```
prev_body = |prev.close - prev.open|
curr_body = |curr.close - curr.open|

bullish (+1.0): prev red AND curr green
              AND curr.open <= prev.close
              AND curr.close >= prev.open
              AND curr_body > prev_body

bearish (-1.0): prev green AND curr red
              AND curr.open >= prev.close
              AND curr.close <= prev.open
              AND curr_body > prev_body
```

Output is `0.0` for the first bar (no previous). See
`crates/wickra-core/src/indicators/engulfing.rs`.

## Parameters

None.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python / Node: same
shape as other multi-bar candlestick patterns (first bar `NaN` /
`null`).

## Warmup

`warmup_period() == 2`. First bar always returns `0.0`.

## Edge cases

- **Equal bodies.** Strict `>` requires the engulfing body to be
  *larger*; equal-size bodies don't qualify.
- **Doji as prior bar.** `prev_body == 0` means `curr_body > 0`
  trivially holds — but the colour test (prev red / prev green)
  fails when the prior bar is a doji, so engulfing doesn't fire
  on doji-followed-by-large-body. Use
  [MorningEveningStar](Indicator-MorningEveningStar) for that
  pattern.
- **Reset.** Clears the previous-bar cache.

## Examples

### Rust

```rust
use wickra::{Candle, Engulfing, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prev = Candle::new(100.0, 101.0, 99.0, 99.5, 1.0, 0)?;  // red
    let curr = Candle::new(99.4, 102.0, 99.0, 101.5, 1.0, 1)?;   // green, engulfs
    let mut e = Engulfing::new();
    e.update(prev);
    println!("{:?}", e.update(curr));  // +1.0 (bullish engulfing)
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

o = np.array([100.0, 99.4])
h = np.array([101.0, 102.0])
l = np.array([99.0,  99.0])
c = np.array([99.5,  101.5])

e = ta.Engulfing()
print(e.batch(o, h, l, c))  # [0.0, 1.0]
```

### Node

```javascript
const wickra = require('wickra');
const e = new wickra.Engulfing();
console.log(e.batch([100, 99.4], [101, 102], [99, 99], [99.5, 101.5]));
```

### Streaming

```rust
use wickra::{Candle, Engulfing, Indicator};

let mut e = Engulfing::new();
for bar in candle_stream {
    let v = e.update(bar);
    if v == Some(1.0) { /* bullish engulfing */ }
    if v == Some(-1.0) { /* bearish engulfing */ }
}
```

## Interpretation

- **Bullish engulfing at lows.** Strong reversal candidate after
  a downtrend or near support. The full-body reversal signals
  significant sentiment shift.
- **Bearish engulfing at highs.** Mirror signal at the top of an
  uptrend or near resistance.
- **Pair with confirmation.** [ThreeOutside](Indicator-ThreeOutside)
  is the confirmed three-bar variant — adds a third bar that
  closes beyond the engulfing close.

## Common pitfalls

- **Body-only check.** Engulfing requires the *body* (open-to-close)
  to engulf, not the full bar range. Wicks are ignored.
- **Without trend context.** A "bullish engulfing" in a
  downtrending consolidation is often just a noise bounce. Pair
  with a trend / extreme filter.
- **Equal-body bars.** Strict `>` requirement — body sizes can
  be very close, but must not be equal.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [Harami](Indicator-Harami) — opposite pattern (small inside
  large body).
- [ThreeOutside](Indicator-ThreeOutside) — confirmed three-bar
  Engulfing variant.
- [PiercingDarkCloud](Indicator-PiercingDarkCloud) — softer
  two-bar reversal pattern.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
