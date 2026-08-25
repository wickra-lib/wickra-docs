# MedianMA

> Median Moving Average — the rolling median of the last `period` prices, a
> rank-statistic average that shrugs off single outliers.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Moving Averages |
| Input type | `f64` (single price) |
| Output type | `f64` |
| Output range | unbounded; always a value within the window's min/max |
| Default parameters | `period` is required (no default in either binding) |
| Warmup period (`warmup_period()`) | `period` — first emission lands on input `period` |
| Interpretation | Robust central line; ignores lone spikes. |

## Formula

```
sorted = sort(window of last `period` values)
mid    = period / 2                            // integer division
MedianMA = sorted[mid]                          if period is odd
         = (sorted[mid - 1] + sorted[mid]) / 2  if period is even
```

The median is the central order statistic of the window. Unlike the
[`Sma`](/Indicators/Indicator-Sma), which sums every value, the median depends only on the
*ranking* of the values, so a single extreme tick can move it by at most one
rank position rather than dragging the whole average toward the spike. This
makes the median MA a natural robust smoother for data with occasional bad
prints or fat-tailed noise.

Source: `crates/wickra-core/src/indicators/median_ma.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= 1`      | `median_ma.rs:51` | Window length. `period = 0` errors with `Error::PeriodZero`. `period = 1` is a pass-through (median of one value). |

(Python class `wickra.MedianMA(period)` has no `#[pyo3(signature)]` default;
pass `period` explicitly.)

## Inputs / Outputs

From `crates/wickra-core/src/indicators/median_ma.rs`:

```rust
use wickra::{Indicator, MedianMa};
// MedianMa: Input = f64, Output = f64
const _: fn(&mut MedianMa, f64) -> Option<f64> = <MedianMa as Indicator>::update;
```

Python returns `float | None` (streaming) / `array.array('d')` (batch, `NaN` for
warmup). Node returns `number | null` / `Array<number>` with `NaN`.

## Warmup

`warmup_period()` returns `period`: the window must hold `period` values before
a median is defined, so the first non-`None` output lands on input `period`
(index `period − 1`). Pinned by `accessors_and_metadata`
(`warmup_period() == 7` for `MedianMa::new(7)`) and by
`warmup_returns_none_then_odd_median`, which asserts the first two inputs of a
MedianMA(3) return `None` and the third returns the middle value.

## Edge cases

- **Even period.** The two central order statistics are averaged —
  `even_period_averages_two_central_values` pins MedianMA(4) of `[1,2,3,4]` to
  `2.5`.
- **Outlier robustness.** `robust_to_single_outlier` pins MedianMA(3) of
  `[10, 11, 9999]` to `11.0` — the spike is ignored.
- **Window sliding.** `slides_window_correctly` checks the median tracks
  correctly as the window advances across `[1,2,3,4,5]`.
- **`period = 1` pass-through.** Pinned by `period_one_is_pass_through`.
- **NaN / infinity inputs.** Non-finite inputs are ignored: the window is left
  unchanged and the current value is returned, pinned by
  `ignores_non_finite_input_but_keeps_state` (the internal sort can therefore
  rely on a total order over finite values).
- **Reset.** `mma.reset()` clears the window — pinned by `reset_clears_state`.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, MedianMa};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut mma = MedianMa::new(3)?;
    let prices: Vec<f64> = (1..=10).map(f64::from).collect();
    let out: Vec<Option<f64>> = mma.batch(&prices);
    println!("warmup_period = {}", mma.warmup_period());
    println!("{:?}", out);
    Ok(())
}
```

Output:

```
warmup_period = 3
[None, None, Some(2.0), Some(3.0), Some(4.0), Some(5.0), Some(6.0), Some(7.0), Some(8.0), Some(9.0)]
```

On the monotone ramp the median of each 3-bar window is its centre value, so the
output is the price one bar back.

### Python

```python
import numpy as np
import wickra as ta

mma = ta.MedianMA(3)
out = mma.batch(np.arange(1.0, 11.0))
print("warmup_period =", mma.warmup_period())
print(out)
```

Output:

```
warmup_period = 3
[nan nan  2.  3.  4.  5.  6.  7.  8.  9.]
```

### Node

```javascript
const ta = require('wickra');
const mma = new ta.MedianMA(3);
const prices = Array.from({ length: 10 }, (_, i) => i + 1);
console.log(mma.batch(prices));
console.log('warmupPeriod:', mma.warmupPeriod());
```

Output:

```
[
  NaN, NaN, 2, 3, 4,
  5,   6,   7, 8, 9
]
warmupPeriod: 3
```

### Streaming

```rust
use wickra::{Indicator, MedianMa};

let mut mma = MedianMa::new(3)?;
for price in [10.0, 11.0, 9999.0, 12.0] {
    if let Some(v) = mma.update(price) {
        println!("{v}");
    }
}
# Ok::<(), Box<dyn std::error::Error>>(())
```

Output (the `9999` spike never becomes the median):

```
11
12
```

## Interpretation

The median MA is the smoother to use when your price feed has **occasional bad
prints, gaps, or fat-tailed noise**. Because it is a rank statistic, one or two
extreme values per window cannot pull it off the true central level — a property
no sum-based average shares. On clean data it tracks like a laggy SMA; its value
shows up precisely when the data is dirty.

Typical uses:

1. **Robust trend baseline** on noisy or thinly-traded instruments.
2. **Spike-resistant filter** ahead of a signal that would otherwise fire on a
   single bad tick.
3. **Comparison against the SMA** — a large MedianMA−SMA gap flags that the
   window contains outliers.

## Common pitfalls

- **Stair-stepping.** Because the output can only take values that appear in (or
  the average of two that appear in) the window, the line moves in discrete
  steps rather than smoothly. That is expected for a median.
- **Even periods average two ranks.** A `period = 4` median is the mean of the
  2nd and 3rd order statistics, so it is not itself a value from the window. Use
  an odd period if you want the output to always be an actual observed price.

## References

The running median is a classical robust-statistics smoother; its application as
a moving average is standard in signal processing and technical analysis.

## See also

- [Indicator-Sma](/Indicators/Indicator-Sma) — the sum-based mean the median MA is robust against.
- [Indicator-MedianPrice](/Indicators/Indicator-MedianPrice) — `(high + low) / 2`, a different "median".
- [Indicator-MedianAbsoluteDeviation](/Indicators/Indicator-MedianAbsoluteDeviation) — robust dispersion companion.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
