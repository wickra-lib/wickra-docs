# Empirical Mode Decomposition (EMD)

> John Ehlers & Ric Way's adaptation of Empirical Mode
> Decomposition. Applies a bandpass centred on `period`, averages it
> over `2·period` bars to extract the trend component (`Mean`, the
> output), and builds upper / lower trend thresholds as `fraction`
> times the 50-bar averages of the bandpass peaks and valleys. The
> market is trending while `Mean` sits above the upper threshold
> (bullish) or below the lower one (bearish), and cycling in
> between.

## Quick reference

| Item                | Value                                                                  |
|---------------------|------------------------------------------------------------------------|
| Family              | Ehlers / Cycle (DSP)                                                   |
| Input type          | `f64`                                                                  |
| Output type         | `f64`                                                                  |
| Output range        | unbounded; centred near zero (thresholds via `upper()` / `lower()`)     |
| Default parameters  | Rust/Node: `period`, `fraction` required; Python `(20, 0.1)` (Ehlers)  |
| Warmup period       | `max(2·period, 50)`                                                    |
| Interpretation      | `Mean > upper` → uptrend; `Mean < lower` → downtrend; between → cycle  |

## Formula

1. **Bandpass**, centred at `period`, with Ehlers' half-bandwidth
   `Delta = 0.1`:

   ```
   β   = cos(2π / period)
   γ   = 1 / cos(4π · Delta / period)        (Delta = 0.1, fixed)
   α   = γ - sqrt(γ² - 1)
   BP_t = 0.5 · (1 - α) · (x_t - x_{t-2})
        + β · (1 + α) · BP_{t-1}
        - α · BP_{t-2}
   ```

2. **Trend component** (the output):

   ```
   Mean_t = SMA(BP, 2 · period)_t
   ```

3. **Peak / valley detection**: when `BP_{t-1}` is a local maximum
   (`BP_{t-1} > BP_t` and `BP_{t-1} > BP_{t-2}`) it becomes the new
   `Peak`; when it is a local minimum it becomes the new `Valley`.
   Otherwise the previous `Peak` / `Valley` is held.

4. **Trend thresholds**:

   ```
   upper_t = fraction · SMA(Peak, 50)_t
   lower_t = fraction · SMA(Valley, 50)_t
   ```

`update` returns `Mean`; the two thresholds are read from the
`upper()` / `lower()` accessors after each update. From Ehlers & Way,
*"Empirical Mode Decomposition"*, TASC March 2010. See
`crates/wickra-core/src/indicators/empirical_mode_decomposition.rs`.

## Parameters

| Name       | Type    | Default | Constraint           | Description |
|------------|---------|---------|----------------------|-------------|
| `period`   | `usize` | none (Python `20`)  | `> 0`            | Bandpass centre period; `Mean` averages `2·period` bars. |
| `fraction` | `f64`   | none (Python `0.1`) | finite, `(0, 1]` | Threshold fraction applied to the averaged peaks / valleys (Ehlers uses `0.1`). |

`EmpiricalModeDecomposition::new` returns `Error::PeriodZero` for
`period == 0` and `Error::InvalidPeriod` when `fraction` is not
finite or lies outside `(0, 1]`.

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`; the output is `Mean`.
Rust exposes the thresholds through `upper()` / `lower()` (and
`value()` for the last `Mean`), each reflecting the most recent
update.

- **Python.** `EmpiricalModeDecomposition(period=20, fraction=0.1)`;
  `batch(prices)` returns an `array.array('d')` with `NaN` in the
  warmup prefix; `update(value)` returns `float | None`. The
  thresholds are the `upper` / `lower` properties.
- **Node.** `new EmpiricalModeDecomposition(period, fraction)`;
  `update(value)` returns `number | null`, `batch(prices)` returns
  `number[]`; the thresholds are the `upper` / `lower` getters.

## Warmup

`warmup_period() == max(2·period, 50)`. The first value lands once
both the `2·period` bandpass average and the 50-bar peak / valley
averages are full (bar 50 for `period = 20`).

## Edge cases

- **Constant input.** Bandpass output is zero; `Mean`, `upper` and
  `lower` are all zero.
- **Strong trend.** The bandpass average drifts away from zero and
  escapes the `upper` / `lower` thresholds — trend mode.
- **`fraction` out of range.** `0`, values above `1` and `NaN` are
  rejected (`new_rejects_invalid_params`).
- **Non-finite input.** `update(NaN)` returns `None` and leaves the
  state untouched (`ignores_non_finite_input`).
- **Reset.** `reset()` clears the bandpass history, the peak /
  valley state and all averaging windows (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, EmpiricalModeDecomposition, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prices: Vec<f64> = (0..200)
        .map(|i| 100.0 + (f64::from(i) * 0.3).sin() * 5.0 + f64::from(i) * 0.05)
        .collect();
    let mut emd = EmpiricalModeDecomposition::new(20, 0.1)?;
    let out = emd.batch(&prices);
    println!("row 100 = {:?}", out[100]); // row 100 = Some(0.1062297547120847)
    // Thresholds after the last bar.
    println!("upper = {:.4}  lower = {:.4}", emd.upper(), emd.lower()); // upper = 0.4554  lower = -0.4518
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

t = np.arange(200)
prices = 100 + np.sin(t * 0.3) * 5 + t * 0.05  # cycle + drift
emd = ta.EmpiricalModeDecomposition(20, 0.1)
out = emd.batch(prices)
print('row 100:', out[100])                    # ≈ 0.1062
print('last:', out[-1], emd.upper, emd.lower)  # ≈ 0.1932 0.4554 -0.4518 -> cycle mode
```

### Node

```javascript
const wickra = require('wickra');
const emd = new wickra.EmpiricalModeDecomposition(20, 0.1);
const prices = Array.from({ length: 200 },
  (_, i) => 100 + Math.sin(i * 0.3) * 5 + i * 0.05);
const out = emd.batch(prices);
console.log('row 100:', out[100]);          // ≈ 0.1062
console.log(emd.upper, emd.lower);          // ≈ 0.4554 -0.4518
```

### Streaming

```rust
use wickra::{EmpiricalModeDecomposition, Indicator};

let mut emd = EmpiricalModeDecomposition::new(20, 0.1).unwrap();
let price_stream: Vec<f64> = Vec::new(); // your live price feed
for px in price_stream {
    if let Some(mean) = emd.update(px) {
        let regime = if mean > emd.upper() {
            "uptrend"
        } else if mean < emd.lower() {
            "downtrend"
        } else {
            "cycle"
        };
        println!("EMD={mean:.3}  regime={regime}");
    }
}
```

## Interpretation

- **Trend regime classifier.** `Mean` between `lower` and `upper`
  = the market is cycling around the bandpass centre; `Mean`
  outside the thresholds = there's a trend component the cycle
  filter can't capture.
- **Direction.** `Mean > upper` is a bullish trend mode;
  `Mean < lower` a bearish one.
- **Pair with cycle oscillators.** EMD acts as a *trend filter*;
  pair it with [CenterOfGravity](/Indicators/Indicator-CenterOfGravity) or
  RSI for entries — only trade when EMD says trend matches your
  setup.

## Common pitfalls

- **Treating EMD as a momentum indicator.** It's a trend regime
  classifier, not a momentum reading. The magnitude reflects
  trend strength, not bar-to-bar momentum.
- **`fraction` tuning.** `0.1` is the Ehlers default. It scales
  the thresholds only: larger values widen the cycle band (fewer
  trend calls), smaller values narrow it (more, noisier trend
  calls). It does not change the `Mean` output.
- **Comparing `Mean` to zero.** The regime test is against the
  `upper()` / `lower()` thresholds, not against zero.
- **Warmup ignored.** Nothing is emitted before
  `max(2·period, 50)` bars; gate signals on `is_ready()`.

## References

- John F. Ehlers & Ric Way, *"Empirical Mode Decomposition"*,
  *Technical Analysis of Stocks & Commodities*, March 2010 — the
  construction implemented here.
- John F. Ehlers, *Cycle Analytics for Traders*, Wiley (2013) —
  further discussion of Ehlers' adaptation of the original
  Huang et al. EMD.
- N.E. Huang et al., *The empirical mode decomposition and the
  Hilbert spectrum for nonlinear and non-stationary time series
  analysis*, *Proc. Royal Society A*, 1998 — original EMD
  derivation.

## See also

- [RoofingFilter](/Indicators/Indicator-RoofingFilter) — alternative
  band-isolation tool.
- [SuperSmoother](/Indicators/Indicator-SuperSmoother) — another Ehlers
  smoothing filter.
- [DecyclerOscillator](/Indicators/Indicator-DecyclerOscillator) — different
  trend-vs-cycle decomposition.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
