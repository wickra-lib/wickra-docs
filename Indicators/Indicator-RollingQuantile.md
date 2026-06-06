# RollingQuantile

> The interpolated `quantile`-th quantile of the last `period` values (type-7 /
> NumPy-default definition).

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Statistics |
| Input type | `f64` |
| Output type | `f64` |
| Output range | within `[min, max]` of the window |
| Default parameters | `period` and `quantile ∈ [0, 1]` are required |
| Warmup period | `period` |
| Interpretation | `quantile = 0.5` is the rolling median; `0.0`/`1.0` are the window min/max. |

## Formula

```
h        = (period − 1) · quantile
lower    = ⌊h⌋
result   = sorted[lower] + (h − lower) · (sorted[lower + 1] − sorted[lower])
```

This is the type-7 / NumPy-default `quantile`: it interpolates linearly between
the bracketing order statistics, so `quantile = 0.0` returns the window minimum,
`0.5` the median, `1.0` the maximum. Each `update` copies the window into a
scratch buffer and sorts it (NaN-safe total ordering).

Source: `crates/wickra-core/src/indicators/rolling_quantile.rs`.

## Parameters

| Name       | Type    | Default | Valid range  | Source | Description |
|------------|---------|---------|--------------|--------|-------------|
| `period`   | `usize` | none    | `>= 1`       | `rolling_quantile.rs:56` | Window length. `0` errors with `Error::PeriodZero`. |
| `quantile` | `f64`   | none    | `[0.0, 1.0]` finite | `rolling_quantile.rs:56` | Order statistic to select. Out-of-range / NaN errors with `Error::InvalidParameter`. |

(The Python class is `wickra.RollingQuantile(period=20, quantile=0.5)`.)

## Inputs / Outputs

From `crates/wickra-core/src/indicators/rolling_quantile.rs`:

```rust
use wickra::{Indicator, RollingQuantile};
// RollingQuantile: Input = f64, Output = f64
const _: fn(&mut RollingQuantile, f64) -> Option<f64> =
    <RollingQuantile as Indicator>::update;
```

Python streams as `float | None`, batches as a 1-D `numpy.ndarray`. Node streams
as `number | null`, batches as `Array<number>`.

## Warmup

`warmup_period() == period`: the first value is emitted once the window is full.
The unit test `accessors_and_metadata` pins `warmup_period() == 14` for
`period = 14`.

## Edge cases

- **Median.** For a full window, `quantile = 0.5` returns the median; the unit
  test `median_of_window` pins it (`[5,1,3,2,4] → 3`).
- **Min / max.** `quantile = 0.0`/`1.0` return the window extremes; pinned by
  `min_and_max_quantiles`.
- **Interpolation.** For `sorted = [10,20,30,40]`, `quantile = 0.25` gives
  `17.5`; pinned by `interpolated_quantile`.
- **Single-period window.** `period = 1` returns the only value verbatim; pinned
  by `single_period_returns_value`.
- **Reset.** `reset()` clears the window and scratch buffer.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, RollingQuantile};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut q = RollingQuantile::new(5, 0.5)?;
    let out: Vec<Option<f64>> = q.batch(&[5.0, 1.0, 3.0, 2.0, 4.0]);
    println!("{:?}", out);
    Ok(())
}
```

Output:

```
[None, None, None, None, Some(3.0)]
```

The sorted window `[1,2,3,4,5]` has median `3`.

### Python

```python
import wickra as ta

q = ta.RollingQuantile(5, 0.5)
for x in [5.0, 1.0, 3.0, 2.0, 4.0]:
    print(x, '->', q.update(x))
```

Output:

```
5.0 -> None
1.0 -> None
3.0 -> None
2.0 -> None
4.0 -> 3.0
```

### Node

```javascript
const ta = require('wickra');
const q = new ta.RollingQuantile(5, 0.5);
for (const x of [5, 1, 3, 2, 4]) console.log(x, '->', q.update(x));
```

Output:

```
5 -> null
1 -> null
3 -> null
2 -> null
4 -> 3
```

## Interpretation

Rolling quantiles turn any series into distribution-aware thresholds: a price
above its rolling 90th percentile is stretched; volatility split at the
25th/75th percentiles defines regimes (this is the building block of
[RegimeLabel](/Indicators/Indicator-RegimeLabel)); robust band edges ignore the tails. The
median (`quantile = 0.5`) is a robust alternative to a moving average.

## Common pitfalls

- **Cost.** Each `update` sorts the window (`O(period log period)`). For very
  large periods on hot paths this is heavier than a running mean — keep the
  window modest.
- **Quantile vs percentile.** `quantile` here is a fraction in `[0, 1]`, not a
  percentile in `[0, 100]`. Pass `0.9`, not `90`.

## References

The type-7 linear-interpolation definition is the default in NumPy
(`numpy.quantile`) and Hyndman & Fan (1996), method 7.

## See also

- [Indicator-RollingIqr](/Indicators/Indicator-RollingIqr) — `Q3 − Q1` built on the same quantiles.
- [Indicator-MedianAbsoluteDeviation](/Indicators/Indicator-MedianAbsoluteDeviation) — robust dispersion.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
