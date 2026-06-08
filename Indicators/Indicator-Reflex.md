# Reflex

> Ehlers' near-zero-lag cycle oscillator — averages how far the SuperSmoothed
> price deviates from the straight line across the lookback, then self-normalises.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Ehlers / Cycle (DSP) |
| Input type | `f64` |
| Output type | `f64` |
| Output range | self-normalised, roughly `[−3, +3]` |
| Default parameters | `(period = 20)` (Python) |
| Warmup period | `period + 1` |
| Interpretation | Zero-crossings ≈ cycle turns; extremes = over-extension. |

## Formula

```
Filt   = SuperSmoother(price, period)
slope  = (Filt[period] − Filt[0]) / period
sum    = mean over i=1..period of ( Filt[0] + i·slope − Filt[i] )
ms     = 0.04·sum² + 0.96·ms[−1]
Reflex = sum / sqrt(ms)        (0 if ms == 0)
```

Reflex draws the straight line connecting the SuperSmoothed price at the two ends
of the window and averages the curve's deviation from it. Using both endpoints
gives it almost no lag, so it crosses zero right at cycle turns. The adaptive
mean-square term rescales the output to a roughly `±3` band on any instrument.
Source: `crates/wickra-core/src/indicators/reflex.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `20` (Python) | `>= 1`      | `reflex.rs:62` | Lookback for the prefilter and the line fit. `0` errors with `Error::PeriodZero`. |

The `period` getter returns the window; `value` returns the current output if
ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/reflex.rs`:

```rust
use wickra::{Indicator, Reflex};
// Reflex: Input = f64, Output = f64
const _: fn(&mut Reflex, f64) -> Option<f64> = <Reflex as Indicator>::update;
```

An `f64` in, an `Option<f64>` out. The Python binding takes a scalar for `update`
and a 1-D numpy array for `batch` (NaN warmup); Node takes `update(value)` and
`batch(values[])`.

## Warmup

`warmup_period() == period + 1`. The SuperSmoother feeds a `period + 1`-deep
buffer before the first value (`first_emission_at_warmup_period` pins this).

## Edge cases

- **Flat input → 0.** A constant equals its own line, so the deviation — and the
  output — is `0` (`constant_input_is_zero` pins this).
- **Cyclic input → zero-mean swing.** A sine produces a symmetric oscillation
  (`cyclic_input_oscillates_around_zero` pins this).
- **Non-finite input.** A NaN/∞ input is ignored and the last value returned
  (`ignores_non_finite` pins this).
- **Reset.** `r.reset()` clears the SuperSmoother, the filter buffer, the
  normaliser and the last value (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, Reflex};
use std::f64::consts::TAU;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut r = Reflex::new(20)?;
    let xs: Vec<f64> = (0..200).map(|i| 100.0 + (TAU * f64::from(i) / 20.0).sin() * 5.0).collect();
    println!("last = {:?}", r.batch(&xs).last().unwrap());
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

r = ta.Reflex(20)
x = 100 + np.sin(2 * np.pi * np.arange(200) / 20) * 5
print(r.batch(x)[-5:])  # ~[-3, 3] oscillation
```

### Node

```javascript
const ta = require('wickra');

const r = new ta.Reflex(20);
console.log('warmupPeriod:', r.warmupPeriod()); // 21
```

### Streaming

```rust
use wickra::{Indicator, Reflex};

let mut r = Reflex::new(20).unwrap();
let mut last = None;
for i in 0..120 {
    last = r.update(100.0 + (f64::from(i) * 0.3).sin() * 5.0);
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Cycle timing.** Zero-crossings mark cycle turns with minimal lag — earlier
   than RSI or stochastic on the same data.
2. **Over-extension.** Readings near `±2`/`±3` flag stretched moves likely to
   revert.
3. **Pair with Trendflex.** Run both: Reflex leads in ranging markets,
   [`Trendflex`](/Indicators/Indicator-Trendflex) shines in trends.

## Common pitfalls

- **Not bounded exactly.** The normaliser targets `±3` but does not clamp; rare
  spikes can exceed it.
- **Period sets the cycle.** Match `period` to the cycle you want to time.
- **Prefilter lag.** The SuperSmoother adds a touch of lag the line-fit largely
  cancels — but in violent gaps a little remains.

## References

Ehlers, J. F. (2020), "Reflex: A New Zero-Lag Indicator", *Technical Analysis of
Stocks & Commodities*, February 2020.

## See also

- [Indicator-Trendflex](/Indicators/Indicator-Trendflex) — the trend-sensitive sibling.
- [Indicator-SuperSmoother](/Indicators/Indicator-SuperSmoother) — the prefilter.
- [Indicator-BandpassFilter](/Indicators/Indicator-BandpassFilter) — single-band cycle isolator.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
