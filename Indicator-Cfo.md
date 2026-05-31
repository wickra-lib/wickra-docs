# CFO

> Chande Forecast Oscillator — the percentage difference between the
> close and the endpoint of an `n`-bar linear-regression forecast of the
> close.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Oscillators |
| Input type | `f64` (single close) |
| Output type | `f64` (percent) |
| Output range | unbounded around zero (in percent) |
| Default parameters | `period = 14` |
| Warmup period | `period` (exact) |
| Interpretation | Positive: close above the linear forecast (overshoot). Negative: below (undershoot). |

## Formula

```
CFO_t = 100 · (close_t − LinearRegression(close, period)_t) / close_t
```

The `LinearRegression` term is the OLS endpoint forecast of the close over
the last `period` bars. A positive CFO means price has run *ahead* of its
own trend forecast; a negative CFO means it lags. For a constant or
perfectly linear input the regression fits exactly and CFO is `0`.

## Parameters

| Name     | Type    | Default | Constraint | Source |
|----------|---------|---------|------------|--------|
| `period` | `usize` | `14`    | `>= 1`     | `Cfo::new` (`cfo.rs:41`) |

`period == 0` returns [`Error::PeriodZero`]. Python default comes from
`#[pyo3(signature = (period=14))]`; the Node constructor takes `period`
explicitly. The public class is `CFO` in both bindings.

## Inputs / Outputs

```rust
impl Indicator for Cfo {
    type Input  = f64;
    type Output = f64;
    fn update(&mut self, input: f64) -> Option<f64>;
}
```

A single `f64` close in, an `Option<f64>` out (a percentage). Python maps
this to `float | None` / a `float64` `np.ndarray` with `NaN` warmup; Node to
`number | null` / `Array<number>` with `NaN` warmup.

## Warmup

`warmup_period()` returns `period`. CFO wraps a
[LinearRegression](Indicator-LinearRegression) of the same period, which
emits its first endpoint on input `period` (index `period − 1`); CFO emits
on that bar. Pinned by `warmup_emits_first_value_at_period` (period 3:
inputs 1–2 return `None`, input 3 emits).

## Edge cases

- **Constant series.** The regression of a flat line equals the constant,
  so `close − forecast = 0` ⇒ CFO `= 0` (test `constant_series_yields_zero`).
- **Perfectly linear series.** The fit is exact, the close lands on the
  forecast, CFO `= 0` (test `perfect_linear_series_yields_zero`).
- **Zero close.** The percentage form divides by `close`; on a zero close
  the indicator holds its previous value rather than emitting infinity
  (test `zero_close_holds_value`).
- **Reset.** `reset()` clears the regression and the held value.

## Examples

### Rust

```rust
use wickra::{BatchExt, Cfo, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Perfectly linear input → CFO is 0 once warm.
    let prices: Vec<f64> = (1..=20).map(|i| f64::from(i) * 2.0).collect();
    let mut cfo = Cfo::new(5)?;
    println!("{:?}", cfo.batch(&prices).into_iter().flatten().last()); // Some(0.0)
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

cfo = ta.CFO(14)
out = cfo.batch(np.array([...], dtype=float))  # 1-D percent series, NaN warmup
```

### Node

```javascript
const ta = require('wickra');
const cfo = new ta.CFO(14);
const out = cfo.update(101.5); // null during warmup, else a percent reading
```

## Interpretation

CFO measures how far price has strayed from its own short-term trend
forecast, in percent:

1. **Overshoot / reversion.** Large positive readings mark price running
   ahead of trend — a pullback candidate; large negative readings the
   reverse. Chande used band crossings (e.g. ±3 %) as fade triggers.
2. **Trend confirmation.** Persistent same-sign readings confirm the trend
   is intact; a flip through zero warns the close has crossed its forecast.

Because the output is a *percentage*, CFO is directly comparable across
instruments at different price levels — unlike the price-unit
[Apo](Indicator-Apo).

## Common pitfalls

- **Feeding non-price series.** The division by `close` assumes a positive
  price; on a series that crosses zero the percentage form is ill-defined.
- **Confusing CFO with the forecast itself.** CFO is the *deviation* from
  the [LinearRegression](Indicator-LinearRegression) endpoint, not the
  endpoint — use `LinearRegression` directly if you want the forecast value.

## References

- Tushar Chande & Stanley Kroll, *The New Technical Trader*, Wiley, 1994.

## See also

- [LinearRegression](Indicator-LinearRegression) — the forecast CFO
  deviates from.
- [LinRegSlope](Indicator-LinRegSlope) — the trend slope.
- [Cmo](Indicator-Cmo) — Chande's momentum oscillator companion.
