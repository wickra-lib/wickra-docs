# Volume Zone Oscillator (VZO)

> Walid Khalil's normalised version of OBV-style volume flow that
> swings within `[-100, +100]`. Each bar contributes a signed
> volume (`+volume` on up day, `-volume` on down day, `0` on
> unchanged close); the VZO ratios the EMA of that signed volume
> against the EMA of absolute volume.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Volume                                                               |
| Input type          | `Candle` (uses `close`, `volume`)                                    |
| Output type         | `f64`                                                                |
| Output range        | `[-100, +100]`                                                       |
| Default parameters  | `period` required (Khalil's typical `14`)                            |
| Warmup period       | `period + 1`                                                          |
| Interpretation      | `>+60` strong bull, `<-60` strong bear, near 0 neutral                |

## Formula

```
R_t   = sign(close_t - close_{t-1}) · volume_t      (signed volume)
VP_t  = EMA(R, period)_t                             (smoothed signed)
TV_t  = EMA(volume, period)_t                        (smoothed absolute)
VZO_t = 100 · VP_t / TV_t
```

VZO is bounded in `[-100, +100]` by construction (`|VP| ≤ TV`).
See `crates/wickra-core/src/indicators/vzo.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 0`      | EMA period for both numerator and denominator. |

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python / Node:
standard binding shapes.

## Warmup

`warmup_period() == period + 1`. Needs one bar to establish prior
close, then `period` bars for the EMAs to seed.

## Edge cases

- **Flat close.** Zero signed volume contribution.
- **TV_t == 0.** Indicator returns `0.0` rather than NaN (occurs
  only if every volume in window is zero).
- **Reset.** Clears both EMAs and the prior close.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, Vzo};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..40).map(|i| {
        let b = 100.0 + (f64::from(i) * 0.3).sin() * 5.0;
        Candle::new(b, b + 0.5, b - 0.5, b, 1000.0, i as i64).unwrap()
    }).collect();
    let mut v = Vzo::new(14)?;
    println!("row 30 = {:?}", v.batch(&candles)[30]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

n = 40
close = 100 + np.sin(np.linspace(0, 12, n)) * 5
vol = np.full(n, 1000.0)
v = ta.Vzo(14)
print(v.batch(close, vol)[30])
```

### Node

```javascript
const wickra = require('wickra');
const v = new wickra.Vzo(14);
```

### Streaming

```rust
use wickra::{Candle, Indicator, Vzo};

let mut v = Vzo::new(14).unwrap();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if let Some(o) = v.update(bar) {
        if o > 60.0 { /* strong bull volume regime */ }
        if o < -60.0 { /* strong bear volume regime */ }
    }
}
```

## Interpretation

VZO classifies the **volume regime**:

- **VZO > +60.** Strong bullish — buy volume dominates.
- **VZO between +40 and +60.** Bullish bias.
- **VZO between -40 and +40.** Neutral / consolidation.
- **VZO between -60 and -40.** Bearish bias.
- **VZO < -60.** Strong bearish.

Khalil published it as a 4-quadrant trend / momentum filter to
pair with price-action signals.

## Common pitfalls

- **Treating zero crossings as instant signals.** VZO is
  EMA-smoothed — its zero crossings lag price; pair with a
  faster trend signal.
- **Vs Obv.** OBV is cumulative and unbounded; VZO is bounded and
  smoothed. Different shapes, complementary uses.

## References

- Walid Khalil & David Steckler, *Fine-Tuning Trades with the
  Volume Zone Oscillator*, *Technical Analysis of Stocks &
  Commodities*, June 2011.

## See also

- [Obv](/Indicators/Indicator-Obv) — cumulative signed volume.
- [VolumeOscillator](/Indicators/Indicator-VolumeOscillator) — non-direction
  volume oscillator.
- [Kvo](/Indicators/Indicator-Kvo) — Klinger volume MACD.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
