# Demand Index

> James Sibbet's Demand Index — a smoothed ratio of buying pressure
> to selling pressure, classifying each bar's volume by whether the
> close rose or fell relative to the previous close. Sibbet's
> hypothesis is that volume confirms or denies price moves; the
> Demand Index quantifies the confirmation.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Volume                                                               |
| Input type          | `Candle` (uses `high`, `low`, `close`, `volume`)                     |
| Output type         | `f64`                                                                |
| Output range        | unbounded; typically `[-100, +100]`                                  |
| Default parameters  | `period` required (Sibbet's typical `20`)                            |
| Warmup period       | `period + 1`                                                         |
| Interpretation      | Net buying pressure smoothed; divergences flag exhaustion             |

## Formula

```
ε         = small epsilon to avoid division by zero
pressure  = volume_t · ((close_t - close_{t-1}) / max(close_{t-1}, ε))
           · (1 + (high_t - low_t) / max(close_{t-1}, ε))

DI_t = EMA(pressure, period)_t
```

Wickra uses the textbook simplified form. Sibbet's original
1970s formulation runs the raw pressure through several
smoothings; this implementation captures the same signal in a
streaming-friendly shape. See
`crates/wickra-core/src/indicators/demand_index.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 0`      | EMA smoothing period. |

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python:
`DemandIndex(period).batch(high, low, close, volume)` returns a
1-D `np.ndarray` with `NaN` warmup. Node: same shape.

## Warmup

`warmup_period() == period + 1`. Needs one bar to establish
prior close, then `period` bars for the EMA to seed.

## Edge cases

- **Flat close.** Zero pressure contribution.
- **Zero prior close.** Guarded by epsilon — won't blow up.
- **Reset.** Clears the EMA and the prior-close cache.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, DemandIndex, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..40).map(|i| {
        let b = 100.0 + (f64::from(i) * 0.3).sin() * 5.0;
        Candle::new(b, b + 1.0, b - 1.0, b + 0.2, 1000.0, i as i64).unwrap()
    }).collect();
    let mut di = DemandIndex::new(20)?;
    println!("row 30 = {:?}", di.batch(&candles)[30]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

n = 40
base = 100 + np.sin(np.linspace(0, 12, n)) * 5
di = ta.DemandIndex(20)
print(di.batch(base + 1, base - 1, base + 0.2, np.full(n, 1000.0))[30])
```

### Node

```javascript
const wickra = require('wickra');
const di = new wickra.DemandIndex(20);
// feed h, l, c, v arrays
```

### Streaming

```rust
use wickra::{Candle, DemandIndex, Indicator};

let mut di = DemandIndex::new(20).unwrap();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if let Some(v) = di.update(bar) {
        // Compare DI direction vs price direction for divergence
    }
}
```

## Interpretation

- **Sign of DI.** Positive = net buying pressure, negative =
  selling pressure. Smoothed by the EMA, so swings are slower
  than raw bar-direction.
- **Divergences.** The flagship use — price makes a new high
  while DI flatlines or falls = bearish divergence (exhaustion).
- **Vs ChaikinMoneyFlow.** Similar concept; CMF uses
  close-position-within-range, DI uses close-vs-prior-close.

## Common pitfalls

- **Treating extreme values as signals.** DI is unbounded;
  extreme readings are normal in trending markets.
- **Period too short.** `period = 5` makes DI as noisy as raw
  pressure. Stick to 20+ for Sibbet's intended smoothing.

## References

- James Sibbet, *Demand Index* (1970s) — original.
- Steven B. Achelis, *Technical Analysis from A to Z* (2000) —
  modern reference.

## See also

- [ChaikinMoneyFlow](Indicator-ChaikinMoneyFlow) — alternative
  buy/sell-pressure measure.
- [Mfi](Indicator-Mfi) — Money Flow Index sibling.
- [Obv](Indicator-Obv) — cumulative-flow alternative.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
