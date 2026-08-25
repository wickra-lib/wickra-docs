# TsfOscillator

> Time Series Forecast Oscillator — the percentage gap between the close
> and the one-bar-ahead time-series forecast of the close.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Oscillators |
| Input type | `f64` (single close) |
| Output type | `f64` (percent) |
| Output range | unbounded around zero (in percent) |
| Default parameters | `period = 14` |
| Warmup period | `period` (exact) |
| Interpretation | Positive: close above its forward forecast (overshoot). Negative: below it. |

## Formula

```
TSFOsc_t = 100 · (close_t − TSF(close, period)_t) / close_t
```

The [Tsf](/Indicators/Indicator-Tsf) term is the OLS line fitted over the last `period`
bars, evaluated **one bar past** the window (`a + b·period`). Where
[Cfo](/Indicators/Indicator-Cfo) measures the same percentage gap against the regression
value at the *current* bar (`a + b·(period − 1)`), the TSF oscillator steps
one bar further. The two therefore differ by exactly the slope term
`100·b/close`: on a rising line the forward forecast sits above the close,
so the TSF oscillator reads *negative* while CFO reads `0`.

A positive reading means the close has run ahead of the projected trend; a
negative reading means the projection has stepped above the close. On a
flat series the slope is `0`, the forecast equals the close, and the
oscillator is `0`. Source: `crates/wickra-core/src/indicators/tsf_oscillator.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Source |
|----------|---------|---------|------------|--------|
| `period` | `usize` | `14`    | `>= 2`     | `TsfOscillator::new` (`tsf_oscillator.rs:52`) |

`period < 2` returns [`Error::InvalidPeriod`] — a regression line is
undefined for fewer than two points (test `rejects_short_period`). Python
default comes from `#[pyo3(signature = (period=14))]`; the Node constructor
takes `period` explicitly. The public class is `TsfOscillator` in both
bindings.

## Inputs / Outputs

```rust
use wickra::{Indicator, TsfOscillator};
// TsfOscillator: Input = f64, Output = f64
const _: fn(&mut TsfOscillator, f64) -> Option<f64> = <TsfOscillator as Indicator>::update;
```

A single `f64` close in, an `Option<f64>` out (a percentage). Python maps
this to `float | None` / an `array.array('d')` with `NaN` warmup; Node to
`number | null` / `Array<number>` with `NaN` warmup.

## Warmup

`warmup_period()` returns `period`. The oscillator wraps a [Tsf](/Indicators/Indicator-Tsf)
of the same period, which fills its window and emits its first forecast on
input `period` (index `period − 1`); the oscillator emits on that bar.
Pinned by `warmup_emits_first_value_at_period` (period 3: inputs 1–2 return
`None`, input 3 emits).

## Edge cases

- **Reference value.** For period 3 over `[1, 2, 9]` the fit is `y = 4x`, so
  the one-bar-ahead TSF is `12`; with close `9` the oscillator is
  `100·(9 − 12)/9 = −33.33…%` (test `reference_value`).
- **Constant series.** A flat input has slope `0`, so the forecast equals
  the constant and the gap is exactly `0` (test `constant_series_yields_zero`).
- **Linear uptrend.** Unlike CFO, the forecast steps one bar ahead, so on a
  rising line the projection overshoots the close and the oscillator is
  strictly negative (test `linear_uptrend_reads_negative`).
- **Zero close.** The percentage form divides by `close`; on a zero close
  the indicator holds its previous value rather than emitting infinity
  (test `zero_close_holds_value`).
- **Reset.** `reset()` clears the forecast window and the held value
  (test `reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, TsfOscillator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // period 3 over [1, 2, 9]: fit y = 4x, one-bar-ahead TSF = 12,
    // close = 9 → 100·(9 − 12)/9 = −33.33…
    let mut osc = TsfOscillator::new(3)?;
    let out = osc.batch(&[1.0, 2.0, 9.0]);
    println!("{:?}", out); // [None, None, Some(-33.33333333333333)]
    Ok(())
}
```

Output:

```
[None, None, Some(-33.33333333333333)]
```

### Python

```python
import numpy as np
import wickra as ta

osc = ta.TsfOscillator(3)
out = osc.batch(np.array([1.0, 2.0, 9.0], dtype=float))
# array([   nan,    nan, -33.333...])
```

### Node

```javascript
const ta = require('wickra');
const osc = new ta.TsfOscillator(3);
osc.update(1.0); // null
osc.update(2.0); // null
osc.update(9.0); // -33.333...
```

### Streaming

```python
import wickra as ta

osc = ta.TsfOscillator(14)
for price in price_feed:          # one tick at a time
    value = osc.update(price)     # None until 14 closes seen, then a percent
    if value is not None:
        act_on(value)
```

## Interpretation

The TSF oscillator measures how far the close sits from where the trend
*projects* the next bar, in percent:

1. **Overshoot / reversion.** Strongly positive readings mark price running
   ahead of its forward projection — a pullback candidate; strongly negative
   readings mark the projection running ahead of price.
2. **Trend bias vs CFO.** Because the forecast is one bar ahead, a clean
   uptrend carries a persistent negative bias (and a downtrend a positive
   one); read the oscillator relative to that baseline rather than against a
   fixed zero, or pair it with [Cfo](/Indicators/Indicator-Cfo) for the current-bar gap.

Because the output is a *percentage*, the oscillator is directly comparable
across instruments at different price levels — unlike the price-unit
[Apo](/Indicators/Indicator-Apo).

## Common pitfalls

- **Treating zero as neutral on a trend.** The one-bar-ahead projection
  biases the oscillator away from zero in any sustained trend; zero is the
  neutral point only on a flat market.
- **Feeding non-price series.** The division by `close` assumes a positive
  price; on a series that crosses zero the percentage form is ill-defined.
- **Confusing it with the forecast.** The oscillator is the *deviation* from
  the [Tsf](/Indicators/Indicator-Tsf) value, not the forecast itself — use `Tsf`
  directly for the projected price.

## References

- Tushar Chande & Stanley Kroll, *The New Technical Trader*, Wiley, 1994
  (forecast-oscillator family).

## See also

- [Cfo](/Indicators/Indicator-Cfo) — the current-bar regression gap; this oscillator's
  one-bar-ahead companion.
- [Tsf](/Indicators/Indicator-Tsf) — the one-bar-ahead forecast this oscillator deviates
  from.
- [LinearRegression](/Indicators/Indicator-LinearRegression) — the current-bar endpoint.
- [Indicators-Overview](/Indicators-Overview)
