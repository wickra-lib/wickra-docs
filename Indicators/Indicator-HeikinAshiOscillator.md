# HeikinAshiOscillator

> The Heikin-Ashi candle body (`ha_close − ha_open`), optionally EMA-smoothed, as
> a zero-line oscillator — the HA colour/strength turned into a number.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Ichimoku & Charts |
| Input type | `Candle` (open / high / low / close) |
| Output type | `f64` |
| Output range | zero-mean (price units) |
| Default parameters | `(period = 5)` (Python) |
| Warmup period | `period` |
| Interpretation | `> 0` bullish HA candle; `< 0` bearish; magnitude = strength. |

## Formula

```
body = ha_close − ha_open
HAO  = EMA(body, period)
```

A Heikin-Ashi candle is bullish when its close exceeds its open; the body size is
conviction. Plotting the (smoothed) body as an oscillator converts the HA visual
into a signal: positive = bullish HA candles, negative = bearish, zero-crosses =
trend changes. `period == 1` gives the raw body. Source:
`crates/wickra-core/src/indicators/heikin_ashi_oscillator.rs`.

## Parameters

| Name     | Type    | Default      | Valid range | Source | Description |
|----------|---------|--------------|-------------|--------|-------------|
| `period` | `usize` | `5` (Python) | `>= 1`      | `heikin_ashi_oscillator.rs:58` | EMA smoothing of the HA body (`1` = raw body). `0` errors with `Error::PeriodZero`. |

The `period` getter returns the smoothing; `value` returns the current output if
ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/heikin_ashi_oscillator.rs`:

```rust
use wickra::{Candle, Indicator, HeikinAshiOscillator};
// HeikinAshiOscillator: Input = Candle, Output = f64
const _: fn(&mut HeikinAshiOscillator, Candle) -> Option<f64> =
    <HeikinAshiOscillator as Indicator>::update;
```

A `Candle` in, an `Option<f64>` out. Python `update(candle)` / `batch(open, high,
low, close)` → 1-D ndarray (NaN warmup); Node `update(open, high, low, close)` /
`batch(...)`.

## Warmup

`warmup_period() == period`. The HA transform is ready on bar one; the body EMA
seeds over `period` bars (`first_emission_at_warmup_period` pins this).

## Edge cases

- **Uptrend → positive.** A clean rise gives a positive body
  (`uptrend_is_positive` pins this).
- **Downtrend → negative.** A clean fall gives a negative body
  (`downtrend_is_negative` pins this).
- **Flat market → 0.** A balanced bar yields a zero body
  (`flat_market_near_zero` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `h.reset()` clears the HA state, the EMA and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, HeikinAshiOscillator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut h = HeikinAshiOscillator::new(3)?;
    let candles: Vec<Candle> = (0..40)
        .map(|i| { let b = 100.0 + 2.0 * f64::from(i); Candle::new(b, b + 1.0, b - 1.0, b + 1.5, 1_000.0, 0).unwrap() })
        .collect();
    println!("last > 0: {}", h.batch(&candles).last().unwrap().unwrap() > 0.0);
    Ok(())
}
```

Output:

```
last > 0: true
```

### Python

```python
import numpy as np
import wickra as ta

h = ta.HeikinAshiOscillator(5)
o = np.arange(40.0)+100; hi = o+1; lo = o-1; c = o+0.5
print(h.batch(o, hi, lo, c)[-1])  # > 0 in an uptrend
```

### Node

```javascript
const ta = require('wickra');

const h = new ta.HeikinAshiOscillator(5);
console.log('warmupPeriod:', h.warmupPeriod()); // 5
```

### Streaming

```rust
use wickra::{Candle, Indicator, HeikinAshiOscillator};

let mut h = HeikinAshiOscillator::new(5).unwrap();
let feed: Vec<Candle> = Vec::new(); // your live stream
for candle in feed {
    if let Some(v) = h.update(candle) {
        // v crossing zero -> HA colour flip
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Trend strength.** Rising magnitude = strengthening HA trend; shrinking toward
   zero = momentum fading.
2. **Zero-cross signals.** A cross from negative to positive is the HA bullish flip
   condensed to one line.
3. **Divergence.** Body magnitude falling while price extends warns of an exhausting
   move.

## Common pitfalls

- **Body, not price.** It measures the synthetic HA body, not real returns.
- **Smoothing lag.** Larger `period` cleans signals but delays flips.
- **Pair with structure.** Use it as a trend filter, not a standalone entry.

## References

Built on Heikin-Ashi (Japanese candlestick practice); the body-as-oscillator form
is a common derivation.

## See also

- [Indicator-HeikinAshi](/Indicators/Indicator-HeikinAshi) — the candle transform.
- [Indicator-SmoothedHeikinAshi](/Indicators/Indicator-SmoothedHeikinAshi) — EMA-smoothed HA.
- [Indicator-ElderImpulse](/Indicators/Indicator-ElderImpulse) — bar-colour trend/momentum system.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
