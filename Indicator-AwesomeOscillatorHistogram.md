# AwesomeOscillatorHistogram

> The difference between the [AwesomeOscillator](Indicator-AwesomeOscillator)
> and its `sma_period`-bar SMA — a configurable generalisation of the
> [AcceleratorOscillator](Indicator-AcceleratorOscillator).

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Oscillators |
| Input type | `Candle` (uses `high` and `low` for the median price) |
| Output type | `f64` |
| Output range | unbounded around zero |
| Default parameters | `fast = 5`, `slow = 34`, `sma_period = 5` |
| Warmup period | `slow + sma_period − 1` (`38` for defaults) |
| Interpretation | Positive bars: AO is rising (bullish acceleration). Negative bars: AO is falling. |

## Formula

```
median     = (high + low) / 2
AO         = SMA(median, fast) − SMA(median, slow)
AOHist     = AO − SMA(AO, sma_period)
```

With Williams' default `(5, 34, 5)` this collapses to the existing
[AcceleratorOscillator](Indicator-AcceleratorOscillator) exactly; for any
other parameterisation it is the more flexible variant. The histogram
measures the *acceleration* of momentum — the rate of change of the AO
itself.

## Parameters

| Name         | Type    | Default | Constraint       | Source |
|--------------|---------|---------|------------------|--------|
| `fast`       | `usize` | `5`     | `>= 1`, `< slow` | `AwesomeOscillatorHistogram::new` (`awesome_oscillator_histogram.rs:50`) |
| `slow`       | `usize` | `34`    | `>= 1`, `> fast` | `awesome_oscillator_histogram.rs:50` |
| `sma_period` | `usize` | `5`     | `>= 1`           | `awesome_oscillator_histogram.rs:50` |

Any zero period returns [`Error::PeriodZero`]; `fast >= slow` returns
[`Error::InvalidPeriod`]. `AwesomeOscillatorHistogram::classic()` returns
`(5, 34, 5)`. Python defaults come from the pyo3 signature; the Node
constructor takes all three arguments explicitly.

## Inputs / Outputs

```rust
use wickra::{Indicator, AwesomeOscillatorHistogram, Candle};
// AwesomeOscillatorHistogram: Input = Candle, Output = f64
const _: fn(&mut AwesomeOscillatorHistogram, Candle) -> Option<f64> = <AwesomeOscillatorHistogram as Indicator>::update;
```

Only `high` and `low` are read (the AO uses the median price), so both
bindings take just those two series.

- **Python.** `update(candle)` returns `float | None`;
  `batch(high, low)` returns a 1-D `float64` `np.ndarray` with `NaN` warmup.
- **Node.** `update(high, low)` returns `number | null`;
  `batch(high, low)` returns an `Array<number>` with `NaN` warmup.

## Warmup

`warmup_period()` returns `slow + sma_period − 1`. The AO emits at `slow`
candles; the SMA of the AO series then needs `sma_period − 1` further AO
values to fill its window. For the defaults that is `34 + 5 − 1 = 38`.
Pinned by `warmup_emits_first_value_at_warmup_period` ((2, 4, 3) → warmup 6:
candles 1–5 return `None`, candle 6 emits).

## Edge cases

- **Constant series.** A flat median drives AO to `0`; the SMA of `0` is
  `0`; the histogram is `0` (test `constant_series_converges_to_zero`).
- **Equivalence to AcceleratorOscillator.** At `(5, 34, 5)` the histogram
  reproduces [AcceleratorOscillator](Indicator-AcceleratorOscillator).
- **Reset.** `reset()` resets both the AO and the SMA.

## Examples

### Rust

```rust
use wickra::{AwesomeOscillatorHistogram, BatchExt, Candle, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..80)
        .map(|i| {
            let p = 100.0 + (f64::from(i) * 0.3).sin() * 5.0;
            Candle::new(p, p + 0.5, p - 0.5, p, 1.0, i64::from(i)).unwrap()
        })
        .collect();
    let mut h = AwesomeOscillatorHistogram::classic(); // (5, 34, 5)
    for v in h.batch(&candles).into_iter().flatten() {
        println!("{v:.4}");
    }
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

h = ta.AwesomeOscillatorHistogram(5, 34, 5)
out = h.batch(high, low)  # 1-D series, NaN for the first 37 rows
```

### Node

```javascript
const ta = require('wickra');
const h = new ta.AwesomeOscillatorHistogram(5, 34, 5);
const v = h.update(101.5, 99.5); // null during warmup, else a number
```

## Interpretation

Where the [AwesomeOscillator](Indicator-AwesomeOscillator) measures
momentum, its histogram measures *acceleration* — momentum's first
derivative:

1. **Zero line.** A cross from negative to positive marks momentum starting
   to accelerate upward (Williams' "saucer" / first green bar); the reverse
   for a downturn.
2. **Early warning.** Because it differentiates the AO, the histogram turns
   *before* the AO itself crosses zero — an earlier (and noisier) signal.

## Common pitfalls

- **Treating it as momentum.** It is the *change* in momentum; a positive
  histogram with a falling AO means momentum is still negative but
  decelerating, not yet bullish.
- **Re-deriving AcceleratorOscillator.** If you only want Williams'
  `(5, 34, 5)` setting, [AcceleratorOscillator](Indicator-AcceleratorOscillator)
  is the dedicated, identical indicator.

## References

- Bill Williams, *New Trading Dimensions*, Wiley, 1998 — the Awesome and
  Accelerator oscillators. The configurable-SMA histogram is Wickra's
  generalisation of Williams' fixed `(5, 34, 5)` Accelerator.

## See also

- [AwesomeOscillator](Indicator-AwesomeOscillator) — the momentum line.
- [AcceleratorOscillator](Indicator-AcceleratorOscillator) — the fixed
  `(5, 34, 5)` equivalent.
- [Alligator](Indicator-Alligator) — Williams' trend filter.
