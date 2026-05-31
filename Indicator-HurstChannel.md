# HurstChannel

> SMA centerline wrapped by the rolling high-low range. A simpler,
> range-based volatility envelope than Bollinger's stddev or Keltner's
> ATR.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Bands & Channels |
| Input type | `Candle` (uses `high`, `low` for the range; `close` for the midline) |
| Output type | `HurstChannelOutput { upper, middle, lower }` |
| Output range | unbounded; `lower ≤ middle ≤ upper` |
| Default parameters | `period = 10`, `multiplier = 0.5` (inner channel) |
| Warmup period | `period` (exact — first emission on bar `period`) |
| Interpretation | Hurst-cycle "inner" / "outer" channel. Inner (`≈0.5`) contains the short-term swing; outer (`≈1.0`) the medium-term cycle. |

## Formula

```
middle = SMA(close, period)
range  = max(high, period) − min(low, period)
upper  = middle + multiplier · range
lower  = middle − multiplier · range
```

With `multiplier = 0.5` the channel reduces to a centerline that hugs
the midpoint of the corresponding [Donchian](Indicator-Donchian)
envelope. Bressert and Brian Millard's cycle-trading work commonly
uses an "inner" multiplier around `0.5` for short-term swings and an
"outer" multiplier near `1.0` for medium-term cycles.

## Parameters

| Name         | Type    | Default | Constraint    | Source |
|--------------|---------|---------|---------------|--------|
| `period`     | `usize` | `10`    | `>= 1`        | `HurstChannel::new` (`hurst_channel.rs:65`) |
| `multiplier` | `f64`   | `0.5`   | finite, `> 0` | `hurst_channel.rs:66` |

`period == 0` returns [`Error::PeriodZero`]; a non-finite or non-positive
`multiplier` returns [`Error::NonPositiveMultiplier`]. Python defaults come
from `#[pyo3(signature = (period=10, multiplier=0.5))]`; the Node constructor
takes both arguments explicitly.

## Inputs / Outputs

```rust
use wickra::{Indicator, HurstChannel, Candle, HurstChannelOutput};
// HurstChannel: Input = Candle, Output = HurstChannelOutput
const _: fn(&mut HurstChannel, Candle) -> Option<HurstChannelOutput> = <HurstChannel as Indicator>::update;
```

- **Python streaming.** `update(candle)` returns `(upper, middle, lower)` or `None`.
- **Python batch.** `HurstChannel.batch(high, low, close)` returns an
  `(n, 3)` `np.ndarray` with columns `[upper, middle, lower]`; warmup rows
  are `NaN` across all three columns.
- **Node streaming.** `update(high, low, close)` returns a
  `{ upper, middle, lower }` object or `null`.
- **Node batch.** `batch(high, low, close)` returns a flat `Array<number>`
  of length `n * 3` interleaved per row `[u0, m0, l0, u1, m1, l1, …]`.

## Warmup

`warmup_period()` reports `period` and the figure is exact: the SMA
centerline needs a full window before the channel is defined, so the
first non-`None` output lands on candle `period` (index `period − 1`).
The rolling high/low deques are kept in lock-step with the SMA, so
readiness is governed entirely by `Sma::is_ready()` — pinned by the
`reference_values` test (`out[3].is_none()`, `out[4]` set for `period = 5`).

## Edge cases

- **Flat market.** A constant-OHLC series collapses `range` to `0`, so
  `upper == middle == lower` (test `flat_market_collapses_bands`).
- **Ordering.** `upper >= middle >= lower` always holds because
  `range >= 0` and `multiplier > 0` (test `upper_above_middle_above_lower`).
- **Reset.** `reset()` clears the SMA and both high/low deques; the next
  `update` restarts the warmup countdown.
- **Non-finite inputs.** `Candle::new` rejects non-finite OHLC up front,
  so the indicator never sees `NaN`/`inf`.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, HurstChannel, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Five identical candles: high = 12, low = 8, close = 10.
    let candles = vec![Candle::new(10.0, 12.0, 8.0, 10.0, 1.0, 0)?; 5];
    let mut hc = HurstChannel::new(5, 0.5)?;
    for v in hc.batch(&candles) {
        println!("{:?}", v);
    }
    Ok(())
}
```

Output:

```
None
None
None
None
Some(HurstChannelOutput { upper: 12.0, middle: 10.0, lower: 8.0 })
```

`SMA(close, 5) = 10`, `range = 12 − 8 = 4`, and with `multiplier = 0.5`
the bands sit at `10 ± 0.5·4 = {12, 8}`. This matches the
`reference_values` test in `hurst_channel.rs`.

### Python

```python
import numpy as np
import wickra as ta

hc = ta.HurstChannel(5, 0.5)
high  = np.full(5, 12.0)
low   = np.full(5, 8.0)
close = np.full(5, 10.0)
print(hc.batch(high, low, close))
```

Output:

```
[[nan nan nan]
 [nan nan nan]
 [nan nan nan]
 [nan nan nan]
 [12. 10.  8.]]
```

### Node

```javascript
const ta = require('wickra');
const hc = new ta.HurstChannel(5, 0.5);
for (let i = 0; i < 4; i++) hc.update(12, 8, 10);
console.log(hc.update(12, 8, 10)); // { upper: 12, middle: 10, lower: 8 }
```

## Interpretation

The Hurst Channel sizes its envelope by the *realised* high-low range of
the window rather than by a statistical dispersion measure. Two canonical
uses:

1. **Cycle channels.** Run two instances on the same `period` — an inner
   channel at `multiplier ≈ 0.5` and an outer at `≈ 1.0`. Price oscillating
   inside the inner channel marks the short-cycle swing; tags of the outer
   channel mark medium-cycle extremes. This is the Hurst/Bressert
   cycle-trading reading.
2. **Mean reversion.** A close beyond the inner channel that fails to reach
   the outer channel is a fade candidate back toward the SMA midline.

Prefer the Hurst Channel over [BollingerBands](Indicator-BollingerBands)
when you want the band width to track the *visible* trading range instead
of a sigma estimate that a single outlier bar can inflate.

## Common pitfalls

- **Confusing the channel with the [HurstExponent](Indicator-HurstExponent).**
  Despite the shared name they are unrelated — this is Brian Millard's
  range channel, not the fractal `H` statistic.
- **Treating `multiplier` as a sigma count.** It scales the raw price
  *range*, not a standard deviation, so a `multiplier` of `2.0` here is a
  far wider band than `2σ` Bollinger.

## References

- Brian Millard, *Channel Analysis*, John Wiley & Sons, 1990.
- Walter Bressert, *The Power of Oscillator/Cycle Combinations* (1991),
  for the inner/outer channel interpretation.

## See also

- [Donchian](Indicator-Donchian) — pure rolling high/low (no midline offset).
- [BollingerBands](Indicator-BollingerBands) — sigma-based dispersion.
- [Keltner](Indicator-Keltner) — ATR-based dispersion.
- [MaEnvelope](Indicator-MaEnvelope) — fixed-percent band around an SMA.
