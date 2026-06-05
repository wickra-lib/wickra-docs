# Opening Range (OR)

> High / low of the first N session bars plus the current bar's
> breakout distance from the range midpoint. Conceptually identical
> to [InitialBalance](/Indicators/Indicator-InitialBalance) but with a shorter
> default window (`6` = 30 min on 5-min bars) and an extra
> `breakout_distance` field — the signed distance from the current
> candle's close to the OR midpoint.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Market Profile                                                       |
| Input type          | `Candle`                                                             |
| Output type         | `OpeningRangeOutput { high, low, breakout_distance }`                |
| Output range        | unbounded (price-units, signed distance for breakout field)          |
| Default parameters  | `period = 6` (30-min OR on 5-min bars)                               |
| Warmup period       | `period`                                                             |
| Interpretation      | Opening-range breakout system reference                               |

## Formula

```
For the first `period` candles since reset:
  high = running max
  low  = running min
  breakout_distance = 0 (range not yet established)

After bar `period`:
  high, low locked
  mid = (high + low) / 2
  breakout_distance = close - mid       (per bar, updated each call)
```

The breakout distance is positive when price trades above the OR
midpoint, negative below. See
`crates/wickra-core/src/indicators/opening_range.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | `6`     | `> 0`      | Bars defining the OR. |

`OpeningRange::new` returns `Error::PeriodZero` for `period == 0`.
`OpeningRange::classic()` returns the `6`-bar factory.

## Inputs / Outputs

`Indicator<Input = Candle, Output = OpeningRangeOutput>` with three
fields.

- **Python.** `OpeningRange(period).batch(high, low, close)`
  returns an `(n, 3)` `float64` array.
- **Node.** Flat `number[]` of length `n * 3`.

## Warmup

`warmup_period() == period`. First emission lands on bar `period`.

## Edge cases

- **Lock-in semantics.** OR-high and OR-low lock after the
  period; breakout_distance continues updating per bar.
- **Caller-driven reset.** Same as InitialBalance — must call
  `reset()` at session boundaries.
- **Pre-warmup behaviour.** First `period - 1` bars return
  `None`; bar `period` emits with `breakout_distance = 0`.
- **Reset.** Clears running stats and the lock.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, OpeningRange};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..10).map(|i| {
        let b = 100.0 + f64::from(i) * 0.5;
        Candle::new(b, b + 1.0, b - 1.0, b, 1.0, i as i64).unwrap()
    }).collect();
    let mut or = OpeningRange::new(3)?;
    if let Some(o) = or.batch(&candles)[5] {
        println!("OR high={}  low={}  bd={}", o.high, o.low, o.breakout_distance);
    }
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

n = 10
base = 100 + np.arange(n, dtype=float) * 0.5
or_ = ta.OpeningRange(3)
out = or_.batch(base + 1, base - 1, base)
print('row 5:', out[5])  # [high, low, breakout_distance]
```

### Node

```javascript
const wickra = require('wickra');
const or_ = new wickra.OpeningRange(3);
const base = Array.from({ length: 10 }, (_, i) => 100 + i * 0.5);
console.log(or_.batch(base.map(b => b + 1), base.map(b => b - 1), base));
```

### Streaming

```rust
use wickra::{Candle, Indicator, OpeningRange};

let mut or_ = OpeningRange::classic();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
fn is_new_session(_bar: Candle) -> bool { false } // your session-boundary predicate
for bar in candle_stream {
    if is_new_session(bar) { or_.reset(); }
    if let Some(o) = or_.update(bar) {
        if o.breakout_distance > 0.0 && bar.close > o.high {
            /* upside breakout */
        }
        if o.breakout_distance < 0.0 && bar.close < o.low {
            /* downside breakdown */
        }
    }
}
```

## Interpretation

- **OR Breakout strategies.** Classic Crabel-style — buy a break
  of OR-high, sell a break of OR-low. The 30-minute OR is the
  most-studied default.
- **Breakout-distance momentum.** The `breakout_distance` field
  tells you how far above / below the OR midpoint price is —
  useful for trend strength reading.
- **Vs InitialBalance.** OR is typically shorter (30 min) than
  IB (1 hour); OR adds breakout-distance output.

## Common pitfalls

- **Manual reset required.** Same as InitialBalance — explicit
  session-boundary reset is mandatory.
- **Period vs timeframe.** `period = 6` is "30 minutes on 5-min
  bars". On 1-min bars, use `period = 30`; on 15-min bars, use
  `period = 2`.
- **Mid vs boundary.** Some traders use OR high/low as breakout
  triggers; others use the midpoint. `breakout_distance`
  supports the midpoint-based reading directly.

## References

- Toby Crabel, *Day Trading with Short Term Price Patterns and
  Opening Range Breakout* (1990) — canonical OR-breakout
  treatment.

## See also

- [InitialBalance](/Indicators/Indicator-InitialBalance) — longer cousin
  without breakout-distance.
- [ValueArea](/Indicators/Indicator-ValueArea) — session-volume distribution.
- [Donchian](/Indicators/Indicator-Donchian) — continuous rolling channel.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
