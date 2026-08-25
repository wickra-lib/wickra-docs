# QuartileBands

> A non-parametric envelope drawn at the rolling 25th / 50th / 75th
> percentiles — order statistics instead of mean ± sigma.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Bands & Channels |
| Input type | `f64` |
| Output type | `QuartileBandsOutput { upper, middle, lower }` |
| Output range | unbounded; `lower ≤ middle ≤ upper` |
| Default parameters | `period = 20` |
| Warmup period | `period` (exact — first emission on bar `period`) |
| Interpretation | Robust distribution band: the inter-quartile span (`upper − lower`) is the rolling IQR; the middle is the median. |

## Formula

```
lower  = Q1 = 25th percentile of the last `period` values
middle = Q2 = 50th percentile (median)
upper  = Q3 = 75th percentile
```

Quantiles use the type-7 (NumPy / `R-7`) linear interpolation shared with
[RollingQuantile](/Indicators/Indicator-RollingQuantile):
`h = (period−1)·q`, then interpolate between the bracketing order statistics.
Where Bollinger Bands assume an approximately normal distribution and size the
envelope by mean and standard deviation, Quartile Bands are fully
**non-parametric** — a single outlier shifts at most one rank rather than
inflating the whole width, and the span between the bands is exactly the
[RollingIqr](/Indicators/Indicator-RollingIqr). Source:
`crates/wickra-core/src/indicators/quartile_bands.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Source |
|----------|---------|---------|------------|--------|
| `period` | `usize` | `20`    | `>= 1`     | `QuartileBands::new` (`quartile_bands.rs:61`) |

`period == 0` returns [`Error::PeriodZero`]. Python defaults come from
`#[pyo3(signature = (period=20))]`; the Node constructor takes the period
explicitly.

## Inputs / Outputs

```rust
use wickra::{Indicator, QuartileBands, QuartileBandsOutput};
// QuartileBands: Input = f64, Output = QuartileBandsOutput
const _: fn(&mut QuartileBands, f64) -> Option<QuartileBandsOutput> =
    <QuartileBands as Indicator>::update;
```

- **Python streaming.** `update(value)` returns `(upper, middle, lower)` or `None`.
- **Python batch.** `QuartileBands.batch(prices)` returns an `(n, 3)`
  `Matrix` with columns `[upper, middle, lower]`; warmup rows are `NaN`.
- **Node streaming.** `update(value)` returns a `{ upper, middle, lower }`
  object or `null`.
- **Node batch.** `batch(prices)` returns a flat `Array<number>` of length
  `n * 3` interleaved per row `[u0, m0, l0, …]`.

## Warmup

`warmup_period()` reports `period` and the figure is exact: the window must be
full before any quantile is defined, so the first non-`None` output lands on
bar `period`. Pinned by `warms_up_then_emits` (three `None`s then `Some` for
`period = 4`).

## Edge cases

- **Outlier robustness.** A single spike moves the median by at most one rank;
  pinned by `median_robust_to_outlier` (window `[1,2,3,4,1000]` → median `3`).
- **Ordering.** `upper ≥ middle ≥ lower` always holds because `Q3 ≥ Q2 ≥ Q1`
  for any sorted window.
- **`period == 1`.** Every quantile collapses onto the single value, so
  `upper == middle == lower` (the `n == 1` branch of the shared
  `quantile_sorted` helper).
- **Reset.** `reset()` clears the window and scratch buffer; the next `update`
  restarts warmup (test `reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, QuartileBands};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut qb = QuartileBands::new(4)?;
    for v in qb.batch(&[40.0, 30.0, 20.0, 10.0]) {
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
Some(QuartileBandsOutput { upper: 32.5, middle: 25.0, lower: 17.5 })
```

For the sorted window `[10, 20, 30, 40]`: `Q1 = 10 + 0.75·10 = 17.5`,
`Q2 = 20 + 0.5·10 = 25`, `Q3 = 30 + 0.25·10 = 32.5`. This matches the
`known_quartiles` test.

### Python

```python
import numpy as np
import wickra as ta

qb = ta.QuartileBands(4)
print(qb.batch(np.array([40.0, 30.0, 20.0, 10.0])))
```

Output:

```
[[ nan  nan  nan]
 [ nan  nan  nan]
 [ nan  nan  nan]
 [32.5 25.  17.5]]
```

### Node

```javascript
const ta = require('wickra');
const qb = new ta.QuartileBands(4);
qb.update(40); qb.update(30); qb.update(20);
console.log(qb.update(10)); // { upper: 32.5, middle: 25, lower: 17.5 }
```

## Interpretation

Quartile Bands describe the recent price *distribution* rather than its
spread around a mean:

1. **Robust mean reversion.** A close above `Q3` (upper) or below `Q1` (lower)
   sits in the top/bottom quarter of the recent window — a distribution-aware
   stretch signal that ignores how fat the tails are.
2. **Regime width.** A widening `upper − lower` (the rolling IQR) marks an
   expanding trading range; a narrowing one a contraction, without the
   sigma sensitivity of Bollinger bandwidth.

Prefer Quartile Bands over [BollingerBands](/Indicators/Indicator-BollingerBands)
on noisy, gap-prone, or fat-tailed series where a sigma estimate overreacts to
single bars.

## Common pitfalls

- **Comparing widths to Bollinger.** The IQR span is not a sigma multiple;
  `upper − lower` here is the middle-50% range, not `±0.674σ` unless the data
  is normal.
- **Tiny windows.** With `period < 4` the quartiles interpolate aggressively
  between very few points; use `period ≥ 10` for a stable distribution.

## References

- Tukey, J. W., *Exploratory Data Analysis*, Addison-Wesley, 1977 (quartiles
  and the five-number summary).

## See also

- [RollingQuantile](/Indicators/Indicator-RollingQuantile) — a single configurable percentile.
- [RollingIqr](/Indicators/Indicator-RollingIqr) — the `upper − lower` span on its own.
- [BollingerBands](/Indicators/Indicator-BollingerBands) — parametric mean ± sigma envelope.
- [MedianChannel](/Indicators/Indicator-MedianChannel) — robust median ± MAD envelope.
