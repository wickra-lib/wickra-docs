# VolatilityOfVolatility

> Volatility of Volatility — the standard deviation of a rolling realized-
> volatility series; how unstable the volatility regime itself is.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Volatility & Bands |
| Input type | `f64` (single close) |
| Output type | `f64` |
| Output range | `[0, ∞)` |
| Default parameters | `(vol_window = 20, vov_window = 20)` (Python) |
| Warmup period | `vol_window + vov_window` |
| Interpretation | High = unstable volatility regime; `0` = perfectly steady volatility. |

## Formula

```
r_t   = ln(price_t / price_{t−1})
vol_t = stddev_sample(r over vol_window)      (rolling realized volatility)
VoV   = stddev_sample(vol over vov_window)    (dispersion of that series)
```

A two-stage estimator. Stage one is the rolling sample volatility of log returns
— the same quantity
[`HistoricalVolatility`](/Indicators/Indicator-HistoricalVolatility) annualises.
Stage two measures how much *that* volatility itself moves. A high vol-of-vol
means the volatility regime is unstable: turbulent stretches alternate with calm
ones. That is precisely the convexity that long-gamma and volatility-trading
strategies are exposed to. Both stages use the unbiased `n − 1` sample standard
deviation. Source:
`crates/wickra-core/src/indicators/volatility_of_volatility.rs`.

## Parameters

| Name         | Type    | Default       | Valid range | Source | Description |
|--------------|---------|---------------|-------------|--------|-------------|
| `vol_window` | `usize` | `20` (Python) | `>= 2`      | `volatility_of_volatility.rs:78` | Window for the inner realized-volatility series. `0` → `Error::PeriodZero`; `1` → `Error::InvalidPeriod`. |
| `vov_window` | `usize` | `20` (Python) | `>= 2`      | `volatility_of_volatility.rs:78` | Window over which the dispersion of that series is measured. |

`windows` returns `(vol_window, vov_window)`; `value` returns the current output
if ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/volatility_of_volatility.rs`:

```rust
use wickra::{Indicator, VolatilityOfVolatility};
// VolatilityOfVolatility: Input = f64, Output = f64
const _: fn(&mut VolatilityOfVolatility, f64) -> Option<f64> = <VolatilityOfVolatility as Indicator>::update;
```

A single `f64` close in, an `Option<f64>` out. Python maps this to
`float | None` / `array.array('d')` (NaN warmup); Node to `number | null` /
`Array<number>` (NaN warmup).

## Warmup

`warmup_period() == vol_window + vov_window`. One previous price seeds the first
return, `vol_window` returns yield the first volatility, and `vov_window`
volatilities are then needed for the dispersion — so the first non-`None` output
lands on input `vol_window + vov_window`
(`first_emission_at_warmup_period` pins this).

## Edge cases

- **Two-stage reference.** Stage one equals
  `HistoricalVolatility(vol_window, 1) / 100`; stage two is the sample standard
  deviation of that series (`matches_two_stage_reference` pins this).
- **Constant series.** A flat price series has zero returns, a zero volatility
  series, and therefore zero vol-of-vol (`constant_series_yields_zero` pins
  this).
- **Non-positive prices.** A log return is undefined when a price is `<= 0`; such
  ticks are **skipped**, state is left untouched, and the next valid tick
  re-anchors (`skips_non_positive_prices`).
- **Non-negative.** A standard deviation is never negative
  (`output_is_non_negative` pins this).
- **NaN / infinity inputs.** Non-finite inputs are silently dropped
  (`ignores_non_finite_input`).
- **Reset.** `vov.reset()` clears both windows, both running-moment pairs, the
  previous price and the last value (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, VolatilityOfVolatility};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut vov = VolatilityOfVolatility::new(5, 5)?;
    // A perfectly flat series -> zero volatility -> zero vol-of-vol.
    let flat = vov.batch(&[100.0; 60]);
    println!("warmup_period = {}", vov.warmup_period());
    println!("last (flat) = {:?}", flat.last().unwrap());
    Ok(())
}
```

Output:

```
warmup_period = 10
last (flat) = Some(0.0)
```

### Python

```python
import numpy as np
import wickra as ta

vov = ta.VolatilityOfVolatility()  # (vol_window=20, vov_window=20)
# Two regimes: calm, then turbulent -> non-zero vol-of-vol.
calm = 100 + np.cumsum(np.random.default_rng(0).normal(0, 0.1, 200))
wild = calm[-1] + np.cumsum(np.random.default_rng(1).normal(0, 1.5, 200))
prices = np.concatenate([calm, wild])
print(vov.batch(prices)[-1] > 0)  # True: the regime shift lifts vol-of-vol
```

Output:

```
True
```

### Node

```javascript
const ta = require('wickra');

const vov = new ta.VolatilityOfVolatility(20, 20);
console.log('warmupPeriod:', vov.warmupPeriod()); // 40
const prices = Array.from({ length: 100 }, (_, i) => 100 + Math.sin(i * 0.3) * 5);
console.log(vov.batch(prices).at(-1));
```

### Streaming

```rust
use wickra::{Indicator, VolatilityOfVolatility};

let mut vov = VolatilityOfVolatility::new(20, 20).unwrap();
let mut last = None;
for i in 0..120 {
    last = vov.update(100.0 + (f64::from(i) * 0.3).sin() * 5.0);
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

Vol-of-vol is a second-order volatility measure. Where realized volatility says
"how much price moves", vol-of-vol says "how much that movement *changes*":

1. **Regime-stability gauge.** Rising vol-of-vol warns that the volatility
   environment is shifting — calm giving way to turbulence or vice versa — even
   before the level of volatility settles.
2. **Options convexity.** Vol-of-vol is the empirical analogue of the "vol of
   vol" parameter in stochastic-volatility models; it drives the value of options
   on volatility and the curvature (smile) of the implied-vol surface.
3. **Risk overlay.** Pair it with a volatility level to distinguish a steady-high
   regime (high vol, low vol-of-vol) from a whipsaw regime (high vol, high
   vol-of-vol), which demand different position sizing.

Both stages are per-period sample standard deviations; annualise downstream if
you want a percentage figure.

## Common pitfalls

- **Warmup is the sum of the windows.** With the `(20, 20)` defaults you need
  `40` bars before the first reading.
- **Two short windows are noisy.** Each stage is a small-sample standard
  deviation; very short windows make the second derivative jittery.
- **Per-period, not annualised.** Like
  [`RealizedVolatility`](/Indicators/Indicator-RealizedVolatility), no `√252`
  scaling is applied.

## References

Vol-of-vol is the realized analogue of the volatility-of-volatility parameter in
stochastic-volatility models (e.g. Heston 1993); here it is estimated directly as
the dispersion of a rolling realized-volatility series.

## See also

- [Indicator-HistoricalVolatility](/Indicators/Indicator-HistoricalVolatility) — the stage-one annualised volatility.
- [Indicator-Garch11](/Indicators/Indicator-Garch11) — a parametric model whose `α` captures volatility clustering.
- [Indicator-RealizedVolatility](/Indicators/Indicator-RealizedVolatility) — un-centred quadratic-variation volatility.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
