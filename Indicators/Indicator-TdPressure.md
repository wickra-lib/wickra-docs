# TD Pressure

> DeMark's volume-weighted buying / selling pressure oscillator.
> Weights each bar's `(close − open) / (high − low)` ratio by its
> volume, then takes a ratio of rolling sums normalised to
> `[-100, +100]`. Bars whose range is zero contribute zero pressure
> (the ratio is undefined; DeMark's convention is to treat such
> bars as neutral).

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | DeMark                                                               |
| Input type          | `Candle` (uses `open`, `high`, `low`, `close`, `volume`)             |
| Output type         | `f64`                                                                |
| Output range        | `[-100, +100]`                                                       |
| Default parameters  | `period = 5` (DeMark's published default)                            |
| Warmup period       | `period`                                                             |
| Interpretation      | Positive = net buying pressure; negative = net selling pressure      |

## Formula

For each bar `i` with strictly positive range:

```
bar_pressure_i = ((close_i - open_i) / (high_i - low_i)) · volume_i
```

Bars with `high == low` contribute zero pressure. The output is the
SMA of bar pressure normalised by the SMA of volume over a
configurable `period`, scaled by 100:

```
TD_Pressure = 100 · SMA(bar_pressure, period) / SMA(volume, period)
```

When the windowed volume is zero (a flat zero-volume window) the
indicator emits `0`. The numerator is bounded by `± volume_per_bar`,
so the result is bounded by `±100`. See
`crates/wickra-core/src/indicators/td_pressure.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 0`      | Averaging window. DeMark's published default is `5`. |

`TdPressure::new` returns `Error::PeriodZero` for `period == 0`.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python:
`TdPressure(period).batch(open, high, low, close, volume)` returns
a 1-D `np.ndarray` with `NaN` in the warmup prefix. Node: same
shape; `update(candle)` returns `number | null`.

## Warmup

`warmup_period() == period`. The two rolling sums fill at the
period.

## Edge cases

- **Zero-range bar.** Zero contribution to the numerator; doesn't
  break the indicator.
- **Zero-volume window.** Returns `0.0` rather than dividing by
  zero.
- **Pure up-bar (`close == high`).** `(close - open) / (high - low)`
  approaches `1`; bar pressure equals the bar's volume.
- **Reset.** Clears both rolling buffers.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, TdPressure};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..30).map(|i| {
        let b = 100.0 + f64::from(i);
        Candle::new(b - 0.5, b + 1.0, b - 1.0, b + 0.5, 100.0, i as i64).unwrap()
    }).collect();
    let mut p = TdPressure::new(5)?;
    println!("row 20 = {:?}", p.batch(&candles)[20]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

n = 30
base = 100 + np.arange(n, dtype=float)
o = base - 0.5
h = base + 1
l = base - 1
c = base + 0.5
v = np.full(n, 100.0)

p = ta.TDPressure(5)
print('row 20:', p.batch(o, h, l, c, v)[20])
```

### Node

```javascript
const wickra = require('wickra');
const p = new wickra.TDPressure(5);
const n = 30;
const base = Array.from({ length: n }, (_, i) => 100 + i);
const open  = base.map(b => b - 0.5);
const high  = base.map(b => b + 1);
const low   = base.map(b => b - 1);
const close = base.map(b => b + 0.5);
const vol   = base.map(_ => 100);
console.log('row 20:', p.batch(open, high, low, close, vol)[20]);
```

### Streaming

```rust
use wickra::{Candle, Indicator, TdPressure};

let mut p = TdPressure::new(5).unwrap();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if let Some(v) = p.update(bar) {
        if v > 50.0 { /* strong buying pressure */ }
        if v < -50.0 { /* strong selling pressure */ }
    }
}
```

## Interpretation

- **Volume-weighted momentum.** TD Pressure differs from RSI / CCI
  by giving weight to volume — a wide-range bar on low volume
  contributes less than a similar bar on high volume.
- **Divergence detection.** Pair TD Pressure with price: if price
  makes a new high but TD Pressure does not, the move is
  unconfirmed by volume-weighted momentum.
- **Vs Obv / Adl.** OBV and ADL are cumulative; TD Pressure is
  rolling and bounded — easier to read as an oscillator. Use
  cumulative tools for long-trend structural breaks; TD Pressure
  for short-term momentum.

## Common pitfalls

- **Zero-range bar masking.** A series of zero-range bars (rare on
  liquid instruments) drags the indicator toward zero —
  occasionally produces misleadingly weak readings.
- **Period choice.** `5` is the DeMark default; lengthen to `14`
  for smoother readings on volatile instruments.
- **Volume normalisation.** If your volume data is in odd units
  (e.g. dollar-volume rather than share-volume), the normalisation
  still holds — what matters is consistency, not absolute scale.

## References

- Tom DeMark, *The New Science of Technical Analysis* (1994),
  ch. 5 — original TD Pressure formulation.

## See also

- [TdRei](/Indicators/Indicator-TdRei) — non-volume-weighted DeMark momentum
  oscillator.
- [TdDeMarker](/Indicators/Indicator-TdDeMarker) — high/low-based DeMark
  oscillator.
- [Obv](/Indicators/Indicator-Obv) — cumulative volume-direction indicator.
- [Mfi](/Indicators/Indicator-Mfi) — money-flow alternative oscillator.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
