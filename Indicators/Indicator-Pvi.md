# Positive Volume Index (PVI)

> Mirror of [Nvi](/Indicators/Indicator-Nvi): cumulative index that only
> updates when **volume expands**. Fosback's interpretation is that
> the crowd ("uninformed money") trades on volume spikes, so PVI
> tracks the crowd-driven leg of price action. When today's volume
> is at or below yesterday's, PVI is left unchanged.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Volume                                                               |
| Input type          | `Candle` (uses `close`, `volume`)                                    |
| Output type         | `f64`                                                                |
| Output range        | unbounded (anchored at `1000.0`)                                     |
| Default parameters  | none                                                                 |
| Warmup period       | `2`                                                                  |
| Interpretation      | "Crowd money" trend on noisy days                                     |

## Formula

```
Seed: PVI = 1000.0

PVI_t = PVI_{t-1} · (1 + (close_t - close_{t-1}) / close_{t-1})
        if volume_t > volume_{t-1}

PVI_t = PVI_{t-1}    otherwise
```

See `crates/wickra-core/src/indicators/pvi.rs`.

## Parameters

None.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Same as
[Nvi](/Indicators/Indicator-Nvi).

## Warmup

`warmup_period() == 2`.

## Edge cases

- **Volume equal.** No update.
- **Long quiet stretches.** PVI doesn't move; long noisy
  stretches actively move it.
- **Reset.** Resets to `1000` and clears the prior bar.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, Pvi};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..20).map(|i| {
        let b = 100.0 + f64::from(i);
        let v = if i % 3 == 0 { 200.0 } else { 500.0 };  // alternating
        Candle::new(b, b + 0.5, b - 0.5, b, v, i as i64).unwrap()
    }).collect();
    let mut pvi = Pvi::new();
    println!("last = {:?}", pvi.batch(&candles).last());
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

close = 100 + np.arange(20, dtype=float)
vol = np.where(np.arange(20) % 3 == 0, 200.0, 500.0)
pvi = ta.PVI()
print(pvi.batch(close, vol)[-1])
```

### Node

```javascript
const wickra = require('wickra');
const pvi = new wickra.PVI();
```

### Streaming

```rust
use wickra::{Candle, Indicator, Pvi};

let mut pvi = Pvi::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if let Some(v) = pvi.update(bar) {
        // v is the crowd-money cumulative index
    }
}
```

## Interpretation

- **PVI trend.** Rising PVI = price advances on busy days = the
  crowd is buying. Falling PVI = retail selling.
- **PVI vs 255-day EMA.** Fosback's classic rule: PVI above its
  255-day EMA = "crowd is bullish, bull market 79% likely per
  Fosback's stats" (lower than NVI's reliability — crowd is
  often wrong).
- **NVI + PVI together.** When both rise, broad-based bull.
  When NVI rises and PVI falls, smart money is buying while
  retail sells — historically a strong contrarian signal.

## Common pitfalls

- **Treating PVI in isolation.** PVI alone has lower predictive
  value than NVI per Fosback's data. The combined NVI/PVI signal
  is the canonical use.
- **Frequency dependence.** Same caveat as NVI — intraday vs
  daily behave differently.

## References

- Paul L. Dysart, 1936 — original PVI.
- Norman G. Fosback, *Stock Market Logic* (1976) — popularised
  NVI / PVI together.

## See also

- [Nvi](/Indicators/Indicator-Nvi) — smart-money cousin.
- [Obv](/Indicators/Indicator-Obv) — simpler all-day cumulative volume.
- [Adl](/Indicators/Indicator-Adl) — alternative cumulative flow.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
