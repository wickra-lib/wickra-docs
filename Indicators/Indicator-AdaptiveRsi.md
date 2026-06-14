# AdaptiveRsi

> Wilder's RSI whose up/down averaging adapts to trendiness via Kaufman's
> efficiency ratio — fast in clean moves, smooth through chop.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Ehlers / Cycle (DSP) |
| Input type | `f64` |
| Output type | `f64` |
| Output range | `[0, 100]` (50 = neutral) |
| Default parameters | `(period = 14)` (Python) |
| Warmup period | `period + 1` |
| Interpretation | `> 70` overbought, `< 30` oversold; reacts faster in trends. |

## Formula

```
ER     = |price_t − price_{t−period}| / Σ |Δprice| over the window   (0..1)
sc     = ( ER·(2/3 − 2/31) + 2/31 )²
avg_gain += sc·(gain − avg_gain),  avg_loss += sc·(loss − avg_loss)
RSI    = 100 · avg_gain / (avg_gain + avg_loss)
```

A fixed-period RSI must trade responsiveness for smoothness. The adaptive RSI sets
its smoothing each bar from Kaufman's efficiency ratio (directional move ÷ total
path): in a clean trend (`ER ≈ 1`) the averages track gains and losses almost
immediately; in noise (`ER ≈ 0`) they barely move, filtering the chop. The
`2/3`…`2/31` bounds are KAMA's standard fast/slow smoothing constants. Source:
`crates/wickra-core/src/indicators/adaptive_rsi.rs`. This is the
efficiency-ratio cousin of Ehlers' cycle-adaptive RSI, which instead sets the
lookback from the measured dominant cycle.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `14` (Python) | `>= 1`      | `adaptive_rsi.rs:55` | Efficiency-ratio window (and RSI seed length). `0` errors with `Error::PeriodZero`. |

The `period` getter returns the window; `value` returns the current output if
ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/adaptive_rsi.rs`:

```rust
use wickra::{Indicator, AdaptiveRsi};
// AdaptiveRsi: Input = f64, Output = f64
const _: fn(&mut AdaptiveRsi, f64) -> Option<f64> = <AdaptiveRsi as Indicator>::update;
```

An `f64` in, an `Option<f64>` out. The Python binding takes a scalar for `update`
and a 1-D numpy array for `batch` (NaN warmup); Node takes `update(value)` and
`batch(values[])`.

## Warmup

`warmup_period() == period + 1`. One bar seeds the previous price; `period` changes
seed the averages; the first value lands on bar `period + 1`
(`first_emission_at_warmup_period` pins this).

## Edge cases

- **Pure uptrend → 100.** No losses drive the reading to `100`
  (`pure_uptrend_is_one_hundred` pins this).
- **Flat market → 50.** No gains and no losses give the neutral `50`
  (`flat_market_is_neutral` pins this).
- **Bounded.** The reading stays within `[0, 100]` (`output_in_range` pins this).
- **Non-finite input.** A NaN/∞ input is ignored and the last value returned
  (`ignores_non_finite` pins this).
- **Reset.** `r.reset()` clears the windows, the averages and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, AdaptiveRsi};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut r = AdaptiveRsi::new(5)?;
    let out = r.batch(&(1..=40).map(f64::from).collect::<Vec<_>>());
    println!("{:?}", out.last().unwrap()); // Some(100.0)
    Ok(())
}
```

Output:

```
Some(100.0)
```

### Python

```python
import numpy as np
import wickra as ta

r = ta.ADAPTIVERSI(14)
x = 100 + np.sin(np.arange(200) * 0.3) * 8
print(r.batch(x)[-1])   # in [0, 100]
```

### Node

```javascript
const ta = require('wickra');

const r = new ta.ADAPTIVERSI(14);
console.log('warmupPeriod:', r.warmupPeriod()); // 15
```

### Streaming

```rust
use wickra::{Indicator, AdaptiveRsi};

let mut r = AdaptiveRsi::new(14).unwrap();
let mut last = None;
for i in 0..60 {
    last = r.update(100.0 + (f64::from(i) * 0.3).sin() * 5.0);
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Fewer whipsaws.** In chop the smoothing collapses, so the oscillator does not
   flap across the 30/70 lines the way a fast fixed RSI does.
2. **Faster trend reads.** When a trend kicks in the efficiency ratio rises and the
   RSI snaps to overbought/oversold sooner than a long fixed RSI.
3. **Same thresholds.** Read the 30/50/70 levels exactly as for a standard RSI.

## Common pitfalls

- **Not a cycle-period RSI.** This adapts the *smoothing*, not the lookback; for
  the dominant-cycle form pair it with an autocorrelation periodogram.
- **ER needs a trend to differ.** On purely random data the efficiency ratio sits
  low and the RSI behaves like a slow fixed one.
- **Period meaning.** Here `period` is the efficiency-ratio window, not a Wilder
  smoothing length.

## References

Wilder, J. W. (1978), *New Concepts in Technical Trading Systems* (RSI); Kaufman,
P. J. (1995), *Smarter Trading* (the efficiency ratio and KAMA smoothing);
Ehlers, J. F. (2013), *Cycle Analytics for Traders* (cycle-adaptive RSI).

## See also

- [Indicator-Rsi](/Indicators/Indicator-Rsi) — the fixed-period original.
- [Indicator-Kama](/Indicators/Indicator-Kama) — Kaufman's adaptive moving average.
- [Indicator-AdaptiveCci](/Indicators/Indicator-AdaptiveCci) — the adaptive CCI counterpart.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
