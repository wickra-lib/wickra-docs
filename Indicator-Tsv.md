# Time Segmented Volume (TSV)

> Don Worden's Time Segmented Volume — a rolling sum of *signed*
> volume weighted by the bar's close-to-close move. Summed over a
> fixed window, the result quantifies the net accumulation
> (positive) or distribution (negative) over that span.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Volume                                                               |
| Input type          | `Candle` (uses `close`, `volume`)                                    |
| Output type         | `f64`                                                                |
| Output range        | unbounded; centred near zero                                          |
| Default parameters  | `period` required (Worden's default `18`)                            |
| Warmup period       | `period + 1`                                                          |
| Interpretation      | Net accumulation/distribution over the window                         |

## Formula

```
flow_t = (close_t - close_{t-1}) · volume_t     (signed money flow)
TSV_t  = Σ_{i=t-period+1..t} flow_i              (rolling window sum)
```

See `crates/wickra-core/src/indicators/tsv.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 0`      | Rolling sum window. Worden's typical `18`. |

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python:
`Tsv(period).batch(close, volume)` returns a 1-D `np.ndarray` with
`NaN` warmup. Node: same shape.

## Warmup

`warmup_period() == period + 1`. Needs `period` flow values, which
need `period + 1` prices.

## Edge cases

- **Flat close.** Zero flow contribution.
- **High-volume distribution.** Single down-bar on huge volume
  drives TSV sharply negative.
- **Reset.** Clears the rolling window and prior close.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, Tsv};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..40).map(|i| {
        let b = 100.0 + (f64::from(i) * 0.3).sin() * 5.0;
        Candle::new(b, b + 0.5, b - 0.5, b, 1000.0, i as i64).unwrap()
    }).collect();
    let mut t = Tsv::new(18)?;
    println!("row 30 = {:?}", t.batch(&candles)[30]);
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
t = ta.Tsv(18)
print(t.batch(close, vol)[30])
```

### Node

```javascript
const wickra = require('wickra');
const t = new wickra.Tsv(18);
// feed c, v
```

### Streaming

```rust
use wickra::{Candle, Indicator, Tsv};

let mut t = Tsv::new(18).unwrap();
for bar in candle_stream {
    if let Some(v) = t.update(bar) {
        if v > 0.0 { /* net accumulation over period */ }
        if v < 0.0 { /* net distribution */ }
    }
}
```

## Interpretation

- **Sign of TSV.** Positive = net accumulation over the period,
  negative = net distribution. Crosses of zero signal
  accumulation/distribution regime changes.
- **Vs OBV.** OBV uses just `±volume` (sign by direction only);
  TSV multiplies by close-change magnitude — gives weight to
  large moves.
- **Worden pairing.** Worden's published rules pair TSV with a
  9-bar EMA of itself as the signal line; crossover triggers buy
  / sell signals.

## Common pitfalls

- **Comparing magnitudes across instruments.** TSV scales with
  volume; tickers with very different volume profiles produce
  incomparable TSV magnitudes. Use slope / direction, not
  absolute value.
- **Period choice.** `18` is Worden's default; shorter periods
  (10-12) make TSV more responsive but noisier.

## References

- Don Worden (Worden Brothers), 1980s — original TSV
  formulation for the TC2000 charting package.

## See also

- [Obv](Indicator-Obv) — simpler ±volume cumulative.
- [Kvo](Indicator-Kvo) — alternative volume-momentum oscillator.
- [Adl](Indicator-Adl) — Chaikin's accumulation/distribution.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
