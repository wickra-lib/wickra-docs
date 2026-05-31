# Harami

> Two-bar reversal pattern. The current candle's body sits entirely
> inside the previous candle's body and points in the opposite
> direction. Japanese name means "pregnant" — the larger prior bar
> is the mother containing the smaller current bar.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Candlestick Patterns                                                 |
| Input type          | `Candle`                                                             |
| Output type         | `f64` — `+1.0` bullish, `-1.0` bearish, `0.0` otherwise              |
| Output range        | `{-1.0, 0.0, +1.0}`                                                  |
| Default parameters  | none — `Harami::new()`                                               |
| Warmup period       | `2`                                                                  |
| Interpretation      | Two-bar reversal with weaker conviction than Engulfing               |

## Formula

```
prev_body = |prev.close - prev.open|
curr_body = |curr.close - curr.open|

bullish (+1.0): prev red AND curr green
              AND curr.open  >= prev.close
              AND curr.close <= prev.open
              AND curr_body  < prev_body

bearish (-1.0): prev green AND curr red
              AND curr.open  <= prev.close
              AND curr.close >= prev.open
              AND curr_body  < prev_body
```

Output is `0.0` for the first bar. See
`crates/wickra-core/src/indicators/harami.rs`.

## Parameters

None.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Same shape as other
multi-bar candlestick patterns.

## Warmup

`warmup_period() == 2`. First bar returns `0.0`.

## Edge cases

- **Inverted to Engulfing.** Harami is the *opposite* of Engulfing:
  current body strictly *smaller* and inside prior body. Both
  patterns are reversal patterns but Harami signals indecision
  rather than full sentiment flip.
- **Reset.** Clears previous-bar cache.

## Examples

### Rust

```rust
use wickra::{Candle, Harami, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prev = Candle::new(102.0, 103.0, 98.0, 99.0, 1.0, 0)?;  // long red
    let curr = Candle::new(99.5, 100.5, 99.0, 100.0, 1.0, 1)?;  // small green inside
    let mut h = Harami::new();
    h.update(prev);
    println!("{:?}", h.update(curr));  // +1.0
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

o = np.array([102.0, 99.5])
h = np.array([103.0, 100.5])
l = np.array([ 98.0, 99.0])
c = np.array([ 99.0, 100.0])

ha = ta.Harami()
print(ha.batch(o, h, l, c))
```

### Node

```javascript
const wickra = require('wickra');
const h = new wickra.Harami();
console.log(h.batch([102, 99.5], [103, 100.5], [98, 99], [99, 100]));
```

### Streaming

```rust
use wickra::{Candle, Harami, Indicator};

let mut h = Harami::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if h.update(bar) == Some(1.0) { /* bullish Harami */ }
}
```

## Interpretation

- **Indecision after move.** Harami signals that the prior bar's
  momentum has paused — the smaller inside bar shows neither
  side could push further.
- **Weaker than Engulfing.** Harami is a *soft* reversal: signals
  pause, not necessarily reversal. Often used as a "tighten
  stops" signal in trend-following systems rather than as a
  reversal trigger.
- **Pair with confirmation.** [ThreeInside](Indicator-ThreeInside)
  is the confirmed three-bar variant — adds a third bar that
  closes beyond the prior body.

## Common pitfalls

- **Treating Harami as a strong signal.** Statistical edge is
  weaker than Engulfing's; many Haramis are continuation pauses.
- **Without trend context.** Same caveat as all candlestick
  patterns — context determines value.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [Engulfing](Indicator-Engulfing) — opposite (large body
  engulfing small).
- [ThreeInside](Indicator-ThreeInside) — confirmed Harami.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
