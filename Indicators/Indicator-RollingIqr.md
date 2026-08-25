# RollingIqr

> The interquartile range `Q3 − Q1` of the last `period` values — a robust
> dispersion measure that ignores the tails.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Statistics |
| Input type | `f64` |
| Output type | `f64` |
| Output range | `>= 0` |
| Default parameters | `period` is required |
| Warmup period | `period` |
| Interpretation | Width of the central 50% of the window; a robust alternative to standard deviation. |

## Formula

```
IQR = quantile(0.75) − quantile(0.25)
```

Both quartiles use the type-7 / NumPy-default linearly-interpolated definition,
identical to [RollingQuantile](/Indicators/Indicator-RollingQuantile). The IQR is the spread
of the central half of the window: unlike the standard deviation it ignores the
extreme tails entirely, so a single spike barely moves it.

Source: `crates/wickra-core/src/indicators/rolling_iqr.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= 1`      | `rolling_iqr.rs:50` | Window length. `0` errors with `Error::PeriodZero`. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/rolling_iqr.rs`:

```rust
use wickra::{Indicator, RollingIqr};
// RollingIqr: Input = f64, Output = f64
const _: fn(&mut RollingIqr, f64) -> Option<f64> = <RollingIqr as Indicator>::update;
```

Python streams as `float | None`, batches as an `array.array('d')`. Node streams
as `number | null`, batches as `Array<number>`.

## Warmup

`warmup_period() == period`. The unit test `accessors_and_metadata` pins
`warmup_period() == 14` for `period = 14`.

## Edge cases

- **Reference value.** For `[50,40,30,20,10]` (period 5), `Q1 = 20`, `Q3 = 40`,
  so `IQR = 20`; pinned by `reference_value`.
- **Constant series.** A flat window has zero spread, so `IQR = 0`; pinned by
  `constant_series_yields_zero`.
- **Outlier robustness.** 19 tight values plus one huge spike keep `IQR` small
  (the spike lands outside the central 50%); pinned by
  `ignores_single_extreme_outlier`.
- **Non-negativity.** `Q3 >= Q1`, so the output is always `>= 0`; pinned by
  `output_is_non_negative`.
- **Reset.** `reset()` clears the window and scratch buffer.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, RollingIqr};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut iqr = RollingIqr::new(5)?;
    let out: Vec<Option<f64>> = iqr.batch(&[50.0, 40.0, 30.0, 20.0, 10.0]);
    println!("{:?}", out);
    Ok(())
}
```

Output:

```
[None, None, None, None, Some(20.0)]
```

### Python

```python
import wickra as ta

iqr = ta.RollingIqr(5)
for x in [50.0, 40.0, 30.0, 20.0, 10.0]:
    print(x, '->', iqr.update(x))
```

Output:

```
50.0 -> None
40.0 -> None
30.0 -> None
20.0 -> None
10.0 -> 20.0
```

### Node

```javascript
const ta = require('wickra');
const iqr = new ta.RollingIqr(5);
for (const x of [50, 40, 30, 20, 10]) console.log(x, '->', iqr.update(x));
```

Output:

```
50 -> null
40 -> null
30 -> null
20 -> null
10 -> 20
```

## Interpretation

The IQR is the natural scale for outlier rules (the classic *Tukey fence* flags
points more than `1.5 · IQR` beyond a quartile) and for volatility-regime splits
that must not be dominated by one shock. Where the standard deviation is pulled
around by tails, the IQR reports the spread of the typical middle of the
distribution.

## Common pitfalls

- **Expecting it to track standard deviation.** For heavy-tailed series the IQR
  is deliberately *smaller* and steadier than `StdDev` — that is the point.
  Convert with `σ ≈ IQR / 1.349` only under a Gaussian assumption.
- **Cost.** Each `update` sorts the window (`O(period log period)`).

## References

Tukey, *Exploratory Data Analysis* (1977), for the IQR and the `1.5 · IQR`
fence; the type-7 quartile definition follows Hyndman & Fan (1996).

## See also

- [Indicator-RollingQuantile](/Indicators/Indicator-RollingQuantile) — the quartiles this differences.
- [Indicator-StdDev](/Indicators/Indicator-StdDev) — non-robust dispersion.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
