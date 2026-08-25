# Center of Gravity (CG) Oscillator

> John Ehlers' Center of Gravity oscillator. Treats the most recent
> `period` prices as masses and reports the weighted "center" of
> that mass distribution, negated and offset so positive readings
> correspond to recent strength. Has zero lag at the cycle the
> period is tuned to — one of Ehlers' near-zero-lag oscillators.

## Quick reference

| Item                | Value                                                                  |
|---------------------|------------------------------------------------------------------------|
| Family              | Ehlers / Cycle (DSP)                                                   |
| Input type          | `f64`                                                                  |
| Output type         | `f64`                                                                  |
| Output range        | unbounded; centred near zero by construction                            |
| Default parameters  | `period` is required (typical `10`)                                    |
| Warmup period       | `period`                                                               |
| Interpretation      | `> 0` recent strength; `< 0` recent weakness; near-zero-lag at period  |

## Formula

```
num_t = Σ_{k=0..period-1} (1 + k) · price_{t-k}
den_t = Σ_{k=0..period-1} price_{t-k}

CG_t  = - num_t / den_t + (period + 1) / 2
```

The constant offset `(period + 1) / 2` centres the oscillator
around zero for a constant input. See
`crates/wickra-core/src/indicators/center_of_gravity.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 0`      | Rolling window length. |

`CenterOfGravity::new` returns `Error::PeriodZero` for `period == 0`.

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Python:
`CenterOfGravity(period).batch(prices)` returns an `array.array('d')`
with `NaN` in the warmup prefix. Node: same shape; `update(value)`
returns `number | null`.

## Warmup

`warmup_period() == period`. The window fills exactly at input
`period`; first emission lands there.

## Edge cases

- **Constant input.** `num` and `den` both proportional to the
  constant; `num/den == (period+1)/2`, so CG outputs `0`.
- **All-zero window.** `den == 0` would cause division by zero;
  the indicator returns `None` for that bar.
- **Pure trend.** CG drifts steadily away from zero — the
  oscillator's centring assumption is broken by long trends.
- **Reset.** `reset()` clears the rolling window and the last
  value.

## Examples

### Rust

```rust
use wickra::{BatchExt, CenterOfGravity, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prices: Vec<f64> = (0..50)
        .map(|i| 100.0 + (f64::from(i) * 0.3).sin() * 5.0)
        .collect();
    let mut cg = CenterOfGravity::new(10)?;
    println!("row 20 = {:?}", cg.batch(&prices)[20]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

prices = 100 + np.sin(np.linspace(0, 15, 50)) * 5
cg = ta.CenterOfGravity(10)
print('warmup:', cg.warmup_period())  # 10
print('row 20:', cg.batch(prices)[20])
```

### Node

```javascript
const wickra = require('wickra');
const cg = new wickra.CenterOfGravity(10);
const prices = Array.from({ length: 50 },
  (_, i) => 100 + Math.sin(i * 0.3) * 5);
console.log('row 20:', cg.batch(prices)[20]);
```

### Streaming

```rust
use wickra::{CenterOfGravity, Indicator};

let mut cg = CenterOfGravity::new(10).unwrap();
let mut prev: Option<f64> = None;
let price_stream: Vec<f64> = Vec::new(); // your live price feed
for px in price_stream {
    if let Some(v) = cg.update(px) {
        if let Some(p) = prev {
            if p < 0.0 && v > 0.0 { /* CG crossed up — bullish */ }
        }
        prev = Some(v);
    }
}
```

## Interpretation

- **Near-zero-lag oscillator.** When `period` matches the dominant
  cycle, CG has very little lag — its peaks and troughs align with
  the price cycle's peaks and troughs, unlike RSI / Stochastic
  which lag by a quarter cycle.
- **Zero-line crossings.** Use as a fast cycle-momentum signal.
  Often paired with a slow trend filter (longer-period SMA, or
  [Decycler](/Indicators/Indicator-Decycler)) to gate the direction.
- **Trend bias.** In strong trends CG drifts away from zero; the
  oscillator centring breaks. Pair with a trend detector to mute
  signals during trends.

## Common pitfalls

- **Treating it as bounded.** Output is unbounded; threshold-based
  systems need per-instrument calibration.
- **Period mismatch with dominant cycle.** CG's zero-lag property
  only holds at the cycle the period is tuned to. Combine with
  [HilbertDominantCycle](/Indicators/Indicator-HilbertDominantCycle) to find
  the right period — or use a fixed `10` and accept some lag
  outside that cycle band.
- **Long warmup interpretation.** During warmup (`< period` bars)
  no value is emitted; many Ehlers implementations show
  arbitrary fill values, which can be confused with real signal.

## References

- John F. Ehlers, *Cybernetic Analysis for Stocks and Futures*
  (2004), ch. 7 — original Center of Gravity oscillator.

## See also

- [CyberneticCycle](/Indicators/Indicator-CyberneticCycle) — sibling
  near-zero-lag cycle component.
- [FisherTransform](/Indicators/Indicator-FisherTransform) — paired with CG
  in many Ehlers charts.
- [HilbertDominantCycle](/Indicators/Indicator-HilbertDominantCycle) — for
  adaptive period selection.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
