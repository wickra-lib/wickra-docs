# RVIVolatility (Relative Volatility Index)

> Donald Dorsey's RSI-shaped volatility gauge. Same Wilder-smoothed
> "up vs down" ratio as RSI, but the per-bar sample is the rolling
> standard deviation of close, not the price difference.
>
> Exposed as `RVIVolatility` to disambiguate from the *Relative Vigor
> Index* (also abbreviated RVI), which ships in the Momentum family under
> the shorter [`RVI`](Indicator-Rvi) name.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Volatility & Bands |
| Input type | `f64` (single close) |
| Output type | `f64` |
| Output range | `[0, 100]` (saturates at the extremes) |
| Default parameters | `period = 10` |
| Warmup period | `2 · period − 1` |
| Interpretation | Volatility *direction*. `> 50` = up-bars are more volatile, `< 50` = down-bars are. |

## Formula

```
sd_t      = stddev_pop(close over `period`)
up_t      = sd_t   if close_t > close_{t-1}, else 0
down_t    = sd_t   if close_t < close_{t-1}, else 0
AvgUp_t   = Wilder(up,   `period`)         // EMA with alpha = 1 / period
AvgDown_t = Wilder(down, `period`)
RVI_t     = 100 · AvgUp_t / (AvgUp_t + AvgDown_t)
```

The "up" samples carry the rolling standard deviation when price *rose*
since the previous bar; "down" samples carry it when price *fell*. A pure
uptrend has zero "down" samples and saturates at `100`; a pure downtrend
saturates at `0`. A completely flat series has both averages at zero and
falls back to `50`, the same undefined-RS convention as [Rsi](Indicator-Rsi).

## Parameters

| Name     | Type    | Default | Constraint | Source |
|----------|---------|---------|------------|--------|
| `period` | `usize` | `10`    | `>= 2`     | `RviVolatility::new` (`rvi_volatility.rs:70`) |

`period == 0` returns [`Error::PeriodZero`]; `period == 1` returns
[`Error::InvalidPeriod`] (a 1-bar stddev is always zero and would never
produce a meaningful reading). The public class is `RVIVolatility` in both
bindings; Python default comes from `#[pyo3(signature = (period=10))]`.

## Inputs / Outputs

```rust
use wickra::{Indicator, RviVolatility};
// RviVolatility: Input = f64, Output = f64
const _: fn(&mut RviVolatility, f64) -> Option<f64> = <RviVolatility as Indicator>::update;
```

A single `f64` close in, an `Option<f64>` out in `[0, 100]`. Python maps this
to `float | None` (`RVIVolatility.update`) / a `float64` `np.ndarray` with
`NaN` warmup; Node to `number | null` / `Array<number>`.

## Warmup

`warmup_period()` returns `2 · period − 1`. The first `period − 1` bars fill
the stddev window without emitting; the `period`-th bar produces the first
stddev sample (and the first up/down classification); another `period − 1`
bars then seed the Wilder averages. The two phases overlap by exactly one
bar, so the first ready value lands at index `2·period − 2`. For the default
`period = 10` that is index `18` (the 19th close). Pinned by
`first_emission_at_warmup_period` (period 5 → warmup 9, first value at index 8).

## Edge cases

- **Flat series.** Both `AvgUp` and `AvgDown` collapse to zero; the ratio
  returns `50` (test `constant_series_yields_fifty`).
- **Pure trend.** A strictly monotone series classifies every stddev sample
  as up (or down) and saturates at `100` (or `0`) (tests
  `pure_uptrend_saturates_to_one_hundred` / `pure_downtrend_saturates_to_zero`).
- **Bounded.** The output is always within `[0, 100]` (test
  `output_is_bounded`).
- **Non-finite input.** `NaN` and `±∞` are ignored — state is left untouched
  and the previous value is returned (test `ignores_non_finite_input`).
- **Reset.** `reset()` clears the stddev window, direction state and both
  Wilder accumulators.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, RviVolatility};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Pure uptrend → up-volatility only → RVI saturates at 100.
    let prices: Vec<f64> = (1..=40).map(f64::from).collect();
    let mut rvi = RviVolatility::new(5)?;
    println!("{:?}", rvi.batch(&prices).into_iter().flatten().last()); // Some(100.0)
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

rvi = ta.RVIVolatility(10)
out = rvi.batch(np.array([...], dtype=float))  # 1-D series in [0, 100], NaN warmup
```

### Node

```javascript
const ta = require('wickra');
const rvi = new ta.RVIVolatility(10);
const v = rvi.update(101.5); // null during warmup, else a value in [0, 100]
```

## Interpretation

RVIVolatility measures the *direction* of volatility rather than its level:

1. **Above / below 50.** Readings above `50` mean rising bars have been the
   more volatile; below `50` means falling bars dominate the volatility. It
   answers "is volatility expanding on the way up or on the way down?".
2. **As an RSI confirmation filter.** Dorsey designed it to be used
   alongside RSI and other momentum oscillators — only act on their signals
   when RVIVolatility agrees on direction, filtering out low-conviction
   moves.

## Common pitfalls

- **Confusing it with the Relative Vigor Index.** That is a different Dorsey
  indicator (momentum, not volatility) — see [Rvi](Indicator-Rvi). They share
  the "RVI" abbreviation but nothing else.
- **Reading it as a volatility *level*.** It is a `0–100` direction ratio;
  for an annualised magnitude use
  [HistoricalVolatility](Indicator-HistoricalVolatility) or the OHLC
  estimators.

## References

- Donald Dorsey, *Relative Volatility Index — A New Measure for Volatility*,
  *Technical Analysis of Stocks & Commodities*, June 1993.

## See also

- [Rvi](Indicator-Rvi) — the *other* Dorsey RVI: Relative Vigor Index, a
  momentum indicator in the Momentum family.
- [Rsi](Indicator-Rsi) — the same Wilder ratio applied to gain/loss instead
  of stddev.
- [StdDev](Indicator-StdDev) — the per-bar building block.
- [HistoricalVolatility](Indicator-HistoricalVolatility) — annualised level
  estimator, not a direction gauge.
