# PpoHistogram

> PPO Histogram — the `ppo − signal` bar of the Percentage Price Oscillator,
> a scale-free counterpart to the MACD histogram.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Oscillators |
| Input type | `f64` (single close) |
| Output type | `f64` (percentage points) |
| Output range | unbounded around zero |
| Default parameters | `fast = 12`, `slow = 26`, `signal = 9` |
| Warmup period | `slow + signal − 1` (exact) |
| Interpretation | Positive: PPO above its signal (rising momentum). Comparable across instruments. |

## Formula

```
ppo       = 100 · (EMA_fast − EMA_slow) / EMA_slow
signal    = EMA(ppo, signal)
histogram = ppo − signal
```

[Ppo](/Indicators/Indicator-Ppo) itself emits only the percentage line; this indicator
adds the classic signal EMA on top and reports the resulting zero-centered
histogram. Because PPO divides the EMA gap by the slow EMA, the histogram is
**scale-free** — a reading of `0.4` means the same relative momentum on any
asset, unlike the price-unit [MacdHistogram](/Indicators/Indicator-MacdHistogram).
Source: `crates/wickra-core/src/indicators/ppo_histogram.rs`.

## Parameters

| Name     | Type    | Default | Constraint        | Source |
|----------|---------|---------|-------------------|--------|
| `fast`   | `usize` | `12`    | `> 0`, `< slow`   | `PpoHistogram::new` (`ppo_histogram.rs:55`) |
| `slow`   | `usize` | `26`    | `> 0`             | `PpoHistogram::new` (`ppo_histogram.rs:55`) |
| `signal` | `usize` | `9`     | `> 0`             | `PpoHistogram::new` (`ppo_histogram.rs:55`) |

Any zero period returns [`Error::PeriodZero`]; `fast >= slow` returns
[`Error::InvalidPeriod`] (test `rejects_invalid_periods`). Python defaults
come from `#[pyo3(signature = (fast=12, slow=26, signal=9))]`; the Node
constructor takes the three periods explicitly. The public class is
`PpoHistogram` in both bindings.

## Inputs / Outputs

```rust
use wickra::{Indicator, PpoHistogram};
// PpoHistogram: Input = f64, Output = f64
const _: fn(&mut PpoHistogram, f64) -> Option<f64> = <PpoHistogram as Indicator>::update;
```

A single `f64` close in, an `Option<f64>` out (percentage-point histogram).
Python maps this to `float | None` / an `array.array('d')` with `NaN`
warmup; Node to `number | null` / `Array<number>` with `NaN` warmup.

## Warmup

`warmup_period()` returns `slow + signal − 1`. The slow EMA seeds the PPO at
input `slow`, then the signal EMA needs `signal − 1` more PPO values. Pinned
by `warmup_emits_first_value_at_warmup_period` (3, 6, 3: first value at
input 8).

## Edge cases

- **Equals PPO minus a signal EMA.** The output is bit-for-bit
  `Ppo(fast, slow)` minus an `Ema(signal)` of that line, composed by hand
  (test `equals_ppo_minus_signal_ema`).
- **Constant series.** Both EMAs converge to the constant, PPO goes to `0`,
  and the histogram converges to `0` (test `constant_series_converges_to_zero`).
- **Steady linear trend.** Unlike the MACD histogram, on a constant-slope
  ramp the PPO ratio keeps drifting (the gap is divided by the rising slow
  EMA), so the histogram stays nonzero (shown in the example below).
- **Non-finite inputs.** A `NaN`/`inf` input returns the last value without
  advancing either the PPO stage or the signal EMA (test
  `ignores_non_finite_input`).
- **Reset.** `reset()` clears the PPO, the signal EMA and the cached output
  (test `reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, PpoHistogram};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Steady ramp 100, 102, 104, …: the PPO ratio keeps drifting, so the
    // histogram is nonzero even on a straight line.
    let prices: Vec<f64> = (0..20).map(|i| 100.0 + f64::from(i) * 2.0).collect();
    let mut hist = PpoHistogram::new(3, 6, 3)?;
    let out = hist.batch(&prices);
    println!("warmup = {}", hist.warmup_period());                  // 8
    println!("first = {:.6}", out.into_iter().flatten().next().unwrap()); // -0.052098
    Ok(())
}
```

Output:

```
warmup = 8
first = -0.052098
```

### Python

```python
import numpy as np
import wickra as ta

hist = ta.PpoHistogram(12, 26, 9)
out = hist.batch(np.array([...], dtype=float))  # percentage-point histogram, NaN warmup
```

### Node

```javascript
const ta = require('wickra');
const hist = new ta.PpoHistogram(12, 26, 9);
const bar = hist.update(101.5); // null during warmup, else the histogram bar
```

### Streaming

```python
import wickra as ta

hist = ta.PpoHistogram(12, 26, 9)
for price in price_feed:
    bar = hist.update(price)    # None until slow + signal − 1 closes seen
    if bar is not None and bar > 0:
        rising_momentum()       # PPO above its signal
```

## Interpretation

The PPO histogram is the MACD histogram made comparable across instruments:

1. **Zero crossings.** A cross up through zero is PPO crossing above its
   signal (bullish); the reverse is bearish.
2. **Cross-asset screening.** Because the reading is in percentage points,
   the same threshold (say `±0.5`) is meaningful on every symbol — ideal for
   ranking a basket by momentum strength.
3. **Slope = acceleration.** As with MACD, rising bars mean momentum is
   building and shrinking bars mean it is fading.

For the PPO line on its own, use [Ppo](/Indicators/Indicator-Ppo). For the price-unit
version, see [MacdHistogram](/Indicators/Indicator-MacdHistogram).

## Common pitfalls

- **Expecting a flat reading on a straight trend.** Dividing by the slow EMA
  keeps the ratio drifting, so a linear ramp gives a small nonzero histogram
  — unlike the MACD histogram, which collapses to zero there.
- **Acting on the first nonzero bar.** It appears only at `slow + signal − 1`;
  earlier `None`/`NaN` values are warmup.

## References

- Gerald Appel, *Technical Analysis: Power Tools for Active Investors*,
  Financial Times Prentice Hall, 2005.

## See also

- [Ppo](/Indicators/Indicator-Ppo) — the PPO line this histogram is built on.
- [MacdHistogram](/Indicators/Indicator-MacdHistogram) — the price-unit counterpart.
- [Apo](/Indicators/Indicator-Apo) — the absolute (price-unit) price oscillator.
- [Indicators-Overview](/Indicators-Overview)
