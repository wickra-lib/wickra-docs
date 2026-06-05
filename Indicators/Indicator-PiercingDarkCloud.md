# Piercing Line / Dark Cloud Cover

> Two-bar reversal pattern. Piercing Line is bullish — a long red
> bar followed by a green bar that opens below the red bar's low
> and closes above its midpoint (but inside its body). Dark Cloud
> Cover is the bearish mirror. Weaker than full Engulfing but
> stronger than Harami.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Candlestick Patterns                                                 |
| Input type          | `Candle`                                                             |
| Output type         | `f64` — `+1.0` Piercing, `-1.0` Dark Cloud, `0.0` otherwise          |
| Output range        | `{-1.0, 0.0, +1.0}`                                                  |
| Default parameters  | none — `PiercingDarkCloud::new()`                                    |
| Warmup period       | `2`                                                                  |
| Interpretation      | Two-bar reversal — gap-open then recover                              |

## Formula

**Piercing Line** (`+1.0`):

```
prev_red AND curr_green
AND curr.open  <  prev.low
AND curr.close > (prev.open + prev.close) / 2
AND curr.close <  prev.open
```

**Dark Cloud Cover** (`-1.0`):

```
prev_green AND curr_red
AND curr.open  >  prev.high
AND curr.close < (prev.open + prev.close) / 2
AND curr.close >  prev.open
```

Output is `0.0` for the first bar. See
`crates/wickra-core/src/indicators/piercing_dark_cloud.rs`.

## Parameters

None.

## Signed ±1 encoding

This pattern already emits the uniform candlestick sign convention
shared across the family — `+1.0` bullish, `−1.0` bearish, `0.0`
no pattern — so it drops straight into a machine-learning feature
matrix where the bullish and bearish variants of the pattern
occupy a single dimension.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Same shape as other
two-bar candlestick patterns.

## Warmup

`warmup_period() == 2`.

## Edge cases

- **Gap-open requirement.** Piercing requires `curr.open < prev.low`
  (gap below the prior bar). Without that gap, the pattern is
  not a Piercing Line — it's just a regular bullish bar.
- **Partial-engulfing.** Closes inside but past the midpoint of
  the prior body. A full engulfing (close beyond `prev.open`) is
  a stronger pattern — see [Engulfing](/Indicators/Indicator-Engulfing).
- **Reset.** Clears the previous-bar cache.

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, PiercingDarkCloud};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Piercing Line
    let prev = Candle::new(105.0, 106.0, 100.0, 100.5, 1.0, 0)?;  // long red
    let curr = Candle::new( 99.5, 103.5, 99.0, 103.0, 1.0, 1)?;    // gap-down, recovers past midpoint
    let mut p = PiercingDarkCloud::new();
    p.update(prev);
    println!("{:?}", p.update(curr));  // +1.0
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

o = np.array([105.0, 99.5])
h = np.array([106.0, 103.5])
l = np.array([100.0, 99.0])
c = np.array([100.5, 103.0])

p = ta.PiercingDarkCloud()
print(p.batch(o, h, l, c))
```

### Node

```javascript
const wickra = require('wickra');
const p = new wickra.PiercingDarkCloud();
console.log(p.batch([105, 99.5], [106, 103.5], [100, 99], [100.5, 103]));
```

### Streaming

```rust
use wickra::{Candle, Indicator, PiercingDarkCloud};

let mut p = PiercingDarkCloud::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if p.update(bar) == Some(1.0) { /* Piercing Line */ }
    if p.update(bar) == Some(-1.0) { /* Dark Cloud Cover */ }
}
```

## Interpretation

- **Failed gap.** The current bar opens decisively in the prior
  trend's direction (gap-down for Piercing, gap-up for Dark
  Cloud) but reverses inside the prior body — signalling exhaustion
  of the gap move.
- **Midpoint as conviction filter.** Closing past the midpoint
  shows real strength; barely closing inside the body would
  suggest weak buying / selling that doesn't qualify.
- **Pair with Engulfing.** Piercing is the "soft" cousin —
  Engulfing requires the close to pass *all* of the prior body,
  not just the midpoint.

## Common pitfalls

- **Missing the gap.** Without `curr.open < prev.low` (or
  `> prev.high` for bearish), the pattern doesn't fire — even on
  visually similar shapes.
- **Without trend context.** Same as all candlestick patterns:
  reversal patterns only carry signal at trend extremes.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991)
  — Piercing Line and Dark Cloud Cover.

## See also

- [Engulfing](/Indicators/Indicator-Engulfing) — stronger sibling reversal
  pattern.
- [Harami](/Indicators/Indicator-Harami) — softer reversal cousin.
- [MorningEveningStar](/Indicators/Indicator-MorningEveningStar) — three-bar
  alternative.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
