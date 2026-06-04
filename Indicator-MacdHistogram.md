# MacdHistogram

> MACD Histogram — the `macd − signal` bar of MACD exposed as a standalone
> scalar indicator.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Oscillators |
| Input type | `f64` (single close) |
| Output type | `f64` (price units) |
| Output range | unbounded around zero |
| Default parameters | `fast = 12`, `slow = 26`, `signal = 9` |
| Warmup period | `slow + signal − 1` (exact) |
| Interpretation | Positive: MACD above its signal (rising momentum). Slope: momentum accelerating or fading. |

## Formula

```
macd      = EMA(fast) − EMA(slow)
signal    = EMA(macd, signal)
histogram = macd − signal
```

The histogram is the most actively traded part of MACD: it crosses zero
exactly when the MACD line crosses its signal, and its slope shows whether
that momentum is accelerating or fading. This indicator wraps the existing
[MacdIndicator](Indicator-MacdIndicator) and emits only the `histogram`
field, for pipelines that want a plain `f64` stream rather than the full
`MacdOutput`. Source: `crates/wickra-core/src/indicators/macd_histogram.rs`.

## Parameters

| Name     | Type    | Default | Constraint        | Source |
|----------|---------|---------|-------------------|--------|
| `fast`   | `usize` | `12`    | `> 0`, `< slow`   | `MacdHistogram::new` (`macd_histogram.rs:51`) |
| `slow`   | `usize` | `26`    | `> 0`             | `MacdHistogram::new` (`macd_histogram.rs:51`) |
| `signal` | `usize` | `9`     | `> 0`             | `MacdHistogram::new` (`macd_histogram.rs:51`) |

Any zero period returns [`Error::PeriodZero`]; `fast >= slow` returns
[`Error::InvalidPeriod`] (test `rejects_invalid_periods`). Python defaults
come from `#[pyo3(signature = (fast=12, slow=26, signal=9))]`; the Node
constructor takes the three periods explicitly. The public class is
`MacdHistogram` in both bindings.

## Inputs / Outputs

```rust
use wickra::{Indicator, MacdHistogram};
// MacdHistogram: Input = f64, Output = f64
const _: fn(&mut MacdHistogram, f64) -> Option<f64> = <MacdHistogram as Indicator>::update;
```

A single `f64` close in, an `Option<f64>` out (price-unit histogram). Python
maps this to `float | None` / a `float64` `np.ndarray` with `NaN` warmup;
Node to `number | null` / `Array<number>` with `NaN` warmup.

## Warmup

`warmup_period()` returns `slow + signal − 1`. The slow EMA seeds at input
`slow`, then the signal EMA needs `signal − 1` more MACD values — exactly
when [MacdIndicator](Indicator-MacdIndicator) emits its first full output.
Pinned by `warmup_emits_first_value_at_warmup_period` (3, 6, 3: first value
at input 8).

## Edge cases

- **Equals the MACD histogram field.** The standalone series is bit-for-bit
  the `histogram` field of [MacdIndicator](Indicator-MacdIndicator) over the
  same input (test `equals_macd_histogram_field`).
- **Constant series.** Both EMAs converge to the constant, the MACD line
  flattens, the signal catches it, and the histogram converges to `0`
  (test `constant_series_converges_to_zero`).
- **Steady linear trend.** On a constant-slope ramp the MACD line becomes
  flat once seeded, so the histogram collapses to `0` — momentum is constant
  (shown in the example below).
- **Non-finite inputs.** Inherited from `MacdIndicator`: a `NaN`/`inf` input
  returns the last value without advancing the EMAs.
- **Reset.** `reset()` clears all three EMAs and the cached output
  (test `reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, MacdHistogram};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Steady ramp 100, 102, 104, …: once warm the MACD line is flat, so the
    // histogram is 0.
    let prices: Vec<f64> = (0..20).map(|i| 100.0 + f64::from(i) * 2.0).collect();
    let mut hist = MacdHistogram::new(3, 6, 3)?;
    let out = hist.batch(&prices);
    println!("warmup = {}", hist.warmup_period());     // 8
    println!("last = {:?}", out.last().unwrap());       // Some(0.0)
    Ok(())
}
```

Output:

```
warmup = 8
last = Some(0.0)
```

### Python

```python
import numpy as np
import wickra as ta

hist = ta.MacdHistogram(12, 26, 9)
out = hist.batch(np.array([...], dtype=float))  # price-unit histogram, NaN warmup
```

### Node

```javascript
const ta = require('wickra');
const hist = new ta.MacdHistogram(12, 26, 9);
const bar = hist.update(101.5); // null during warmup, else the histogram bar
```

### Streaming

```python
import wickra as ta

hist = ta.MacdHistogram(12, 26, 9)
prev = None
for price in price_feed:
    bar = hist.update(price)
    if bar is not None and prev is not None and prev <= 0 < bar:
        signal_cross_up()       # histogram crossed zero upward
    prev = bar
```

## Interpretation

The MACD histogram condenses the MACD/signal relationship into one
zero-centered bar:

1. **Zero crossings.** A cross from negative to positive is the MACD line
   crossing above its signal (a bullish trigger); the reverse is bearish.
2. **Slope = acceleration.** Rising bars mean momentum is building; bars
   shrinking toward zero mean the move is fading even while still in trend.
3. **Divergence.** Histogram peaks that shrink while price makes new extremes
   flag waning momentum.

For the line and signal alongside the histogram, use
[MacdIndicator](Indicator-MacdIndicator) directly. For a scale-free version
comparable across instruments, see [PpoHistogram](Indicator-PpoHistogram).

## Common pitfalls

- **Reading absolute height across symbols.** The histogram is in price
  units, so its magnitude is not comparable between a $5 and a $5,000 asset —
  use [PpoHistogram](Indicator-PpoHistogram) for that.
- **Acting on the first nonzero bar.** It appears only at `slow + signal − 1`;
  earlier `None`/`NaN` values are warmup, not flat momentum.

## References

- Gerald Appel, *Technical Analysis: Power Tools for Active Investors*,
  Financial Times Prentice Hall, 2005.

## See also

- [MacdIndicator](Indicator-MacdIndicator) — the full MACD line, signal and
  histogram.
- [PpoHistogram](Indicator-PpoHistogram) — the scale-free, percentage
  counterpart.
- [AwesomeOscillatorHistogram](Indicator-AwesomeOscillatorHistogram) — a
  related momentum-histogram construction.
- [Indicators-Overview](Indicators-Overview)
