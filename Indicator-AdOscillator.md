# A/D Oscillator (Williams)

> Larry Williams' Accumulation / Distribution. A cumulative
> volume-less price flow that classifies each bar as accumulation
> or distribution based on its close relative to the previous
> close, then sums the directional component. Uses a true high /
> low that includes the prior close as an anchor — the same idea
> that motivates true range.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Volume                                                               |
| Input type          | `Candle` (uses `high`, `low`, `close`)                              |
| Output type         | `f64` — cumulative                                                   |
| Output range        | unbounded                                                            |
| Default parameters  | none — `AdOscillator::new()`                                         |
| Warmup period       | `2`                                                                  |
| Interpretation      | Cumulative accumulation/distribution flow                            |

## Formula

```
TR_h_t = max(close_{t-1}, high_t)
TR_l_t = min(close_{t-1}, low_t)

AD_t = AD_{t-1} + (close_t - TR_l_t)    if close_t > close_{t-1}  (accumulation)
AD_t = AD_{t-1} + (close_t - TR_h_t)    if close_t < close_{t-1}  (distribution)
AD_t = AD_{t-1}                          if close_t == close_{t-1} (no change)
```

See `crates/wickra-core/src/indicators/ad_oscillator.rs`.

## Parameters

None — `AdOscillator::new()` takes no arguments.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python:
`AdOscillator().batch(high, low, close)` returns a 1-D
`np.ndarray`. Node: same shape; `update(candle)` returns
`number | null`.

## Warmup

`warmup_period() == 2`. First bar seeds the prior close; bar 2
produces the first non-zero output.

## Edge cases

- **No volume input.** Williams' original A/D Oscillator is
  volume-less. Don't confuse with [Adl](Indicator-Adl) (Chaikin's
  volume-weighted version).
- **Cumulative unbounded.** Output drifts without bound; useful
  for divergence detection vs price, not as a level signal.
- **Reset.** Clears the accumulator and the prior close.

## Examples

### Rust

```rust
use wickra::{AdOscillator, BatchExt, Candle, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..30).map(|i| {
        let b = 100.0 + f64::from(i) * 0.5;
        Candle::new(b - 0.3, b + 1.0, b - 1.0, b + 0.3, 1.0, i as i64).unwrap()
    }).collect();
    let mut ad = AdOscillator::new();
    println!("row 20 = {:?}", ad.batch(&candles)[20]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

n = 30
base = 100 + np.arange(n, dtype=float) * 0.5
ad = ta.AdOscillator()
print('row 20:', ad.batch(base + 1, base - 1, base + 0.3)[20])
```

### Node

```javascript
const wickra = require('wickra');
const ad = new wickra.AdOscillator();
const n = 30;
const base = Array.from({ length: n }, (_, i) => 100 + i * 0.5);
console.log('row 20:',
  ad.batch(base.map(b => b + 1), base.map(b => b - 1), base.map(b => b + 0.3))[20]);
```

### Streaming

```rust
use wickra::{AdOscillator, Candle, Indicator};

let mut ad = AdOscillator::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if let Some(v) = ad.update(bar) {
        // v is cumulative; watch for divergences vs price
    }
}
```

## Interpretation

- **Direction-only signal.** A/D Oscillator captures the *cumulative
  direction* of close-to-close moves, anchored by true range
  bounds. Without volume, the slope reflects only price flow.
- **Divergence detection.** Like all cumulative flow indicators,
  the most-useful signal is divergence: price makes a new high,
  A/D Oscillator doesn't → potential top.
- **Vs Adl.** Adl is the Chaikin-style *volume-weighted* version.
  A/D Oscillator is volume-less — for instruments where volume
  data is poor or unavailable, this is the alternative.

## Common pitfalls

- **Confused with Adl.** Different indicator family; A/D
  Oscillator is volume-less, Adl is volume-weighted.
- **Treating absolute level as meaningful.** Cumulative output
  depends on series length; only the *changes* (or divergences)
  carry signal.

## References

- Larry Williams, *How I Made One Million Dollars Last Year
  Trading Commodities* (1973) — first practical exposition.

## See also

- [Adl](Indicator-Adl) — volume-weighted cousin.
- [Obv](Indicator-Obv) — simpler signed-volume cumulative.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
