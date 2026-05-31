# Klinger Volume Oscillator (KVO)

> Stephen Klinger's long / short-term volume-force MACD with
> trend-aware cumulative-money-flow weighting. Each bar produces a
> "volume force" whose sign tracks the daily trend and whose
> magnitude scales with how the current accumulation horizon
> compares to the previous trend's.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Volume                                                               |
| Input type          | `Candle` (uses `high`, `low`, `close`, `volume`)                     |
| Output type         | `KvoOutput { kvo, signal }`                                          |
| Output range        | unbounded (centred near zero)                                         |
| Default parameters  | `fast = 34`, `slow = 55`, `signal = 13` (Klinger's defaults)         |
| Warmup period       | `slow + signal - 1`                                                   |
| Interpretation      | Volume-force MACD; KVO crossing signal = trade trigger                |

## Formula

```
dm_t   = high_t + low_t + close_t        (daily measurement)
trend  = sign(dm_t - dm_{t-1})

cm_t   = cm_{t-1} + dm_t       if trend unchanged
cm_t   = dm_{t-1} + dm_t       if trend just flipped

vf_t   = volume_t · trend · |2 · (dm_t / cm_t) - 1| · 100

KVO_t    = EMA(vf, fast)_t - EMA(vf, slow)_t
signal_t = EMA(KVO, signal)_t
```

See `crates/wickra-core/src/indicators/kvo.rs`.

## Parameters

| Name     | Type    | Default | Constraint        | Description |
|----------|---------|---------|-------------------|-------------|
| `fast`   | `usize` | `34`    | `> 0`, `< slow`   | Fast EMA period. |
| `slow`   | `usize` | `55`    | `> 0`, `> fast`   | Slow EMA period. |
| `signal` | `usize` | `13`    | `> 0`             | Signal-line EMA period. |

## Inputs / Outputs

`Indicator<Input = Candle, Output = KvoOutput>` with two fields.
Python: `(n, 2)` array, columns `[kvo, signal]`. Node: flat
`number[]` of length `n * 2`.

## Warmup

`warmup_period() == slow + signal - 1`. The slow EMA seeds at
`slow`; the signal EMA then needs `signal - 1` further KVO
values.

## Edge cases

- **Constant input.** dm flat → trend = 0 → vf = 0 → KVO → 0.
- **Volume = 0.** Bar contributes zero force.
- **Trend-flip-on-equal.** `dm == dm_prev` is treated as
  unchanged (sign 0), preserving the prior trend.
- **Reset.** Clears all three EMAs and the cumulative measure.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, Kvo};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..120).map(|i| {
        let b = 100.0 + (f64::from(i) * 0.2).sin() * 5.0;
        Candle::new(b, b + 1.0, b - 1.0, b + 0.3, 1000.0, i as i64).unwrap()
    }).collect();
    let mut k = Kvo::classic();
    if let Some(o) = k.batch(&candles)[80] {
        println!("KVO={o:.2}");
    }
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

n = 120
base = 100 + np.sin(np.linspace(0, 25, n)) * 5
k = ta.Kvo(34, 55, 13)
out = k.batch(base + 1, base - 1, base + 0.3, np.full(n, 1000.0))
print(out[80])
```

### Node

```javascript
const wickra = require('wickra');
const k = new wickra.Kvo(34, 55, 13);
// feed h, l, c, v
```

### Streaming

```rust
use wickra::{Candle, Indicator, Kvo};

let mut k = Kvo::classic();
let mut prev: Option<f64> = None;
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if let Some(v) = k.update(bar) {
        if let Some(p) = prev {
            if p <= 0.0 && v > 0.0 { /* bullish zero-line cross */ }
            if p >= 0.0 && v < 0.0 { /* bearish zero-line cross */ }
        }
        prev = Some(v);
    }
}
```

## Interpretation

- **KVO above zero.** Buying pressure dominates short-term.
- **Signal-line crossover.** Klinger's canonical signal — KVO
  crossing above signal is bullish; below is bearish.
- **Divergence detection.** Like other volume oscillators, KVO
  divergences vs price flag exhaustion.

## Common pitfalls

- **Comparing to MACD scales.** KVO operates on volume-weighted
  forces; its absolute magnitude depends on raw volume scale.
  Threshold-based systems need per-instrument calibration.
- **Trend-flip surprise.** The `dm` trend-detection resets the
  cumulative measure on flips, which can produce sharp KVO
  jumps.

## References

- Stephen J. Klinger, *Volume Oscillator*, *Technical Analysis of
  Stocks & Commodities*, December 1997.

## See also

- [Obv](Indicator-Obv) — simpler cumulative volume.
- [ChaikinOscillator](Indicator-ChaikinOscillator) — alternative
  ADL-based volume oscillator.
- [MacdIndicator](Indicator-MacdIndicator) — closely-related
  topology.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
