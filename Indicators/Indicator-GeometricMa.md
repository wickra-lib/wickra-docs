# GMA

> Geometric Moving Average — the rolling geometric mean of the last `period`
> prices, the natural average for compounding (multiplicative) quantities.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Moving Averages |
| Input type | `f64` (single price, strictly positive) |
| Output type | `f64` |
| Output range | `(0, ∞)`; tracks the input price scale, always ≤ the arithmetic mean |
| Default parameters | `period` is required (no default in either binding) |
| Warmup period (`warmup_period()`) | `period` — first emission lands on input `period` |
| Interpretation | Compounding-aware average; symmetric to percentage moves. |

## Formula

```
GMA = (Π value_i)^(1/period) = exp( (1/period) · Σ ln(value_i) )
```

The geometric mean averages in **log space**, which is the correct way to
average growth factors: a `+10%` move followed by a `−10%` move leaves you below
where you started, and the GMA reflects that asymmetry where an arithmetic mean
would not. By the AM–GM inequality the geometric mean is always less than or
equal to the arithmetic mean of the same window, with equality only when every
value is identical.

The implementation keeps a running sum of natural logs and slides it in O(1):
add the newcomer's `ln`, subtract the departing value's `ln`, and exponentiate
the windowed average. Source:
`crates/wickra-core/src/indicators/geometric_ma.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= 1`      | `geometric_ma.rs:59` | Window length. `period = 0` errors with `Error::PeriodZero`. `period = 1` is a pass-through (`exp(ln x) = x`). |

(Python class `wickra.GMA(period)` has no `#[pyo3(signature)]` default; pass
`period` explicitly.)

## Inputs / Outputs

From `crates/wickra-core/src/indicators/geometric_ma.rs`:

```rust
use wickra::{Indicator, GeometricMa};
// GeometricMa: Input = f64, Output = f64
const _: fn(&mut GeometricMa, f64) -> Option<f64> =
    <GeometricMa as Indicator>::update;
```

Python returns `float | None` (streaming) / `numpy.ndarray` (batch, `NaN` for
warmup). Node returns `number | null` / `Array<number>` with `NaN`.

## Warmup

`warmup_period()` returns `period`: the window must hold `period` strictly
positive values before the geometric mean is defined, so the first non-`None`
output lands on input `period` (index `period − 1`). Pinned by
`accessors_and_metadata` (`warmup_period() == 7` for `GeometricMa::new(7)`) and
by `warmup_returns_none`, which checks the first two inputs of a GMA(3) are
`None` and the third returns the cube root of the product.

## Edge cases

- **Strictly positive inputs only.** The geometric mean is undefined for
  non-positive values. A non-finite **or** non-positive input is ignored — the
  window is left unchanged and the current value is returned. Pinned by
  `ignores_non_finite_and_non_positive_input`, which feeds `NaN`, `0.0`, and
  `-3.0` and asserts the value is unchanged.
- **Constant series.** `[42.0; n]` returns `Some(42.0)` once warm — pinned by
  `constant_series_returns_the_constant`.
- **Below the arithmetic mean.** `below_or_equal_arithmetic_mean` pins that on a
  dispersed window the geometric mean is strictly less than the arithmetic mean.
- **`period = 1` pass-through.** Pinned by `period_one_is_pass_through`.
- **Reset.** `gma.reset()` clears the log window and the running sum — pinned by
  `reset_clears_state`.
- **Equivalence to a from-scratch product.** `matches_naive_over_inputs` and the
  `proptest_matches_naive` property test compare the incremental log-sum against
  an explicit `(Π window)^(1/period)` recomputation.

## Examples

### Rust

```rust
use wickra::{BatchExt, GeometricMa, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut gma = GeometricMa::new(3)?;
    let prices = [1.0, 2.0, 4.0, 8.0, 16.0, 32.0];
    let out: Vec<Option<f64>> = gma.batch(&prices);
    println!("warmup_period = {}", gma.warmup_period());
    println!("{:?}", out);
    Ok(())
}
```

Output:

```
warmup_period = 3
[None, None, Some(2.0), Some(4.0), Some(8.0), Some(16.0)]
```

On a doubling series each window is a geometric progression, so the geometric
mean is the centre value: `GMA(3)` of `[1,2,4] = ∛8 = 2`, of `[2,4,8] = ∛64 = 4`,
and so on.

### Python

```python
import numpy as np
import wickra as ta

gma = ta.GMA(3)
out = gma.batch(np.array([1.0, 2.0, 4.0, 8.0, 16.0, 32.0]))
print("warmup_period =", gma.warmup_period())
print(out)
```

Output:

```
warmup_period = 3
[nan nan  2.  4.  8. 16.]
```

### Node

```javascript
const ta = require('wickra');
const gma = new ta.GMA(3);
console.log(gma.batch([1, 2, 4, 8, 16, 32]));
console.log('warmupPeriod:', gma.warmupPeriod());
```

Output:

```
[ NaN, NaN, 2, 4, 8, 16 ]
warmupPeriod: 3
```

### Streaming

```rust
use wickra::{GeometricMa, Indicator};

let mut gma = GeometricMa::new(2)?;
for price in [4.0, 9.0, 16.0] {
    if let Some(v) = gma.update(price) {
        println!("{v:.4}");
    }
}
# Ok::<(), Box<dyn std::error::Error>>(())
```

Output (`√(4·9) = 6`, then `√(9·16) = 12`):

```
6.0000
12.0000
```

## Interpretation

The GMA is the right average whenever the quantity you are smoothing compounds —
prices, equity curves, growth factors, volatility ratios. Two properties matter:

1. **Symmetry to percentage moves.** Because it averages logs, equal-magnitude
   up and down *percentage* moves cancel correctly; an arithmetic mean over the
   raw prices does not.
2. **Outlier dampening on the upside.** A single large spike lifts the geometric
   mean far less than the arithmetic mean, because logs compress large values.

In practice the GMA plots just below an [`Sma`](/Indicators/Indicator-Sma) of the same
period, with the gap widening as the window becomes more dispersed (more
volatile). It is most useful on ratio/return series and long-horizon price
smoothing where the multiplicative interpretation is the correct one.

## Common pitfalls

- **Feeding returns that can be ≤ 0.** The GMA needs strictly positive inputs.
  If you are averaging *returns*, convert them to growth factors (`1 + r`)
  first; raw negative returns are silently skipped.
- **Confusing it with the arithmetic SMA.** The two agree only on a constant
  series. On anything dispersed the GMA is lower; do not expect them to overlay.

## References

The geometric mean is a classical statistic (Pythagorean means); its use as a
moving average for compounding price/return series is standard in quantitative
finance.

## See also

- [Indicator-Sma](/Indicators/Indicator-Sma) — the arithmetic counterpart; GMA ≤ SMA always.
- [Indicator-LogReturn](/Indicators/Indicator-LogReturn) — log-space transform the GMA is built on.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
