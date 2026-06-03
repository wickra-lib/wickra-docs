# Tsf

> Time Series Forecast (`TSF`) — the rolling least-squares line projected one bar
> past the window, a trend-following one-step-ahead forecast.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Statistics |
| Input type | `f64` (single close) |
| Output type | `f64` |
| Output range | unbounded (price scale) |
| Default parameters | `period` is required |
| Warmup period | `period` |
| Interpretation | Where the recent linear trend projects the next bar to be. |

## Formula

Over the last `period` inputs, indexed `x = 0, 1, …, period − 1`, fit
`y = a + b·x` by ordinary least squares and evaluate it one step beyond the most
recent point (`x = period`):

```
b (slope)     = (n·Σxy − Σx·Σy) / (n·Σxx − (Σx)²)
a (intercept) = (Σy − b·Σx) / n
TSF           = a + b·period
```

Where [`LinearRegression`](Indicator-LinearRegression) evaluates the fit at the
current bar (`a + b·(period − 1)`), `TSF` advances it one further bar. The result
is a least-squares trend extrapolation — smoother and less laggy than a moving
average on a trending series. Each update is O(1) over a sliding window. See
`crates/wickra-core/src/indicators/tsf.rs`.

## Parameters

| Name | Type | Default | Valid range | Description | Source |
|------|------|---------|-------------|-------------|--------|
| `period` | `usize` | none | `>= 2` | Regression window length. `period < 2` errors with `Error::InvalidPeriod` (a line needs at least two points). | `tsf.rs:54` |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/tsf.rs`:

```rust
use wickra::{Indicator, Tsf};
// Tsf: Input = f64, Output = f64
const _: fn(&mut Tsf, f64) -> Option<f64> = <Tsf as Indicator>::update;
```

Python streams as `float | None`, batches as a 1-D `numpy.ndarray` (`NaN` for
warmup). Node streams as `number | null`, batches as `Array<number>` with `NaN`
placeholders.

## Warmup

`Tsf::new(period).warmup_period() == period`. The first value is emitted once
`period` points fill the window. The unit tests `accessors_report_config` and
`reference_value` (which asserts `out[0]` and `out[1]` are `None` for
`period = 3`) pin this.

## Edge cases

- **Exact extrapolation on a straight line.** For collinear inputs the forecast
  lands exactly on the line's next point. The unit test
  `forecasts_a_clean_line_one_step_ahead` pins this (window `[10, 12, 14]` →
  `y = 10 + 2x`, forecast at `x = 3` is `16`).
- **Short period.** `Tsf::new(1)` returns `Err(Error::InvalidPeriod)`. The unit
  test `rejects_short_period` pins this.
- **Reset.** `tsf.reset()` clears the window and the running sums. The unit test
  `reset_clears_state` pins this.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, Tsf};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut tsf = Tsf::new(3)?;
    let out: Vec<Option<f64>> = tsf.batch(&[1.0, 2.0, 9.0]);
    println!("{:?}", out);
    Ok(())
}
```

Output:

```
[None, None, Some(12.0)]
```

Period 3 over `[1, 2, 9]`: the least-squares fit is `y = 0 + 4x`, so the forecast
at `x = 3` is `0 + 4·3 = 12`. This matches the `reference_value` unit test in
`crates/wickra-core/src/indicators/tsf.rs`.

### Python

```python
import numpy as np
import wickra as ta

tsf = ta.Tsf(3)
print(tsf.batch(np.array([1.0, 2.0, 9.0])))
```

Output:

```
[nan nan 12.]
```

### Node

```javascript
const ta = require('wickra');
const tsf = new ta.Tsf(3);
for (const x of [1, 2, 9]) console.log(x, '->', tsf.update(x));
```

Output:

```
1 -> null
2 -> null
9 -> 12
```

## Interpretation

`TSF` is a regression-based forecast: it assumes the recent linear trend
continues for one more bar and reports where price would land. On a clean trend
it leads a moving average of the same length (it extrapolates rather than
averages), which makes `TSF`-vs-price and `TSF`-vs-`SMA` crossovers earlier
signals. The trade-off is the usual one for extrapolation: it overshoots at
turning points, where the linear assumption breaks.

`TSF` and [`LinearRegression`](Indicator-LinearRegression) differ only by one bar
of projection (`a + b·period` vs `a + b·(period − 1)`); choose `TSF` when you
explicitly want the next-bar forecast.

## Common pitfalls

- **Treating it as a guaranteed forecast.** `TSF` is a *linear extrapolation*,
  not a prediction — it will overshoot through reversals and lag nothing, so it
  is most reliable inside an established trend.
- **Period `< 2`.** A regression line is undefined for a single point — the
  constructor rejects it.

## References

The Time Series Forecast is TA-Lib's `TSF` function; it is the standard
one-step-ahead ordinary-least-squares projection used by Tushar Chande's
regression-based studies.

## See also

- [Indicator-LinearRegression](Indicator-LinearRegression) — the fit at the current bar.
- [Indicator-LinRegIntercept](Indicator-LinRegIntercept) — the fit at the window start.
- [Indicator-LinRegSlope](Indicator-LinRegSlope) — the per-bar slope.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
