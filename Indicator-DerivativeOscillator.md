# DerivativeOscillator

> Derivative Oscillator — Constance Brown's double-EMA-smoothed RSI minus an SMA
> signal, a zero-centered momentum histogram that strips RSI noise.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Momentum Oscillators |
| Input type | `f64` (single price) |
| Output type | `f64` (histogram, centered on 0) |
| Output range | unbounded; oscillates around `0` |
| Default parameters | `rsi_period`, `smooth1`, `smooth2`, `signal_period` (Brown: 14, 5, 3, 9) |
| Warmup period (`warmup_period()`) | `rsi_period + smooth1 + smooth2 + signal_period − 2` |
| Interpretation | Sign and slope of accelerating momentum. |

## Formula

```
rsi    = RSI(price, rsi_period)
s1     = EMA(rsi, smooth1)
s2     = EMA(s1,  smooth2)             // double-smoothed RSI
signal = SMA(s2, signal_period)
DerivativeOscillator = s2 - signal
```

The double EMA pass removes the RSI's jitter; subtracting the SMA signal removes
the residual level, leaving a histogram centered on zero. Positive, rising bars
mark accelerating bullish momentum; negative, falling bars bearish. Because a
*constant* RSI (a steady trend) double-smooths to itself and equals its own
signal, the oscillator reads exactly `0` — the histogram measures the *change*
in momentum, not its level.

Source: `crates/wickra-core/src/indicators/derivative_oscillator.rs`.

## Parameters

| Name            | Type    | Default | Valid range | Source | Description |
|-----------------|---------|---------|-------------|--------|-------------|
| `rsi_period`    | `usize` | 14      | `>= 1`      | `derivative_oscillator.rs:62` | Wilder RSI period. |
| `smooth1`       | `usize` | 5       | `>= 1`      | `derivative_oscillator.rs:62` | First EMA smoothing of the RSI. |
| `smooth2`       | `usize` | 3       | `>= 1`      | `derivative_oscillator.rs:62` | Second EMA smoothing. |
| `signal_period` | `usize` | 9       | `>= 1`      | `derivative_oscillator.rs:62` | SMA signal subtracted to center it. |

Any zero period errors with `Error::PeriodZero`. (Python
`wickra.DerivativeOscillator(rsi_period, smooth1, smooth2, signal_period)`;
Node `new ta.DerivativeOscillator(...)`.)

## Inputs / Outputs

From `crates/wickra-core/src/indicators/derivative_oscillator.rs`:

```rust
use wickra::{DerivativeOscillator, Indicator};
// DerivativeOscillator: Input = f64, Output = f64
const _: fn(&mut DerivativeOscillator, f64) -> Option<f64> =
    <DerivativeOscillator as Indicator>::update;
```

Python returns `float | None` (streaming) / `numpy.ndarray` (batch, `NaN` for
warmup). Node returns `number | null` / `Array<number>` with `NaN`.

## Warmup

`warmup_period()` returns `rsi_period + smooth1 + smooth2 + signal_period − 2`:
the RSI seeds at `rsi_period + 1`, then each EMA adds `len − 1` and the SMA adds
`signal_period − 1`. For the `(14, 5, 3, 9)` defaults that is `29`. Pinned by
`accessors_and_metadata` (`warmup() == 29`) and `first_emission_matches_warmup_period`
(first `Some` exactly at index `warmup_period() − 1`).

## Edge cases

- **Constant momentum → 0.** A steady trend pins the RSI, which double-smooths
  to itself and equals its signal, so the histogram is `0`; shown in the example
  below and implied by `matches_manual_chain`.
- **Equivalence to the manual chain.** `matches_manual_chain` runs
  RSI → EMA → EMA, minus SMA, alongside and asserts equality bar-for-bar.
- **Zero periods.** `rejects_zero_periods` pins the `Error::PeriodZero` path for
  each of the four arguments.
- **Reset.** `reset_clears_state`. **Streaming/batch:** `batch_equals_streaming`.

## Examples

### Rust

```rust
use wickra::{BatchExt, DerivativeOscillator, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut d = DerivativeOscillator::new(3, 2, 2, 3)?;
    let prices: Vec<f64> = (1..=15).map(f64::from).collect();
    let out: Vec<Option<f64>> = d.batch(&prices);
    println!("warmup_period = {}", d.warmup_period());
    println!("{:?}", out);
    Ok(())
}
```

Output:

```
warmup_period = 8
[None, None, None, None, None, None, None, Some(0.0), Some(0.0), Some(0.0), Some(0.0), Some(0.0), Some(0.0), Some(0.0), Some(0.0)]
```

On the steady uptrend the RSI pins at `100`; double-smoothed it stays `100` and
its SMA signal is also `100`, so the histogram is exactly `0` — momentum is
strong but *not accelerating*.

### Python

```python
import numpy as np
import wickra as ta

d = ta.DerivativeOscillator(3, 2, 2, 3)
out = d.batch(np.arange(1.0, 16.0))
print("warmup_period =", d.warmup_period())
print(out)
```

Output:

```
warmup_period = 8
[nan nan nan nan nan nan nan  0.  0.  0.  0.  0.  0.  0.  0.]
```

### Node

```javascript
const ta = require('wickra');
const d = new ta.DerivativeOscillator(3, 2, 2, 3);
const prices = Array.from({ length: 15 }, (_, i) => i + 1);
console.log(d.batch(prices));
console.log('warmupPeriod:', d.warmupPeriod());
```

Output:

```
[
  NaN, NaN, NaN, NaN, NaN,
  NaN, NaN,   0,   0,   0,
    0,   0,   0,   0,   0
]
warmupPeriod: 8
```

### Streaming

```rust
use wickra::{DerivativeOscillator, Indicator};

let mut d = DerivativeOscillator::new(14, 5, 3, 9)?;
let mut last = None;
for i in 0..120 {
    last = d.update(100.0 + (f64::from(i) * 0.2).sin() * 5.0);
}
println!("{last:?}"); // oscillates around 0 with the momentum cycle
# Ok::<(), Box<dyn std::error::Error>>(())
```

## Interpretation

The Derivative Oscillator answers "is momentum *accelerating*?" rather than "is
the market overbought?". Because it is the change of a smoothed RSI around its
own average, it leads the RSI's own turns slightly and filters the chop that
makes a raw RSI hard to read on intraday data.

Typical uses:

1. **Zero-line crosses.** Histogram crossing above zero = momentum turning up;
   below = turning down.
2. **Histogram slope.** Rising bars (even below zero) signal momentum building;
   shrinking bars warn of a stall before the zero cross.
3. **Divergence.** Price highs with lower histogram peaks flag fading thrust.

## Common pitfalls

- **Reading zero as "no trend".** A flat-zero reading means *constant* momentum
  (often a strong, steady trend), not the absence of one.
- **Parameter sprawl.** Four periods interact; start from Brown's `(14, 5, 3, 9)`
  and change one at a time.

## References

Constance Brown, *Technical Analysis for the Trading Professional*, 1999 — the
Derivative Oscillator.

## See also

- [Indicator-Rsi](Indicator-Rsi) — the underlying oscillator.
- [Indicator-Tsi](Indicator-Tsi) — another double-smoothed momentum measure.
- [Indicator-MacdIndicator](Indicator-MacdIndicator) — histogram-style momentum on price EMAs.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
