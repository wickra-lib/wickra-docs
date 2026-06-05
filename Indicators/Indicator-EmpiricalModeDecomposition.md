# Empirical Mode Decomposition (EMD)

> John Ehlers' adaptation of Empirical Mode Decomposition. Applies a
> bandpass centred on `period`, then detects peaks and valleys over
> a `fraction` of the period, averages them into upper / lower
> envelopes, and returns the centred bandpass minus the envelope
> mean. The result crosses zero at trend changes and stays near
> zero in non-trending markets — the classic visual cue Ehlers
> documents.

## Quick reference

| Item                | Value                                                                  |
|---------------------|------------------------------------------------------------------------|
| Family              | Ehlers / Cycle (DSP)                                                   |
| Input type          | `f64`                                                                  |
| Output type         | `f64`                                                                  |
| Output range        | unbounded; centred near zero                                            |
| Default parameters  | `period`, `fraction` required (Ehlers' typical `(20, 0.5)`)            |
| Warmup period       | `period`                                                               |
| Interpretation      | Near-zero → no trend; persistently positive/negative → trend           |

## Formula

1. **Bandpass**, centred at `period`:

   ```
   β   = cos(2π / period)
   γ   = 1 / cos(4π · 0.1 / period)         (using fraction-derived term)
   α   = γ - sqrt(γ² - 1)
   BP_t = 0.5 · (1 - α) · (x_t - x_{t-2})
        + β · (1 + α) · BP_{t-1}
        - α · BP_{t-2}
   ```

2. **Peak / valley detection** over a `fraction · period` window of
   the bandpass output: a local maximum becomes a "peak", a local
   minimum becomes a "valley".

3. **Envelope smoothing**: peaks and valleys are each fed into a
   SuperSmoother to form upper / lower envelopes.

4. **Output**:
   ```
   EMD_t = BP_t - (upper_env_t + lower_env_t) / 2
   ```

See `crates/wickra-core/src/indicators/empirical_mode_decomposition.rs`.

## Parameters

| Name       | Type    | Default | Constraint           | Description |
|------------|---------|---------|----------------------|-------------|
| `period`   | `usize` | none    | `> 1`                | Bandpass centre period. |
| `fraction` | `f64`   | none    | finite, `(0, 1]`     | Fraction of `period` used for peak/valley window. |

`EmpiricalModeDecomposition::new` returns `Error::PeriodZero` for
`period == 0`, `Error::InvalidPeriod` for `period == 1`, and an
appropriate error for invalid `fraction`.

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Python:
`EmpiricalModeDecomposition(period, fraction).batch(prices)`
returns a 1-D `np.ndarray` with `NaN` in the warmup prefix.
Node: same shape; `update(value)` returns `number | null`.

## Warmup

`warmup_period() ≈ period`. The bandpass and peak/valley smoothers
need a full period each before the output stabilises.

## Edge cases

- **Constant input.** Bandpass output is zero; envelopes both zero;
  EMD output is zero.
- **Strong trend.** Bandpass output drifts away from zero;
  envelope means lag behind, so EMD reads consistently positive
  (uptrend) or negative (downtrend).
- **`fraction` too small.** Peak/valley windows too narrow; the
  envelope tracks every wiggle and EMD becomes noisy.
- **Reset.** `reset()` clears all internal buffers and the inner
  SuperSmoothers.

## Examples

### Rust

```rust
use wickra::{BatchExt, EmpiricalModeDecomposition, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prices: Vec<f64> = (0..200)
        .map(|i| 100.0 + (f64::from(i) * 0.3).sin() * 5.0 + f64::from(i) * 0.05)
        .collect();
    let mut emd = EmpiricalModeDecomposition::new(20, 0.5)?;
    println!("row 100 = {:?}", emd.batch(&prices)[100]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

t = np.arange(200)
prices = 100 + np.sin(t * 0.3) * 5 + t * 0.05  # cycle + drift
emd = ta.EmpiricalModeDecomposition(20, 0.5)
print('row 100:', emd.batch(prices)[100])  # positive = uptrend
```

### Node

```javascript
const wickra = require('wickra');
const emd = new wickra.EmpiricalModeDecomposition(20, 0.5);
const prices = Array.from({ length: 200 },
  (_, i) => 100 + Math.sin(i * 0.3) * 5 + i * 0.05);
console.log('row 100:', emd.batch(prices)[100]);
```

### Streaming

```rust
use wickra::{EmpiricalModeDecomposition, Indicator};

let mut emd = EmpiricalModeDecomposition::new(20, 0.5).unwrap();
let price_stream: Vec<f64> = Vec::new(); // your live price feed
for px in price_stream {
    if let Some(v) = emd.update(px) {
        let regime = if v.abs() < 0.5 { "cycle" } else if v > 0.0 { "uptrend" } else { "downtrend" };
        println!("EMD={v:.3}  regime={regime}");
    }
}
```

## Interpretation

- **Trend regime classifier.** Near-zero output = the market is
  cycling around the bandpass centre; persistently non-zero output
  = there's a trend component the cycle filter can't capture.
- **Direction.** Positive output indicates the cycle is centred
  above the envelope mid-line (uptrend bias); negative for
  downtrend.
- **Pair with cycle oscillators.** EMD acts as a *trend filter*;
  pair it with [CenterOfGravity](/Indicators/Indicator-CenterOfGravity) or
  RSI for entries — only trade when EMD says trend matches your
  setup.

## Common pitfalls

- **Treating EMD as a momentum indicator.** It's a trend regime
  classifier, not a momentum reading. The magnitude reflects
  trend strength, not bar-to-bar momentum.
- **`fraction` tuning.** `0.5` is the Ehlers default. Smaller
  values (`0.25`) catch more peaks but are noisier; larger
  (`0.75`) catch fewer but are smoother.
- **Warmup ignored.** First ~period bars are unreliable; gate
  signals to bars past the warmup explicitly.

## References

- John F. Ehlers, *Cycle Analytics for Traders*, Wiley (2013),
  ch. 14 — Ehlers' adaptation of the original Huang et al. EMD.
- N.E. Huang et al., *The empirical mode decomposition and the
  Hilbert spectrum for nonlinear and non-stationary time series
  analysis*, *Proc. Royal Society A*, 1998 — original EMD
  derivation.

## See also

- [RoofingFilter](/Indicators/Indicator-RoofingFilter) — alternative
  band-isolation tool.
- [SuperSmoother](/Indicators/Indicator-SuperSmoother) — building block for
  the envelope smoothers.
- [DecyclerOscillator](/Indicators/Indicator-DecyclerOscillator) — different
  trend-vs-cycle decomposition.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
