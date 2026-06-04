# RegimeLabel

> A discrete `{−1, 0, +1}` volatility-regime classification by where the rolling
> volatility sits within its own recent distribution.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Volatility & Bands |
| Input type | `f64` (price) |
| Output type | `f64` (one of `−1.0`, `0.0`, `+1.0`) |
| Output range | `{−1, 0, +1}` |
| Default parameters | `vol_period` (`>= 2`) and `lookback` (`>= 2`) are required |
| Warmup period | `vol_period + lookback` |
| Interpretation | `−1` calm regime, `0` normal, `+1` stressed / high-volatility. |

## Formula

```
σₜ    = sample stddev of the last `vol_period` log returns
q1,q3 = 25th / 75th percentile of the last `lookback` σ readings
label = −1 if σₜ < q1   (calm)
        +1 if σₜ > q3   (stressed)
         0 otherwise    (normal)
```

Rather than thresholding absolute volatility (not comparable across instruments
or epochs), it asks whether *today's* volatility is unusually low or high
relative to its own recent history. Because the latest reading is included in
its own reference window, a freshly elevated volatility prints `+1` until the
window catches up — it flags the *transition*, not just the level. When the
recent volatilities are all equal (`q1 == q3`) the label is `0`.

Source: `crates/wickra-core/src/indicators/regime_label.rs`.

## Parameters

| Name         | Type    | Default | Valid range | Source | Description |
|--------------|---------|---------|-------------|--------|-------------|
| `vol_period` | `usize` | none    | `>= 2`      | `regime_label.rs:74` | Window for the rolling volatility. `< 2` errors with `Error::InvalidPeriod`. |
| `lookback`   | `usize` | none    | `>= 2`      | `regime_label.rs:74` | Window of volatility readings whose quartiles set the bands. `< 2` errors with `Error::InvalidPeriod`. |

(The Python class is `wickra.RegimeLabel(vol_period=5, lookback=20)`.)

## Inputs / Outputs

From `crates/wickra-core/src/indicators/regime_label.rs`:

```rust
use wickra::{Indicator, RegimeLabel};
// RegimeLabel: Input = f64, Output = f64
const _: fn(&mut RegimeLabel, f64) -> Option<f64> = <RegimeLabel as Indicator>::update;
```

Python streams as `float | None`, batches as a 1-D `numpy.ndarray`. Node streams
as `number | null`, batches as `Array<number>`.

## Warmup

`warmup_period() == vol_period + lookback`: one price seeds the previous-price
reference, `vol_period` returns yield the first volatility, then `lookback`
volatilities fill the regime window. The unit test `accessors_and_metadata` pins
`warmup_period() == 25` for `(5, 20)`.

## Edge cases

- **Stressed regime.** A volatility spike after a calm warmup prints `+1`; pinned
  by `detects_stressed_regime_on_volatility_spike`.
- **Calm regime.** A volatility drop after a volatile warmup prints `−1`; pinned
  by `detects_calm_regime_after_volatility_drop`.
- **Zero volatility.** A constant price (all volatilities zero, `q1 == q3`) is
  neutral `0`; pinned by `zero_volatility_is_neutral`.
- **Ternary output.** Output is always one of `{−1, 0, +1}`; pinned by
  `output_is_ternary`.
- **Non-finite / non-positive prices.** Skipped; pinned by
  `ignores_non_finite_and_non_positive`.

## Examples

### Rust

```rust
use wickra::{Indicator, RegimeLabel};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut rl = RegimeLabel::new(5, 20)?;
    let mut last = None;
    for i in 0..60 {
        last = rl.update(100.0 + (f64::from(i) * 0.5).sin());
    }
    println!("{:?}", last); // a defined regime label
    Ok(())
}
```

Output (representative):

```
Some(0.0)
```

### Python

```python
import math
import wickra as ta

rl = ta.RegimeLabel(5, 20)
last = None
for i in range(60):
    last = rl.update(100.0 + math.sin(i * 0.5))
print(last in (-1.0, 0.0, 1.0))
```

Output:

```
True
```

### Node

```javascript
const ta = require('wickra');
const rl = new ta.RegimeLabel(5, 20);
let last = null;
for (let i = 0; i < 60; i++) last = rl.update(100 + Math.sin(i * 0.5));
console.log([-1, 0, 1].includes(last));
```

Output:

```
true
```

## Interpretation

`RegimeLabel` gives a feature pipeline a clean volatility-state input: `+1`
stressed regimes (widen stops, cut size), `−1` calm regimes (mean-reversion
edges sharpen), `0` the normal middle. Because the latest reading is graded
against its own recent history, the label highlights regime *transitions* rather
than the absolute volatility level. Pair with
[JumpIndicator](Indicator-JumpIndicator) (discrete shocks) and
[RealizedVolatility](Indicator-RealizedVolatility) (continuous level).

## Common pitfalls

- **Deep-in-regime neutrality.** Once volatility has been high for a full
  `lookback` window, the reading is no longer an outlier and the label relaxes to
  `0`. The `+1`/`−1` marks the *change*, not the sustained level — read it as a
  transition flag.
- **Two windows.** `vol_period` sizes the volatility; `lookback` sizes the
  reference distribution. Tune them separately.

## References

Rolling-volatility-quantile regime classification is a standard volatility-state
feature; cf. realised-volatility regime models (Andersen et al.).

## See also

- [Indicator-JumpIndicator](Indicator-JumpIndicator) — discrete return shocks.
- [Indicator-RealizedVolatility](Indicator-RealizedVolatility) — the volatility graded here.
- [Indicator-RollingQuantile](Indicator-RollingQuantile) — the quantile primitive used.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
