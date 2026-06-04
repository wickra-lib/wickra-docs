# HoltWinters

> Holt's linear method — double exponential smoothing with a level and a trend
> component, reporting the one-step-ahead forecast `level + trend` for a
> lag-reduced moving average on trending data.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Moving Averages |
| Input type | `f64` (single price) |
| Output type | `f64` (one-step-ahead forecast) |
| Output range | unbounded; tracks the input price scale |
| Default parameters | `alpha` (level) and `beta` (trend); bindings default `0.2`, `0.1` |
| Warmup period (`warmup_period()`) | `2` — seeded from the first two inputs |
| Interpretation | Trend-aware EMA: removes the lag a single EMA shows on a trend. |

## Formula

```
level_t = α · price_t            + (1 − α) · (level_{t-1} + trend_{t-1})
trend_t = β · (level_t − level_{t-1}) + (1 − β) · trend_{t-1}
output  = level_t + trend_t                  (one-step-ahead forecast)
```

A plain [`Ema`](Indicator-Ema) carries only a level, so it lags a sustained
trend by a fixed amount. Holt's method adds a second exponentially-smoothed
state — the *trend* — and projects one step forward by adding it to the level.
On trending data that projection cancels the level's lag; on noisy data the two
smoothing constants damp the noise.

The state is seeded from the first two inputs (`level = price_1`,
`trend = price_1 − price_0`), so the first output lands on the **second** input.
On a perfectly linear series the forecast is exact from that second bar onward,
for any `α`/`β` (the level-equals-value, trend-equals-slope pair is a fixed
point of the recurrence).

Source: `crates/wickra-core/src/indicators/holt_winters.rs`.

## Parameters

| Name    | Type  | Default | Valid range | Source | Description |
|---------|-------|---------|-------------|--------|-------------|
| `alpha` | `f64` | `0.2` (binding) | `(0.0, 1.0]` | `holt_winters.rs:62` | Level smoothing constant. Non-finite or out-of-range errors with `Error::InvalidPeriod`. |
| `beta`  | `f64` | `0.1` (binding) | `(0.0, 1.0]` | `holt_winters.rs:68` | Trend smoothing constant. Same validation. |

(Python class `wickra.HoltWinters(alpha=0.2, beta=0.1)`; Node
`new ta.HoltWinters(alpha, beta)`.)

## Inputs / Outputs

From `crates/wickra-core/src/indicators/holt_winters.rs`:

```rust
use wickra::{HoltWinters, Indicator};
// HoltWinters: Input = f64, Output = f64
const _: fn(&mut HoltWinters, f64) -> Option<f64> =
    <HoltWinters as Indicator>::update;
```

Python returns `float | None` (streaming) / `numpy.ndarray` (batch, `NaN` for
warmup). Node returns `number | null` / `Array<number>` with `NaN`. The
`level()` and `trend()` accessors expose the two internal states.

## Warmup

`warmup_period()` returns `2`: the first input is held to seed the trend, and
the second input produces the first forecast. Pinned by `accessors_and_metadata`
(`warmup_period() == 2`) and by `warmup_then_seed_on_second_input`, which feeds
`10` (returns `None`) then `12` (seeds `level = 12`, `trend = 2`, forecast
`14`).

## Edge cases

- **Linear series → exact forecast.** `linear_series_forecasts_exactly` feeds
  the ramp `1..20` with `α = 0.3`, `β = 0.4` and asserts each forecast equals
  the next value (e.g. index 1 → `3.0`), independent of the constants.
- **Constant series.** `constant_series_yields_constant` pins `[42.0; 30]` to
  `42.0` (trend collapses to `0`).
- **Invalid constants.** `rejects_invalid_alpha` / `rejects_invalid_beta` pin
  the `Error::InvalidPeriod` path for `0`, `> 1`, and non-finite values.
- **NaN / infinity inputs.** Non-finite inputs are ignored: before seeding they
  return `None`, after seeding they return the current forecast unchanged —
  pinned by `ignores_non_finite_input`.
- **Reset.** `reset_clears_state` clears both the seeded state and the held
  first price.

## Examples

### Rust

```rust
use wickra::{BatchExt, HoltWinters, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut hw = HoltWinters::new(0.2, 0.1)?;
    let prices: Vec<f64> = (1..=20).map(f64::from).collect();
    let out: Vec<Option<f64>> = hw.batch(&prices);
    println!("warmup_period = {}", hw.warmup_period());
    println!("{:?}", out);
    Ok(())
}
```

Output:

```
warmup_period = 2
[None, Some(3.0), Some(4.0), Some(5.0), Some(6.0), Some(7.0), Some(8.0), Some(9.0), Some(10.0), Some(11.0), Some(12.0), Some(13.0), Some(14.0), Some(15.0), Some(16.0), Some(17.0), Some(18.0), Some(19.0), Some(20.0), Some(21.0)]
```

On the linear ramp the one-step forecast is the next value: the second input
(`2`) seeds a trend of `1`, so the forecast is `3`, then `4`, …, ending at `21`
(the projection one bar beyond the data). This holds for any `α`/`β`.

### Python

```python
import numpy as np
import wickra as ta

hw = ta.HoltWinters(0.2, 0.1)
out = hw.batch(np.arange(1.0, 21.0))
print("warmup_period =", hw.warmup_period())
print(out)
```

Output:

```
warmup_period = 2
[nan  3.  4.  5.  6.  7.  8.  9. 10. 11. 12. 13. 14. 15. 16. 17. 18. 19.
 20. 21.]
```

### Node

```javascript
const ta = require('wickra');
const hw = new ta.HoltWinters(0.2, 0.1);
const prices = Array.from({ length: 20 }, (_, i) => i + 1);
console.log(hw.batch(prices));
console.log('warmupPeriod:', hw.warmupPeriod());
```

Output:

```
[
  NaN, 3, 4, 5, 6, 7, 8, 9, 10, 11,
  12, 13, 14, 15, 16, 17, 18, 19, 20, 21
]
warmupPeriod: 2
```

### Streaming

```rust
use wickra::{HoltWinters, Indicator};

let mut hw = HoltWinters::new(0.2, 0.1)?;
hw.update(10.0);                 // held to seed the trend -> None
let f = hw.update(12.0).unwrap(); // level 12, trend 2 -> forecast 14
println!("{f}");
# Ok::<(), Box<dyn std::error::Error>>(())
```

Output:

```
14
```

## Interpretation

`HoltWinters` is the moving average to use when you want EMA-style smoothing
**without the lag on trends**. The trend term means that, unlike an EMA, the
output does not systematically sit behind a rising or falling market — it
projects the current slope one step forward.

Tuning:

1. **`alpha`** controls how fast the level reacts to price. Higher = snappier
   level, more noise.
2. **`beta`** controls how fast the trend reacts. Higher = the slope estimate
   adapts quickly (good for changing trends) but can overshoot on noise.

Use it as a lag-reduced trend line, as a short-horizon forecaster (the output
*is* a one-step-ahead forecast), or as the centre line of a band where EMA lag
would bias the envelope. Compare against [`Dema`](Indicator-Dema) /
[`Tema`](Indicator-Tema): Holt achieves lag reduction through an explicit trend
state rather than EMA cascades, and exposes that trend via `trend()`.

## Common pitfalls

- **Treating the output as a smoothed level.** The reported value is the
  one-step-ahead *forecast* (`level + trend`), so on a trend it sits slightly
  ahead of price, not on it. Use `level()` if you want the de-trended level.
- **Over-large `beta`.** A high trend constant makes the slope estimate chase
  noise, producing a forecast that overshoots on choppy data. Keep `beta` well
  below `alpha` unless trends genuinely change fast.

## References

C. C. Holt, *"Forecasting seasonals and trends by exponentially weighted moving
averages"*, 1957 (reprinted *International Journal of Forecasting*, 2004) — the
original double-exponential (linear-trend) smoothing method.

## See also

- [Indicator-Ema](Indicator-Ema) — single exponential smoothing (level only).
- [Indicator-Dema](Indicator-Dema) — EMA-cascade lag reduction.
- [Indicator-GeneralizedDema](Indicator-GeneralizedDema) — tunable EMA-cascade lag reduction.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
