# ElderSafeZone

> Alexander Elder's trailing stop placed a multiple of the **average market
> noise** away from price — wide enough to survive normal pullbacks, tight enough
> to exit a real reversal.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trailing Stops |
| Input type | `Candle` (high / low / close) |
| Output type | `ElderSafeZoneOutput { value, direction }` |
| Output range | `value` in price units; `direction` ∈ {−1, +1} |
| Default parameters | `(period = 14, coeff = 2.0)` |
| Warmup period | `period + 1` |
| Interpretation | `direction > 0` long (stop below price); flip = exit/reverse. |

## Formula

```
downside penetration_t = max(prev_low − low_t, 0)
upside   penetration_t = max(high_t − prev_high, 0)
avg_down = mean of the non-zero downside penetrations over `period`
avg_up   = mean of the non-zero upside   penetrations over `period`
long  stop = ratchet_up(   low_t  − coeff · avg_down )
short stop = ratchet_down( high_t + coeff · avg_up   )
```

Elder defines *noise* in an uptrend as the part of each bar that dips below the
prior low. Averaging those penetrations (counting only bars that actually
penetrated) and dropping the stop `coeff` multiples below the current low places
it just outside routine pullbacks. The stop trails up and flips when the close
breaks it. Source: `crates/wickra-core/src/indicators/elder_safezone.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | `14`    | `>= 1`      | `elder_safezone.rs:74` | Lookback for the noise (penetration) average. `0` errors with `Error::PeriodZero`. |
| `coeff`  | `f64`   | `2.0`   | `> 0`, finite | `elder_safezone.rs:74` | How many average penetrations the stop sits beyond price. Elder suggests `2`–`3`. Non-positive errors with `Error::NonPositiveMultiplier`. |

`params()` returns `(period, coeff)`; `value` returns the current output if ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/elder_safezone.rs`:

```rust
use wickra::{Candle, Indicator, ElderSafeZone, ElderSafeZoneOutput};
// ElderSafeZone: Input = Candle, Output = ElderSafeZoneOutput
const _: fn(&mut ElderSafeZone, Candle) -> Option<ElderSafeZoneOutput> =
    <ElderSafeZone as Indicator>::update;
```

A `Candle` in, an `Option<ElderSafeZoneOutput>` out. The Python binding returns a
`(value, direction)` tuple from `update` and an `(n, 2)` array from `batch(high,
low, close)`; Node returns `{ value, direction }` and a flat `Float64Array` of
length `n*2`; WASM mirrors the object with camelCase keys.

## Warmup

`warmup_period() == period + 1`. Bar 1 seeds the prior candle; bars
`2..=period+1` accumulate penetration statistics; the first stop lands on bar
`period + 1` (`first_emission_at_warmup_period` pins this).

## Edge cases

- **Uptrend → stop below price.** A clean advance stays long with the stop at or
  below price (`uptrend_keeps_stop_below_price` pins this).
- **Noiseless trend.** If no bar penetrates the prior low, the average is `0` and
  the stop sits exactly at the bar's low (`noiseless_trend_stop_sits_at_low` pins
  this).
- **Reversal.** A sustained decline flips the direction to short
  (`flips_on_reversal` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `e.reset()` clears the prior candle, both penetration windows, the
  trend state and the last value (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, ElderSafeZone};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut e = ElderSafeZone::new(5, 2.0)?;
    let candles: Vec<Candle> = (0..60)
        .map(|i| {
            let base = 100.0 + 2.0 * f64::from(i);
            Candle::new(base, base + 1.0, base - 1.0, base + 0.5, 1_000.0, 0).unwrap()
        })
        .collect();
    let last = e.batch(&candles).last().unwrap().unwrap();
    println!("direction = {}", last.direction);
    Ok(())
}
```

Output:

```
direction = 1
```

### Python

```python
import numpy as np
import wickra as ta

e = ta.ElderSafeZone(14, 2.0)
n = 60
base = np.arange(n, dtype=float) + 100.0
value, direction = e.batch(base + 2.0, base - 2.0, base + 1.0).T
print(value[-1], direction[-1])
```

### Node

```javascript
const ta = require('wickra');

const e = new ta.ElderSafeZone(14, 2.0);
console.log('warmupPeriod:', e.warmupPeriod()); // 15
```

### Streaming

```rust
use wickra::{Candle, Indicator, ElderSafeZone};

let mut e = ElderSafeZone::new(14, 2.0).unwrap();
let mut last = None;
for i in 0..60 {
    let base = 100.0 + f64::from(i);
    let c = Candle::new(base, base + 2.0, base - 2.0, base + 1.0, 1_000.0, 0).unwrap();
    last = e.update(c);
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Noise-aware exit.** The stop adapts to how choppy the instrument is: noisy
   markets push it further from price, quiet ones tighten it.
2. **Coefficient tuning.** Elder recommends `coeff` between `2` and `3`; back-test
   per instrument and timeframe.
3. **Pair with the trend.** SafeZone assumes you have a trend direction; use it
   under a trend filter (e.g. an EMA slope) rather than standalone.

## Common pitfalls

- **Penetration count, not bar count.** The average divides by the number of
  bars that penetrated, not by `period`; a calm window yields a tight stop.
- **Whipsaws on flips.** Like all reversing stops, a choppy market can flip it
  repeatedly; combine with a higher-timeframe filter.
- **Look-back length.** Too short a `period` makes the noise estimate jumpy.

## References

Elder, A. (2002), *Come Into My Trading Room*. The SafeZone stop and its noise
definition are described there.

## See also

- [Indicator-Chandelier Exit](/Indicators/Indicator-ChandelierExit) — ATR stop off the recent extreme.
- [Indicator-KaseDevStop](/Indicators/Indicator-KaseDevStop) — σ-of-two-bar-range stop.
- [Indicator-Psar](/Indicators/Indicator-Psar) — parabolic trailing stop.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
