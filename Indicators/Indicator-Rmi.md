# RMI

> Relative Momentum Index — Wilder's RSI generalised to a multi-bar momentum
> lookback, smoother and slower to flip than the RSI in a trend.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Momentum Oscillators |
| Input type | `f64` (single price) |
| Output type | `f64` |
| Output range | `[0, 100]`; neutral `50` in a flat market |
| Default parameters | `period` and `momentum` are required |
| Warmup period (`warmup_period()`) | `momentum + period` |
| Interpretation | RSI-style overbought/oversold over a longer change window. |

## Formula

```
change_t = close_t - close_{t-momentum}
gain     = max(change, 0),  loss = max(-change, 0)
avg_gain, avg_loss = Wilder-smoothed over `period`
RMI      = 100 * avg_gain / (avg_gain + avg_loss)
```

Roger Altman's RMI (1993) keeps Wilder's smoothing but measures the price change
over `momentum` bars instead of one. A longer momentum window makes the
oscillator smoother and stickier — it holds overbought/oversold readings longer
in a sustained trend — while `momentum = 1` collapses the RMI exactly to the
[`Rsi`](/Indicators/Indicator-Rsi). A flat market (no gains and no losses) returns the
neutral `50`.

Source: `crates/wickra-core/src/indicators/rmi.rs`.

## Parameters

| Name       | Type    | Default | Valid range | Source | Description |
|------------|---------|---------|-------------|--------|-------------|
| `period`   | `usize` | none    | `>= 1`      | `rmi.rs:62` | Wilder smoothing period. `0` errors with `Error::PeriodZero`. |
| `momentum` | `usize` | none    | `>= 1`      | `rmi.rs:62` | Change lookback. `momentum = 1` is the RSI. `0` errors. |

(Python class `wickra.RMI(period, momentum)`; Node `new ta.RMI(period, momentum)`.)

## Inputs / Outputs

From `crates/wickra-core/src/indicators/rmi.rs`:

```rust
use wickra::{Indicator, Rmi};
// Rmi: Input = f64, Output = f64
const _: fn(&mut Rmi, f64) -> Option<f64> = <Rmi as Indicator>::update;
```

Python returns `float | None` (streaming) / `numpy.ndarray` (batch, `NaN` for
warmup). Node returns `number | null` / `Array<number>` with `NaN`.

## Warmup

`warmup_period()` returns `momentum + period`: `momentum` inputs fill the
lookback window, then `period` momentum-changes seed Wilder's averages. Pinned by
`accessors_and_metadata` (`warmup_period() == 19` for `Rmi::new(14, 5)`) and
`warmup_then_emits` (an `Rmi::new(2, 3)` returns `None` for the first four inputs
and emits on the fifth).

## Edge cases

- **`momentum = 1` equals RSI.** `momentum_one_equals_rsi` runs a standalone
  Wilder RSI alongside and asserts identical values.
- **Pure uptrend → 100.** Every momentum-spaced change is positive, so
  `avg_loss = 0`; pinned by `pure_uptrend_is_one_hundred`.
- **Flat market → 50.** `flat_market_is_neutral` pins a constant series to `50`.
- **NaN / infinity inputs.** Ignored, returning the last value — pinned by
  `ignores_non_finite_input`.
- **Reset.** `reset_clears_state`. **Streaming/batch:** `batch_equals_streaming`.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, Rmi};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut rmi = Rmi::new(3, 2)?;
    let prices: Vec<f64> = (1..=10).map(f64::from).collect();
    let out: Vec<Option<f64>> = rmi.batch(&prices);
    println!("warmup_period = {}", rmi.warmup_period());
    println!("{:?}", out);
    Ok(())
}
```

Output:

```
warmup_period = 5
[None, None, None, None, Some(100.0), Some(100.0), Some(100.0), Some(100.0), Some(100.0), Some(100.0)]
```

On the steady uptrend every 2-bar change is positive, so `avg_loss = 0` and the
RMI saturates at `100` from the first emission (input `momentum + period = 5`).

### Python

```python
import numpy as np
import wickra as ta

rmi = ta.RMI(3, 2)
out = rmi.batch(np.arange(1.0, 11.0))
print("warmup_period =", rmi.warmup_period())
print(out)
```

Output:

```
warmup_period = 5
[ nan  nan  nan  nan 100. 100. 100. 100. 100. 100.]
```

### Node

```javascript
const ta = require('wickra');
const rmi = new ta.RMI(3, 2);
const prices = Array.from({ length: 10 }, (_, i) => i + 1);
console.log(rmi.batch(prices));
console.log('warmupPeriod:', rmi.warmupPeriod());
```

Output:

```
[
  NaN, NaN, NaN, NaN, 100,
  100, 100, 100, 100, 100
]
warmupPeriod: 5
```

### Streaming

```rust
use wickra::{Indicator, Rmi};

let mut rmi = Rmi::new(14, 5)?;
let mut last = None;
for i in 0..80 {
    last = rmi.update(100.0 + (f64::from(i) * 0.2).sin() * 5.0);
}
println!("{last:?}");
# Ok::<(), Box<dyn std::error::Error>>(())
```

## Interpretation

The RMI is an RSI you can tune for **persistence**. By widening the change
window (`momentum`), you make the oscillator hold its readings through the
shallow pullbacks that would whip a standard RSI in and out of overbought
territory — useful for trend-following entries where you want the oscillator to
stay "hot" while the trend runs.

Typical uses:

1. **Trend-tolerant overbought/oversold.** Use the usual 70/30 (or 80/20) bands;
   a higher `momentum` keeps the RMI pinned in strong trends rather than
   oscillating.
2. **Momentum confirmation.** RMI holding above 50 confirms bullish momentum;
   crosses of 50 mark momentum shifts.
3. **Divergence.** Same divergence reading as the RSI, but less noisy.

## Common pitfalls

- **Confusing it with DMI/ADX.** "RMI" is the Relative *Momentum* Index, not the
  Directional Movement Index; it is an RSI variant, not a trend-strength gauge.
- **Over-long momentum.** Too large a `momentum` makes the RMI sluggish and
  late; keep it a fraction of the smoothing period for most uses.

## References

Roger Altman, *"Relative Momentum Index: Modifying the RSI"*, Technical Analysis
of Stocks & Commodities, 1993.

## See also

- [Indicator-Rsi](/Indicators/Indicator-Rsi) — the RMI at `momentum = 1`.
- [Indicator-ConnorsRsi](/Indicators/Indicator-ConnorsRsi) — another RSI extension.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
