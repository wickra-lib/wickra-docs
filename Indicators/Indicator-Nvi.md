# Negative Volume Index (NVI)

> Paul Dysart's cumulative index (popularised by Norman Fosback)
> that only updates when **volume contracts**. The hypothesis is
> that smart-money accumulation happens on quiet days, so NVI tracks
> the "smart money" leg of price action while ignoring volume-spike
> days that retail tends to chase.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Volume                                                               |
| Input type          | `Candle` (uses `close`, `volume`)                                    |
| Output type         | `f64`                                                                |
| Output range        | unbounded (anchored at `1000.0`)                                     |
| Default parameters  | none                                                                 |
| Warmup period       | `2`                                                                  |
| Interpretation      | "Smart money" trend on quiet days                                     |

## Formula

```
Seed: NVI = 1000.0

NVI_t = NVI_{t-1} · (1 + (close_t - close_{t-1}) / close_{t-1})
        if volume_t < volume_{t-1}

NVI_t = NVI_{t-1}    otherwise
```

The starting value `1000` matches Fosback's textbook convention.
See `crates/wickra-core/src/indicators/nvi.rs`.

## Parameters

None — `Nvi::new()` takes no arguments.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python:
`Nvi().batch(close, volume)` returns a 1-D `np.ndarray`. Node:
same.

## Warmup

`warmup_period() == 2`. First bar seeds; bar 2 emits the first
non-trivial value.

## Edge cases

- **Volume equal.** No update — index unchanged.
- **Equal volume + equal close.** No update either way.
- **Long quiet stretches.** NVI moves frequently; long noisy
  stretches leave it unchanged for many bars.
- **Reset.** Resets to `1000` and clears the prior bar.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, Nvi};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..20).map(|i| {
        let b = 100.0 + f64::from(i);
        let v = if i % 3 == 0 { 500.0 } else { 200.0 };  // alternating volume
        Candle::new(b, b + 0.5, b - 0.5, b, v, i as i64).unwrap()
    }).collect();
    let mut nvi = Nvi::new();
    println!("last = {:?}", nvi.batch(&candles).last());
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

close = 100 + np.arange(20, dtype=float)
vol = np.where(np.arange(20) % 3 == 0, 500.0, 200.0)
nvi = ta.Nvi()
print(nvi.batch(close, vol)[-1])
```

### Node

```javascript
const wickra = require('wickra');
const nvi = new wickra.Nvi();
// feed c, v
```

### Streaming

```rust
use wickra::{Candle, Indicator, Nvi};

let mut nvi = Nvi::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if let Some(v) = nvi.update(bar) {
        // v is the smart-money cumulative index
    }
}
```

## Interpretation

- **NVI trend.** Rising NVI = price advances on quiet days =
  smart-money accumulation. Falling NVI = price falls on quiet
  days = smart-money distribution.
- **NVI vs 255-day EMA.** Fosback's classic rule: NVI above its
  255-day EMA = "smart money is bullish, bull market 95% likely
  per Fosback's stats".
- **Pair with PVI.** PVI and NVI together cover all-day flow.
  Most informative when they diverge.

## Common pitfalls

- **Frequency dependence.** "Quiet day" means a lower-volume bar
  than the immediately prior bar. Intraday NVI on minute bars
  behaves differently from daily NVI.
- **Volume data quality.** Stale or aggregated volume produces
  spurious NVI moves. Best on bar-level direct exchange data.
- **Anchor `1000`.** Relative magnitude meaningless; only the
  *direction* and crossings of trend lines (e.g. its own EMA)
  matter.

## References

- Paul L. Dysart, 1936 — original Negative Volume Index.
- Norman G. Fosback, *Stock Market Logic* (1976) — popularised
  NVI and PVI together as a smart-money / crowd analysis system.

## See also

- [Pvi](/Indicators/Indicator-Pvi) — complementary crowd-money cousin.
- [Obv](/Indicators/Indicator-Obv) — simpler all-day cumulative volume.
- [Adl](/Indicators/Indicator-Adl) — alternative cumulative flow.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
