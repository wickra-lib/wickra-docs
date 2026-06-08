# MedianChannel

> A robust analogue of Bollinger Bands: centre on the rolling median, size by
> the median absolute deviation (MAD). 50% breakdown point — outliers barely
> move it.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Bands & Channels |
| Input type | `f64` |
| Output type | `MedianChannelOutput { upper, middle, lower }` |
| Output range | unbounded; `lower ≤ middle ≤ upper` |
| Default parameters | `period = 20`, `multiplier = 2.0` |
| Warmup period | `period` (exact — first emission on bar `period`) |
| Interpretation | Robust Bollinger: median centreline, MAD-scaled width — unmoved by spikes and gaps. |

## Formula

```
middle = median(close, period)
MAD    = median( | close_i − middle | )
upper  = middle + multiplier · MAD
lower  = middle − multiplier · MAD
```

Where [BollingerBands](/Indicators/Indicator-BollingerBands) centre on the mean
and scale by the standard deviation — both of which a single spike can drag
arbitrarily far — the Median Channel uses two order statistics. The breakdown
point of the median and MAD is 50%: up to half the window can be contaminated
before the centre or width is materially distorted. Both quantiles use the
type-7 interpolation shared with
[RollingQuantile](/Indicators/Indicator-RollingQuantile). Source:
`crates/wickra-core/src/indicators/median_channel.rs`.

## Parameters

| Name         | Type    | Default | Constraint    | Source |
|--------------|---------|---------|---------------|--------|
| `period`     | `usize` | `20`    | `>= 1`        | `MedianChannel::new` (`median_channel.rs:67`) |
| `multiplier` | `f64`   | `2.0`   | finite, `> 0` | `median_channel.rs:67` |

`period == 0` returns [`Error::PeriodZero`]; a non-finite or non-positive
`multiplier` returns [`Error::NonPositiveMultiplier`]. Python defaults come from
`#[pyo3(signature = (period=20, multiplier=2.0))]`; the Node constructor takes
both arguments explicitly.

## Inputs / Outputs

```rust
use wickra::{Indicator, MedianChannel, MedianChannelOutput};
// MedianChannel: Input = f64, Output = MedianChannelOutput
const _: fn(&mut MedianChannel, f64) -> Option<MedianChannelOutput> =
    <MedianChannel as Indicator>::update;
```

- **Python streaming.** `update(value)` returns `(upper, middle, lower)` or `None`.
- **Python batch.** `MedianChannel.batch(prices)` returns an `(n, 3)`
  `np.ndarray` with columns `[upper, middle, lower]`; warmup rows are `NaN`.
- **Node streaming.** `update(value)` returns a `{ upper, middle, lower }`
  object or `null`.
- **Node batch.** `batch(prices)` returns a flat `Array<number>` of length
  `n * 3` interleaved per row `[u0, m0, l0, …]`.

## Warmup

`warmup_period()` reports `period` and is exact: both the median and the MAD
need a full window, so the first non-`None` output lands on bar `period`.
Pinned by `warms_up_then_emits` (four `None`s then `Some` for `period = 5`).

## Edge cases

- **Outlier robustness.** A single huge spike leaves the median centre
  unchanged; pinned by `robust_to_outlier` (window `[1,2,3,4,1000]` → median
  `3`).
- **Flat / low-dispersion window.** When more than half the window shares the
  median value `MAD = 0`, collapsing the channel to `upper == middle == lower`.
- **Ordering.** `upper ≥ middle ≥ lower` always holds because `MAD ≥ 0` and
  `multiplier > 0`.
- **Reset.** `reset()` clears the window and both scratch buffers; the next
  `update` restarts warmup (test `reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, MedianChannel};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut mc = MedianChannel::new(5, 2.0)?;
    for v in mc.batch(&[1.0, 2.0, 3.0, 4.0, 5.0]) {
        println!("{:?}", v);
    }
    Ok(())
}
```

Output:

```
None
None
None
None
Some(MedianChannelOutput { upper: 5.0, middle: 3.0, lower: 1.0 })
```

For `[1,2,3,4,5]` the median is `3`; the absolute deviations sorted are
`[0,1,1,2,2]` so `MAD = 1`; with `multiplier = 2` the bands sit at `3 ± 2`.
This matches the `known_channel` test.

### Python

```python
import numpy as np
import wickra as ta

mc = ta.MedianChannel(5, 2.0)
print(mc.batch(np.array([1.0, 2.0, 3.0, 4.0, 5.0])))
```

Output:

```
[[nan nan nan]
 [nan nan nan]
 [nan nan nan]
 [nan nan nan]
 [ 5.  3.  1.]]
```

### Node

```javascript
const ta = require('wickra');
const mc = new ta.MedianChannel(5, 2.0);
for (const v of [1, 2, 3, 4]) mc.update(v);
console.log(mc.update(5)); // { upper: 5, middle: 3, lower: 1 }
```

## Interpretation

The Median Channel is the tool to reach for when the data is too noisy for
Bollinger Bands:

1. **Robust mean reversion.** The median centreline is unmoved by gaps and
   flash spikes, so band tags reflect genuine excursions rather than one bad
   print dragging the mean.
2. **Stable width.** MAD ignores the magnitude of outliers beyond their rank,
   so the channel does not flare after a single large bar the way a
   sigma-scaled band does.

## Common pitfalls

- **Treating `multiplier` as a sigma count.** It scales the MAD, not the
  standard deviation; for normal data `MAD ≈ 0.674σ`, so a `multiplier` of `2`
  here is roughly a `1.35σ` Bollinger band, not `2σ`.
- **Very short windows.** With a small `period` the MAD is computed from few
  deviations and can be `0` whenever the median value repeats; use
  `period ≥ 10` for a stable width.

## References

- Rousseeuw, P. J., & Croux, C., "Alternatives to the Median Absolute
  Deviation," *Journal of the American Statistical Association*, 1993.

## See also

- [BollingerBands](/Indicators/Indicator-BollingerBands) — mean ± sigma (non-robust) envelope.
- [QuartileBands](/Indicators/Indicator-QuartileBands) — non-parametric quartile envelope.
- [RollingQuantile](/Indicators/Indicator-RollingQuantile) — the shared type-7 quantile engine.
- [MedianAbsoluteDeviation](/Indicators/Indicator-MedianAbsoluteDeviation) — the MAD statistic on its own.
