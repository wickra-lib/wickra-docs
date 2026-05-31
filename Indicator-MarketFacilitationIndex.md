# Market Facilitation Index (MFI BW)

> Bill Williams' Market Facilitation Index — how much price movement
> the market produces per unit of volume. Not the same as the
> [Mfi](Indicator-Mfi) Money Flow Index; this is the simpler
> Williams BW-MFI used in his "Trading Chaos" methodology.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Volume                                                               |
| Input type          | `Candle` (uses `high`, `low`, `volume`)                              |
| Output type         | `f64`                                                                |
| Output range        | `[0, ∞)`                                                             |
| Default parameters  | none                                                                 |
| Warmup period       | `1`                                                                  |
| Interpretation      | Price-move per unit-volume; pair with prior-bar comparison           |

## Formula

```
MFI_BW_t = (high_t - low_t) / volume_t
```

A bar with zero volume returns `None` (no facilitation can be
defined). See
`crates/wickra-core/src/indicators/market_facilitation_index.rs`.

## Parameters

None.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python:
`MarketFacilitationIndex().batch(high, low, volume)` returns a 1-D
`np.ndarray` with `NaN` for zero-volume bars. Node: same;
`update(candle)` returns `number | null`.

## Warmup

`warmup_period() == 1`.

## Edge cases

- **Zero-volume bar.** Returns `None`.
- **Wide-range, low-volume.** High MFI — "fake" move per Williams'
  classification (low participation).
- **Reset.** Stateless.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, MarketFacilitationIndex};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..10).map(|i| {
        let b = 100.0 + f64::from(i);
        Candle::new(b, b + 2.0, b - 2.0, b, 1000.0, i as i64).unwrap()
    }).collect();
    let mut m = MarketFacilitationIndex::new();
    println!("row 5 = {:?}", m.batch(&candles)[5]);
    // (h-l)/v = 4/1000 = 0.004
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

n = 10
base = 100 + np.arange(n, dtype=float)
m = ta.MarketFacilitationIndex()
print(m.batch(base + 2, base - 2, np.full(n, 1000.0)))
```

### Node

```javascript
const wickra = require('wickra');
const m = new wickra.MarketFacilitationIndex();
// feed h, l, v
```

### Streaming

```rust
use wickra::{Candle, Indicator, MarketFacilitationIndex};

let mut m = MarketFacilitationIndex::new();
let mut prev_mfi: Option<f64> = None;
let mut prev_vol: Option<f64> = None;
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if let Some(v) = m.update(bar) {
        if let (Some(pm), Some(pv)) = (prev_mfi, prev_vol) {
            // Williams' 4-class taxonomy:
            // green (+,+) MFI↑ volume↑: confirmed move
            // fade  (+,-) MFI↑ volume↓: fake move
            // fake  (-,+) MFI↓ volume↑: absorption
            // squat (-,-) MFI↓ volume↓: indecision
        }
        prev_mfi = Some(v);
        prev_vol = Some(bar.volume);
    }
}
```

## Interpretation

Williams' four-class MFI taxonomy (compared to the previous bar):

- **Green (MFI ↑, volume ↑).** Confirmed move — high participation,
  large range. Strong continuation.
- **Fade (MFI ↑, volume ↓).** Fake move — large range on low
  volume. Likely to retrace.
- **Fake (MFI ↓, volume ↑).** Absorption — volume up but range
  down, signals turning point.
- **Squat (MFI ↓, volume ↓).** Indecision / consolidation.

Pair with [Alligator](Indicator-Alligator) and
[WilliamsFractals](Indicator-WilliamsFractals) for the full
"Trading Chaos" methodology.

## Common pitfalls

- **Confused with Mfi.** Different indicator: this is BW-MFI
  (range/volume); the other is Money Flow Index (RSI of money
  flow).
- **Absolute level meaningless.** MFI depends on instrument's
  price and volume scale; only the *change vs prior bar* and
  comparison with volume change carry signal.

## References

- Bill Williams, *Trading Chaos* (1995) — original BW-MFI and the
  4-class taxonomy.

## See also

- [Mfi](Indicator-Mfi) — Money Flow Index (different indicator
  despite name overlap).
- [Alligator](Indicator-Alligator) — Williams' companion.
- [WilliamsFractals](Indicator-WilliamsFractals) — Williams'
  fractal sibling.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
