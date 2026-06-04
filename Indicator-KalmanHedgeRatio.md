# KalmanHedgeRatio

> A dynamic hedge ratio between two series, estimated online with a Kalman
> filter — the OLS slope's adaptive cousin.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Statistics |
| Input type | `(f64, f64)` (a pair of prices `a`, `b`) |
| Output type | `KalmanHedgeRatioOutput { hedge_ratio, intercept, spread }` |
| Output range | `hedge_ratio`/`intercept`/`spread` all unbounded |
| Default parameters | `delta` (`0 < delta < 1`), `observation_var` (`> 0`); both required |
| Warmup period | `1` (emits from the first update) |
| Interpretation | `hedge_ratio` is the live β; `spread` is the forecast error a pairs trade fades. |

## Formula

Each `update` treats the linear relation `aₜ = αₜ + βₜ·bₜ + noise` as a
state-space model whose hidden state `[βₜ, αₜ]` follows a random walk. The
filter updates the state from every observation, so the hedge ratio **adapts
continuously** instead of being a flat OLS slope over a fixed window:

```
state    xₜ = [βₜ, αₜ],   drifts as a random walk with covariance Vw·I
observe  aₜ = [bₜ, 1]·xₜ + εₜ,   Var(εₜ) = observation_var
Vw = delta / (1 − delta)
```

`delta` controls how fast the hedge ratio is allowed to move: a larger `delta`
tracks regime changes faster but is noisier; a smaller `delta` is smoother but
slower. `observation_var` is the measurement-noise variance. The reported
`spread` (the filter's forecast error) is the mean-reverting signal a pairs
trade fades — the Kalman analogue of the [Cointegration](Indicator-Cointegration)
residual, but with a hedge ratio that breathes. The filter emits an estimate
from the **first** update; early estimates are diffuse and settle as
observations accumulate.

Source: `crates/wickra-core/src/indicators/kalman_hedge_ratio.rs`.

## Parameters

| Name              | Type  | Default | Valid range     | Source | Description |
|-------------------|-------|---------|-----------------|--------|-------------|
| `delta`           | `f64` | none    | `0 < delta < 1` | `kalman_hedge_ratio.rs:80` | State-drift speed. Larger adapts faster, noisier. |
| `observation_var` | `f64` | none    | `> 0`           | `kalman_hedge_ratio.rs:80` | Measurement-noise variance. Bad parameters error with `Error::InvalidPeriod`. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/kalman_hedge_ratio.rs`:

```rust
use wickra::{Indicator, KalmanHedgeRatio, KalmanHedgeRatioOutput};
// KalmanHedgeRatio: Input = (f64, f64), Output = KalmanHedgeRatioOutput
const _: fn(&mut KalmanHedgeRatio, (f64, f64)) -> Option<KalmanHedgeRatioOutput> =
    <KalmanHedgeRatio as Indicator>::update;
```

`KalmanHedgeRatioOutput` carries `hedge_ratio`, `intercept` and `spread`. In
Python `update(a, b)` returns a `(hedge_ratio, intercept, spread)` tuple and
`batch` returns an `(n, 3)` array. In Node `update(a, b)` returns
`{ hedgeRatio, intercept, spread }` and `batch` returns a flat array of length
`3 · n`, interleaved per row as `[hedgeRatio0, intercept0, spread0, ...]`.

## Warmup

`warmup_period() == 1`. The unit test `accessors_and_metadata` pins
`warmup_period() == 1`: the filter is ready and emits an estimate after the
first observation, though early estimates are diffuse until the state settles.

## Edge cases

- **Stable relationship.** When `a = 2·b` exactly, the filter converges the hedge
  ratio toward `2` and drives the spread toward `0`; the doc example pins
  `hedge_ratio ≈ 2` and `spread ≈ 0`.
- **Parameter validation.** `delta` outside `(0, 1)`, a non-positive or
  non-finite `observation_var`, or NaN inputs are rejected; pinned by
  `rejects_bad_parameters`.
- **Reset.** `reset()` returns the filter to its diffuse prior.

## Examples

### Rust

```rust
use wickra::{Indicator, KalmanHedgeRatio};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut k = KalmanHedgeRatio::new(0.001, 0.01)?;
    // a = 2*b exactly -> hedge ratio converges to 2, spread to 0.
    let mut out = None;
    for t in 0..200 {
        let b = 100.0 + f64::from(t);
        out = k.update((2.0 * b, b));
    }
    let out = out.unwrap();
    println!("{:.6} {:.6}", out.hedge_ratio, out.spread);
    Ok(())
}
```

Output:

```
1.999934 0.000066
```

### Python

```python
import wickra as ta

k = ta.KalmanHedgeRatio(0.001, 0.01)
out = None
for t in range(200):
    b = 100.0 + t
    out = k.update(2.0 * b, b)
hedge_ratio, intercept, spread = out
print(round(hedge_ratio, 6), round(spread, 6))
```

Output:

```
1.999934 6.6e-05
```

### Node

```javascript
const ta = require('wickra');
const k = new ta.KalmanHedgeRatio(0.001, 0.01);
let out;
for (let t = 0; t < 200; t++) {
  const b = 100 + t;
  out = k.update(2 * b, b);
}
console.log(out.hedgeRatio.toFixed(6), out.spread.toFixed(6));
```

Output:

```
1.999934 0.000066
```

## Interpretation

`KalmanHedgeRatio` is the tool of choice when the hedge ratio between two assets
is not constant — most real pairs drift as their fundamentals diverge. The live
`hedge_ratio` tells you how many units of `b` to short per unit of `a` *right
now*; the `spread` is the residual you fade, mean-reverting around zero when the
relationship holds. Tune `delta` to the pace of regime change: too large and the
hedge chases noise, too small and it lags genuine drift. Contrast with
[BetaNeutralSpread](Indicator-BetaNeutralSpread) (a fixed-window OLS hedge) and
[Cointegration](Indicator-Cointegration) (a static hedge plus a stationarity
test).

## Common pitfalls

- **Diffuse warmup.** The first handful of estimates are dominated by the prior
  and can swing widely. Discard the early bars before trading the spread.
- **`delta` is the key knob.** It sets the whole adaptivity/noise trade-off.
  Calibrate it deliberately rather than leaving an arbitrary default.

## References

Kalman, R. E. (1960), *A New Approach to Linear Filtering and Prediction
Problems*; the dynamic-hedge formulation follows Chan, E. (2013),
*Algorithmic Trading*.

## See also

- [Indicator-BetaNeutralSpread](Indicator-BetaNeutralSpread) — fixed-window OLS hedge residual.
- [Indicator-Cointegration](Indicator-Cointegration) — static hedge ratio + ADF test.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
