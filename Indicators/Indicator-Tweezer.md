# Tweezer (Top / Bottom)

> Two-bar reversal pattern where two consecutive candles share an
> extreme. Tweezer Top: matched highs at the top of an uptrend
> (bearish reversal); Tweezer Bottom: matched lows at the bottom of
> a downtrend (bullish reversal). Visualises rejection of a level.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Candlestick Patterns                                                 |
| Input type          | `Candle`                                                             |
| Output type         | `f64` — `+1.0` Bottom, `-1.0` Top, `0.0` otherwise                   |
| Output range        | `{-1.0, 0.0, +1.0}`                                                  |
| Default parameters  | `tolerance = 0.001` (10 bps relative)                                |
| Warmup period       | `2`                                                                  |
| Interpretation      | Reversal candidate signal at trend extremes                           |

## Formula

```
tol_high = tolerance · |prev.high|
tol_low  = tolerance · |prev.low|

tweezer_top    = |curr.high - prev.high| <= tol_high   ->  -1.0
tweezer_bottom = |curr.low  - prev.low|  <= tol_low    ->  +1.0
both           = -> +1.0 (bottom wins by convention)
otherwise      = 0.0
```

See `crates/wickra-core/src/indicators/tweezer.rs`.

## Parameters

| Name        | Type  | Default | Constraint        | Description |
|-------------|-------|---------|-------------------|-------------|
| `tolerance` | `f64` | `0.001` | finite, `[0, 1)`  | Relative tolerance for matching extremes (1.0 = 100%). |

`Tweezer::new` returns `Error::InvalidPeriod` for out-of-range
`tolerance`.

## Signed ±1 encoding

This pattern already emits the uniform candlestick sign convention
shared across the family — `+1.0` bullish, `−1.0` bearish, `0.0`
no pattern — so it drops straight into a machine-learning feature
matrix where the bullish and bearish variants of the pattern
occupy a single dimension.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python:
`Tweezer(tol).batch(open, high, low, close)`; Node: same.

## Warmup

`warmup_period() == 2`. First bar returns `0.0`.

## Edge cases

- **Both extremes match.** Tweezer Bottom wins by convention
  (bullish rejection of the low takes priority).
- **Tolerance scaling.** `tolerance = 0.001` = matching extremes
  within 10 basis points of each other (relative to the prior
  extreme). For low-priced instruments you may want larger
  tolerance to avoid filtering false-positives by noise.
- **Reset.** Clears the previous-bar cache.

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, Tweezer};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Tweezer Bottom: two bars with same low
    let b1 = Candle::new(100.5, 101.0, 99.5, 100.0, 1.0, 0)?;
    let b2 = Candle::new(100.2, 101.5, 99.5, 101.0, 1.0, 1)?;
    let mut tw = Tweezer::new();
    tw.update(b1);
    println!("{:?}", tw.update(b2));  // +1.0
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

o = np.array([100.5, 100.2])
h = np.array([101.0, 101.5])
l = np.array([ 99.5, 99.5])
c = np.array([100.0, 101.0])

tw = ta.Tweezer(0.001)
print(tw.batch(o, h, l, c))
```

### Node

```javascript
const wickra = require('wickra');
const tw = new wickra.Tweezer(0.001);
console.log(tw.batch([100.5, 100.2], [101, 101.5], [99.5, 99.5], [100, 101]));
```

### Streaming

```rust
use wickra::{Candle, Indicator, Tweezer};

let mut tw = Tweezer::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if tw.update(bar) == Some(1.0) { /* Tweezer Bottom */ }
    if tw.update(bar) == Some(-1.0) { /* Tweezer Top */ }
}
```

## Interpretation

- **Rejection of a level.** Two bars probing the same extreme
  signals significant supply (Top) or demand (Bottom) at that
  level. Often forms at swing pivots or near round-number support /
  resistance.
- **At trend extremes.** Tweezer Bottom at the end of a
  downtrend = strong reversal candidate. Same shape in a range
  = noise.
- **Pair with confirmation.** Don't trade Tweezer alone; require
  the next bar to confirm direction.

## Common pitfalls

- **Wrong tolerance.** Too tight = no signals; too loose = noise.
  Calibrate to the instrument's tick / price unit.
- **Trading without context.** Tweezer mid-range is a
  coincidence, not a signal. Trend / extreme context is
  essential.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [Engulfing](/Indicators/Indicator-Engulfing) — stronger two-bar reversal.
- [Harami](/Indicators/Indicator-Harami) — opposite two-bar pattern (inside
  body).
- [PiercingDarkCloud](/Indicators/Indicator-PiercingDarkCloud) — gap-and-fade
  reversal.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
