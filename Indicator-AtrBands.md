# AtrBands

> A close-anchored envelope of width `multiplier · ATR`. The standard
> volatility-targeting band traders use to set initial stop-loss and
> profit targets without waiting for a moving average to warm up.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Bands & Channels |
| Input type | `Candle` (uses `high`, `low`, `close` for ATR; `close` for the midline) |
| Output type | `AtrBandsOutput { upper, middle, lower }` |
| Output range | unbounded; `lower ≤ middle ≤ upper` |
| Default parameters | `period = 14`, `multiplier = 3.0` |
| Warmup period | `period` (the ATR's Wilder seed) |
| Interpretation | Position-sizing band. Entry at the close sets a `multiplier · ATR` stop and the symmetric target. |

## Formula

```
upper  = close + multiplier · ATR(period)
middle = close
lower  = close − multiplier · ATR(period)
```

Unlike [Keltner](Indicator-Keltner) or [StarcBands](Indicator-StarcBands),
the centerline is the *raw close* rather than a smoothed average — the
band rides price tick-for-tick. This is the canonical bracket used in
volatility-targeting position-sizing rules (e.g. "risk 1 % of capital
per 2·ATR move").

## Parameters

| Name         | Type    | Default | Constraint    | Source |
|--------------|---------|---------|---------------|--------|
| `period`     | `usize` | `14`    | `>= 1`        | `AtrBands::new` (`atr_bands.rs:58`) |
| `multiplier` | `f64`   | `3.0`   | finite, `> 0` | `atr_bands.rs:59` |

`period == 0` returns [`Error::PeriodZero`]; a non-finite or non-positive
`multiplier` returns [`Error::NonPositiveMultiplier`]. Python defaults come
from `#[pyo3(signature = (period=14, multiplier=3.0))]`; the Node constructor
takes both arguments explicitly.

## Inputs / Outputs

```rust
impl Indicator for AtrBands {
    type Input  = Candle;
    type Output = AtrBandsOutput;
    fn update(&mut self, candle: Candle) -> Option<AtrBandsOutput>;
}

pub struct AtrBandsOutput { pub upper: f64, pub middle: f64, pub lower: f64 }
```

- **Python streaming.** `update(candle)` returns `(upper, middle, lower)` or `None`.
- **Python batch.** `AtrBands.batch(high, low, close)` returns an `(n, 3)`
  `np.ndarray` with columns `[upper, middle, lower]`; warmup rows are `NaN`.
- **Node streaming.** `update(high, low, close)` returns a
  `{ upper, middle, lower }` object or `null`.
- **Node batch.** `batch(high, low, close)` returns a flat `Array<number>`
  of length `n * 3`.

## Warmup

`warmup_period()` delegates to the inner [`Atr`](Indicator-Atr), which uses
Wilder's seeding: the first [`Atr`](Indicator-Atr) value is the simple
average of the first `period` true ranges, emitted on candle `period`
(index `period − 1`). `AtrBands` emits its first band on that same candle.
Pinned by `reference_values_constant_spread` (`out[3].is_none()`, `out[4]`
set for `period = 5`).

## Edge cases

- **Flat market.** A constant-OHLC series drives ATR to `0`, so
  `upper == middle == lower` (test `flat_market_collapses_bands`).
- **Ordering.** `upper >= middle >= lower` always holds because `ATR >= 0`
  and `multiplier > 0`.
- **Reset.** `reset()` resets the inner ATR; period and multiplier persist.
- **Non-finite inputs.** `Candle::new` rejects non-finite OHLC up front.

## Examples

### Rust

```rust
use wickra::{AtrBands, BatchExt, Candle, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Five identical candles with a true range of 2 each: high 11, low 9, close 10.
    let candles = vec![Candle::new(10.0, 11.0, 9.0, 10.0, 1.0, 0)?; 5];
    let mut ab = AtrBands::new(5, 3.0)?;
    for v in ab.batch(&candles) {
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
Some(AtrBandsOutput { upper: 16.0, middle: 10.0, lower: 4.0 })
```

`ATR(5)` seeds to `2.0`; with `multiplier = 3.0` the bands sit at
`10 ± 3·2 = {16, 4}` (test `reference_values_constant_spread`).

### Python

```python
import numpy as np
import wickra as ta

ab = ta.AtrBands(5, 3.0)
high  = np.full(5, 11.0)
low   = np.full(5, 9.0)
close = np.full(5, 10.0)
print(ab.batch(high, low, close)[-1])  # [16. 10.  4.]
```

### Node

```javascript
const ta = require('wickra');
const ab = new ta.AtrBands(5, 3.0);
for (let i = 0; i < 4; i++) ab.update(11, 9, 10);
console.log(ab.update(11, 9, 10)); // { upper: 16, middle: 10, lower: 4 }
```

## Interpretation

ATR Bands turn the current close into a volatility-scaled bracket:

1. **Stops and targets.** On a long entry at the close, the lower band is a
   natural initial stop and the upper band a symmetric target — both
   denominated in the instrument's own recent volatility rather than a
   fixed price distance.
2. **Breakout confirmation.** A close that pierces the band of a *prior* bar
   marks a move larger than `multiplier · ATR` — an impulse worth acting on.

Because the midline is the raw close, the band re-centres every bar; use
[AtrTrailingStop](Indicator-AtrTrailingStop) instead when you want a stop
that only ratchets in your favour.

## Common pitfalls

- **Reading the midline as a trend filter.** It is the raw close, not a
  moving average — it carries no smoothing. Use [StarcBands](Indicator-StarcBands)
  or [Keltner](Indicator-Keltner) if you want a smoothed centerline.
- **Comparing the current close to the *current* band.** The upper band is
  `close + k·ATR` by construction, so the close can never be above its own
  upper band. Breakout logic must compare against the previous bar's band.

## References

The idiom "stop = entry ± N · ATR" predates any single publication;
J. Welles Wilder's *New Concepts in Technical Trading Systems* (1978)
introduced ATR itself, and Chuck LeBeau / David Lucas popularised the
stop-distance application in *Technical Traders Guide to Computer
Analysis of the Futures Markets* (1992).

## See also

- [Atr](Indicator-Atr) — the volatility scale used.
- [AtrTrailingStop](Indicator-AtrTrailingStop) — directional one-sided
  variant that ratchets only in favour of an open position.
- [SuperTrend](Indicator-SuperTrend) — band that flips sides on a close
  through the opposing rail.
- [StarcBands](Indicator-StarcBands) — SMA-centerline + ATR sibling.
