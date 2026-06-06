# ElderRay

> Elder Ray — Alexander Elder's Bull Power / Bear Power: how far each bar's high
> and low stretch from an EMA of the close.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Momentum Oscillators |
| Input type | `Candle` (uses high, low, close) |
| Output type | `ElderRayOutput { bull_power, bear_power }` |
| Output range | unbounded; bull normally `> 0`, bear normally `< 0` |
| Default parameters | `period` (Elder uses 13) |
| Warmup period (`warmup_period()`) | `period` |
| Interpretation | Strength of buyers (bull) and sellers (bear) vs. the trend mean. |

## Formula

```
ema       = EMA(close, period)
BullPower = high - ema
BearPower = low  - ema
```

The EMA represents the market's consensus value; Bull Power measures how far
buyers lifted the high above it, Bear Power how far sellers drove the low below
it. In a healthy uptrend (rising EMA) Bull Power is positive and Bear Power
negative-but-recovering; Elder's textbook long setup is a rising EMA with Bear
Power negative and ticking up (sellers losing ground).

Source: `crates/wickra-core/src/indicators/elder_ray.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | 13      | `>= 1`      | `elder_ray.rs:60` | EMA period for the consensus mean. `0` errors with `Error::PeriodZero`. |

(Python class `wickra.ElderRay(period)`; Node `new ta.ElderRay(period)`.)

## Inputs / Outputs

From `crates/wickra-core/src/indicators/elder_ray.rs`:

```rust
use wickra::{Candle, ElderRay, ElderRayOutput, Indicator};
// ElderRay: Input = Candle, Output = ElderRayOutput
const _: fn(&mut ElderRay, Candle) -> Option<ElderRayOutput> =
    <ElderRay as Indicator>::update;
```

Two outputs per bar. Node: `update(open, high, low, close)` returns
`{ bullPower, bearPower } | null`; `batch(o[], h[], l[], c[])` returns a flat
`Array<number>` of length `n*2` (`[bull, bear, bull, bear, …]`, `NaN` for
warmup). Python: `update(candle)` returns `(bull, bear) | None`;
`batch(open, high, low, close)` returns an `(n, 2)` `ndarray`.

## Warmup

`warmup_period()` returns `period`: the first reading lands once the inner EMA is
seeded (bar `period`, index `period − 1`). Pinned by `accessors_and_metadata`
(`warmup_period() == 13`) and `warmup_then_known_value`.

## Edge cases

- **Known value.** `warmup_then_known_value` pins an `ElderRay::new(3)`: EMA of
  closes `[10, 12, 14]` seeds at `12`; bar high `16`, low `13` → bull `4`,
  bear `1`.
- **Equivalence to a manual EMA.** `matches_manual_ema` runs a standalone EMA on
  the closes and reproduces both powers bar-for-bar.
- **Reset.** `reset_clears_state` clears the inner EMA.
- **Streaming/batch:** `batch_equals_streaming`.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, ElderRay, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut er = ElderRay::new(3)?;
    let bars = [
        Candle::new(10.0, 11.0, 9.0, 10.0, 1.0, 0)?,
        Candle::new(12.0, 13.0, 11.0, 12.0, 1.0, 1)?,
        Candle::new(14.0, 16.0, 13.0, 14.0, 1.0, 2)?,
    ];
    for v in er.batch(&bars).into_iter().flatten() {
        println!("bull={} bear={}", v.bull_power, v.bear_power);
    }
    Ok(())
}
```

Output:

```
bull=4 bear=1
```

The EMA(3) seeds at the third bar with the mean close `12`; that bar's high `16`
gives Bull Power `4` and its low `13` gives Bear Power `1`.

### Python

```python
import numpy as np
import wickra as ta

er = ta.ElderRay(3)
op = np.array([10.0, 12.0, 14.0])
hi = np.array([11.0, 13.0, 16.0])
lo = np.array([9.0, 11.0, 13.0])
cl = np.array([10.0, 12.0, 14.0])
print(er.batch(op, hi, lo, cl))   # (3, 2): [bull, bear] rows, NaN for warmup
```

Output:

```
[[nan nan]
 [nan nan]
 [ 4.  1.]]
```

### Node

```javascript
const ta = require('wickra');
const er = new ta.ElderRay(3);
const open = [10, 12, 14];
const high = [11, 13, 16];
const low = [9, 11, 13];
const close = [10, 12, 14];
console.log(er.batch(open, high, low, close)); // flat [bull, bear, …], NaN warmup
const last = er.update(14, 16, 13, 14);
console.log(last); // { bullPower: 4, bearPower: 1 }
```

Output:

```
[ NaN, NaN, NaN, NaN, 4, 1 ]
{ bullPower: 4, bearPower: 1 }
```

### Streaming

```rust
use wickra::{Candle, ElderRay, Indicator};

let mut er = ElderRay::new(13)?;
let mut last = None;
for i in 0..40 {
    let base = 100.0 + f64::from(i);
    last = er.update(Candle::new(base, base + 2.0, base - 2.0, base + 0.5, 1.0, i64::from(i))?);
}
println!("{last:?}");
# Ok::<(), Box<dyn std::error::Error>>(())
```

## Interpretation

Elder Ray decomposes momentum into the two camps explicitly: Bull Power is the
buyers' reach above value, Bear Power the sellers' reach below it. Read against
the EMA's slope:

1. **Trend filter + oscillator.** Use the EMA slope for trend direction and the
   two powers for timing within it.
2. **Long setup.** Rising EMA, Bear Power negative but rising (a higher low in
   Bear Power) — sellers exhausting in an uptrend.
3. **Short setup.** Falling EMA, Bull Power positive but falling — buyers
   exhausting in a downtrend.
4. **Divergence.** A new price high with a lower Bull Power high warns of fading
   buying strength.

## Common pitfalls

- **Ignoring the EMA slope.** The powers are only meaningful alongside the trend
  direction; Bull/Bear Power signals are filtered by the EMA's slope, not taken
  in isolation.
- **Comparing magnitudes across instruments.** The powers are in price units;
  normalise (or compare to ATR) before cross-instrument comparison.

## References

Alexander Elder, *Trading for a Living*, 1993 — the Elder Ray (Bull Power / Bear
Power) system.

## See also

- [Indicator-Ema](/Indicators/Indicator-Ema) — the consensus mean the powers are measured against.
- [Indicator-ElderImpulse](/Indicators/Indicator-ElderImpulse) — Elder's impulse system (EMA slope + MACD-hist).
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
