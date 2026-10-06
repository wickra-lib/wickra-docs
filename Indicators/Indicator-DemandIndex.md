# Demand Index

> James Sibbet's Demand Index — the ratio of smoothed buying pressure
> to smoothed selling pressure, bounded in `[-100, +100]`. Each bar's
> relative volume goes in full to the side the weighted close moved
> towards, while the other side receives that volume damped
> exponentially by the size of the move against the typical two-bar
> range. Sibbet's hypothesis is that volume confirms or denies price
> moves; the Demand Index quantifies the confirmation.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Volume                                                               |
| Input type          | `Candle` (uses `high`, `low`, `close`, `volume`)                     |
| Output type         | `f64`                                                                |
| Output range        | `[-100, +100]` (bounded)                                             |
| Default parameters  | `period` required (common choice `20`)                               |
| Warmup period       | `period + 1`                                                         |
| Interpretation      | `> 0` buying pressure dominates, `< 0` selling; divergences flag exhaustion |

## Formula

```
WC     = (high + low + 2·close) / 4
ratio  = (WC_t − WC_{t−1}) / min(WC_t, WC_{t−1})
vol    = volume_t / SMA(volume, period)
K      = 3·WC_t / SMA(max(high_t, high_{t−1}) − min(low_t, low_{t−1}), period)
damped = vol / exp(min(K · |ratio|, 88))

ratio > 0:  BP = vol,     SP = damped
otherwise:  BP = damped,  SP = vol

B, S = EMA(BP, period), EMA(SP, period)     (α = 2/(period+1), seeded with the first value)

DI_t = +100 · (1 − S / B)   if B > S
       −100 · (1 − B / S)   if B < S
       0                    if B = S
```

This is Sibbet's construction as published in the TradeStation
`DemandIndex` function. The side the weighted close moved towards
receives the bar's full relative volume; the opposite side receives
it damped by `exp(K·|ratio|)`, so a large move relative to the
market's typical two-bar range leaves almost nothing on the losing
side. The exponent is capped at `88` to keep `exp` finite on a
violent bar. Because `B` and `S` are both non-negative, the ratio
form keeps DI within `[-100, +100]`. See
`crates/wickra-core/src/indicators/demand_index.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 0`      | Length of the volume and two-bar-range SMAs and of the two pressure EMAs. |

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python:
`DemandIndex(period).batch(high, low, close, volume)` returns a
`array.array('d')` with `NaN` warmup. Node: same shape.

## Warmup

`warmup_period() == period + 1`. Needs one bar to establish the
prior candle, then `period` two-bar ranges to fill the range
average; the first value lands on bar `period + 1`. The pressure
EMAs are seeded with their first value, so there is no extra EMA
warmup.

## Edge cases

- **Flat bars.** Zero two-bar range means no measurable pressure;
  DI stays at `0` (`constant_series_yields_zero`).
- **Zero weighted close / zero averages.** A bar whose weighted
  close (current or prior), average range or average volume is
  zero carries no measurable pressure and repeats the previous
  reading — no division by zero
  (`zero_weighted_close_contributes_no_signal`).
- **Direction.** Steadily rising closes end strictly positive,
  steadily falling closes strictly negative
  (`rising_series_yields_positive_signal`,
  `falling_series_yields_negative_signal`).
- **Reset.** Clears both EMAs, the SMA windows and the prior-candle
  cache (`reset_clears_state`).

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
    println!("row 30 = {:?}", di.batch(&candles)[30]); // row 30 = Some(35.02925671228102)
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
print(di.batch(base + 1, base - 1, base + 0.2, np.full(n, 1000.0))[30])  # ≈ 29.2266
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

- **Sign of DI.** Positive = buying pressure dominates, negative =
  selling pressure dominates; the magnitude (up to `±100`) says by
  how much. Smoothed by the EMAs, so swings are slower than raw
  bar-direction.
- **Zero crossings.** A move through zero marks the balance of
  pressure changing sides.
- **Divergences.** The flagship use — price makes a new high
  while DI flatlines or falls = bearish divergence (exhaustion).
- **Vs ChaikinMoneyFlow.** Similar concept; CMF uses
  close-position-within-range, DI uses the change in weighted
  close scaled by the typical range.

## Common pitfalls

- **Treating extreme values as signals.** DI is bounded at
  `±100`, and readings near the bounds are normal in strongly
  trending markets — they are not overbought/oversold levels.
- **Period too short.** `period = 5` makes DI as noisy as raw
  pressure. Stick to 20+ for Sibbet's intended smoothing.

## References

- James Sibbet, *Demand Index* (1970s) — original.
- TradeStation `DemandIndex` function — the published reference
  implementation this follows.
- Steven B. Achelis, *Technical Analysis from A to Z* (2000) —
  modern reference.

## See also

- [ChaikinMoneyFlow](/Indicators/Indicator-ChaikinMoneyFlow) — alternative
  buy/sell-pressure measure.
- [Mfi](/Indicators/Indicator-Mfi) — Money Flow Index sibling.
- [Obv](/Indicators/Indicator-Obv) — cumulative-flow alternative.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
