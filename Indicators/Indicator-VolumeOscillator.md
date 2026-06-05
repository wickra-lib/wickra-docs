# Volume Oscillator (VO)

> Percentage difference between a fast and slow SMA of bar volume.
> Highlights short-term volume regime changes (spike days vs quiet
> days) independent of price. A positive reading means short-term
> volume is running above the longer-term average (rising
> participation); negative means the opposite.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Volume                                                               |
| Input type          | `Candle` (uses `volume`)                                             |
| Output type         | `f64`                                                                |
| Output range        | unbounded above and below `-100`                                      |
| Default parameters  | `fast`, `slow` both required (typical `14, 28`)                       |
| Warmup period       | `slow`                                                                |
| Interpretation      | `> 0` rising participation; `< 0` drying volume                       |

## Formula

```
VO_t = 100 · (SMA(volume, fast)_t - SMA(volume, slow)_t)
       / SMA(volume, slow)_t
```

A slow average of 0 (only possible if every volume in the slow
window was zero) collapses the output to `0` rather than `NaN`.
See `crates/wickra-core/src/indicators/volume_oscillator.rs`.

## Parameters

| Name   | Type    | Default | Constraint        | Description |
|--------|---------|---------|-------------------|-------------|
| `fast` | `usize` | none    | `> 0`, `< slow`   | Fast volume SMA period. |
| `slow` | `usize` | none    | `> 0`, `> fast`   | Slow volume SMA period. |

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python / Node:
standard binding shapes.

## Warmup

`warmup_period() == slow`. First emission lands when the slow SMA
seeds.

## Edge cases

- **Zero-volume slow window.** Output `0` (avoids NaN).
- **Volume = 0 bar.** Contributes zero to both SMAs.
- **Reset.** Clears both inner SMAs.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, VolumeOscillator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..50).map(|i| {
        let v = if i % 5 == 0 { 5000.0 } else { 1000.0 };
        Candle::new(100.0, 101.0, 99.0, 100.5, v, i as i64).unwrap()
    }).collect();
    let mut vo = VolumeOscillator::new(14, 28)?;
    println!("row 30 = {:?}", vo.batch(&candles)[30]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

n = 50
vol = np.where(np.arange(n) % 5 == 0, 5000.0, 1000.0)
vo = ta.VolumeOscillator(14, 28)
# Need candle inputs; bindings expect h/l/c/v
```

### Node

```javascript
const wickra = require('wickra');
const vo = new wickra.VolumeOscillator(14, 28);
// ...
```

### Streaming

```rust
use wickra::{Candle, Indicator, VolumeOscillator};

let mut vo = VolumeOscillator::new(14, 28).unwrap();
let candle_stream: Vec<Candle> = Vec::new(); // your live OHLCV feed
for bar in candle_stream {
    if let Some(v) = vo.update(bar) {
        if v > 20.0 { /* participation rising — confirms moves */ }
        if v < -20.0 { /* volume drying — fade trend signals */ }
    }
}
```

## Interpretation

- **Volume regime filter.** Use VO as a *gate* on price signals:
  trend-following entries on positive VO (volume confirms), mean-
  reversion on negative VO (low conviction trend).
- **Spike detection.** VO > +100 typically means recent bars
  carried 2x the longer-term volume — outlier days.
- **Pair with price oscillators.** Layer VO over MACD or
  StochRSI to filter false signals during quiet periods.

## Common pitfalls

- **Treating absolute level as universal.** Magnitude depends on
  the instrument's typical volume distribution. Calibrate
  thresholds per instrument.
- **Confused with Klinger / KVO.** KVO is volume-direction-aware;
  Volume Oscillator is direction-blind (just uses `volume`).
- **Mismatched periods.** `fast >= slow` is rejected by the
  constructor.

## References

- Standard practitioner indicator; documented in Steven Achelis,
  *Technical Analysis from A to Z* (2000).

## See also

- [Obv](/Indicators/Indicator-Obv) — cumulative signed volume.
- [Kvo](/Indicators/Indicator-Kvo) — direction-weighted volume oscillator.
- [Vzo](/Indicators/Indicator-Vzo) — bounded volume-zone alternative.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
