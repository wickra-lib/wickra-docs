# LinRegIntercept

> Linear Regression Intercept (`LINEARREG_INTERCEPT`) — the intercept `a` of the
> rolling least-squares fit `y = a + b·x` over the last `period` inputs.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Statistics |
| Input type | `f64` (single close) |
| Output type | `f64` |
| Output range | unbounded (price scale) |
| Default parameters | `period` is required |
| Warmup period | `period` |
| Interpretation | The fitted trend line's value at the **start** of the window — where the regression says the series began. |

## Formula

Over the last `period` inputs, indexed `x = 0, 1, …, period − 1`, fit
`y = a + b·x` by ordinary least squares:

```
b (slope)     = (n·Σxy − Σx·Σy) / (n·Σxx − (Σx)²)
a (intercept) = (Σy − b·Σx) / n
```

`LinRegIntercept` reports `a` — the fitted line at `x = 0`, the oldest point in
the window. Where [`LinearRegression`](/Indicators/Indicator-LinearRegression) evaluates the
fit at the most recent bar (`a + b·(period − 1)`), this reports its value at the
window's start. Because the `x` values are fixed, `Σx` and `Σxx` are constants
and each update is O(1) over a sliding window. See
`crates/wickra-core/src/indicators/linreg_intercept.rs`.

## Parameters

| Name | Type | Default | Valid range | Description | Source |
|------|------|---------|-------------|-------------|--------|
| `period` | `usize` | none | `>= 2` | Regression window length. `period < 2` errors with `Error::InvalidPeriod` (a line needs at least two points). | `linreg_intercept.rs:51` |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/linreg_intercept.rs`:

```rust
use wickra::{Indicator, LinRegIntercept};
// LinRegIntercept: Input = f64, Output = f64
const _: fn(&mut LinRegIntercept, f64) -> Option<f64> = <LinRegIntercept as Indicator>::update;
```

Python streams as `float | None`, batches as a 1-D `numpy.ndarray` (`NaN` for
warmup). Node streams as `number | null`, batches as `Array<number>` with `NaN`
placeholders.

## Warmup

`LinRegIntercept::new(period).warmup_period() == period`. The first value is
emitted once `period` points fill the window. The unit tests
`accessors_report_config` and `reference_value` (which asserts `out[0]` and
`out[1]` are `None` for `period = 3`) pin this.

## Edge cases

- **Exact fit on a straight line.** For collinear inputs the regression is exact
  and the intercept is the line's `y` at `x = 0`. The unit test
  `slides_and_tracks_a_shifted_line` pins this (window `[10, 12, 14]` →
  `y = 10 + 2x`, intercept `10`).
- **Short period.** `LinRegIntercept::new(1)` returns `Err(Error::InvalidPeriod)`.
  The unit test `rejects_short_period` pins this.
- **Reset.** `lr.reset()` clears the window and the running sums. The unit test
  `reset_clears_state` pins this.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, LinRegIntercept};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut lr = LinRegIntercept::new(3)?;
    let out: Vec<Option<f64>> = lr.batch(&[1.0, 2.0, 9.0]);
    println!("{:?}", out);
    Ok(())
}
```

Output:

```
[None, None, Some(0.0)]
```

Period 3 over `[1, 2, 9]`: the least-squares fit is `y = 0 + 4x`, so the
intercept at `x = 0` is `0.0`. This matches the `reference_value` unit test in
`crates/wickra-core/src/indicators/linreg_intercept.rs`.

### Python

```python
import numpy as np
import wickra as ta

lr = ta.LinRegIntercept(3)
print(lr.batch(np.array([1.0, 2.0, 9.0])))
```

Output:

```
[nan nan  0.]
```

### Node

```javascript
const ta = require('wickra');
const lr = new ta.LinRegIntercept(3);
for (const x of [1, 2, 9]) console.log(x, '->', lr.update(x));
```

Output:

```
1 -> null
2 -> null
9 -> 0
```

## Interpretation

`LinRegIntercept` answers "given the recent trend, where did the window start?"
Together with [`LinRegSlope`](/Indicators/Indicator-LinRegSlope) it fully describes the
fitted line: `intercept` is the anchor at `x = 0`, `slope` is the per-bar drift.
Comparing the intercept to the current price shows how far price has travelled
from the regression's starting point over the window. It is most useful as a
component of regression channels and as a feature, rather than a standalone
signal.

Prefer [`LinearRegression`](/Indicators/Indicator-LinearRegression) when you want the fitted
value at the current bar, and [`Tsf`](/Indicators/Indicator-Tsf) when you want it projected
one bar ahead.

## Common pitfalls

- **Reading it as a current level.** The intercept is anchored at the **oldest**
  bar of the window (`x = 0`), not the latest; on a trending series it can sit
  far from the current price by design.
- **Period `< 2`.** A regression line is undefined for a single point — the
  constructor rejects it rather than returning a degenerate value.

## References

The Linear Regression Intercept is TA-Lib's `LINEARREG_INTERCEPT` function; the
closed-form OLS coefficients are standard least-squares results.

## See also

- [Indicator-LinearRegression](/Indicators/Indicator-LinearRegression) — the fit at the current bar.
- [Indicator-LinRegSlope](/Indicators/Indicator-LinRegSlope) — the slope `b`.
- [Indicator-Tsf](/Indicators/Indicator-Tsf) — the fit projected one bar ahead.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
