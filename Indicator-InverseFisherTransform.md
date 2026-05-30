# Inverse Fisher Transform

> Compresses the input through `(e^{2x} - 1) / (e^{2x} + 1) = tanh(x)`,
> the algebraic inverse of the Fisher transform. The output is
> bounded in `[-1, +1]` (saturating to exactly `±1` for
> `|scale * input| >= ~19.06` under IEEE 754 doubles), which makes
> overbought / oversold thresholds at, say, `±0.5` universal across
> markets and timeframes — the classic use described by Ehlers in
> *Cybernetic Analysis for Stocks and Futures* (2004).

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Ehlers / Cycle (DSP)                                                 |
| Input type          | `f64` (any scalar — typically a centred oscillator reading)          |
| Output type         | `f64`                                                                |
| Output range        | `[-1, +1]` (saturating)                                              |
| Default parameters  | `scale` is required (no factory default)                             |
| Warmup period       | `1` — emits immediately                                              |
| Interpretation      | `±0.5` strong threshold; `±0.9` saturation                            |

## Formula

```
IFT(x) = tanh(scale * x) = (e^{2·scale·x} − 1) / (e^{2·scale·x} + 1)
```

No state, no smoothing — it's a pointwise squash. The `scale`
parameter compresses or stretches the input range; values around
`0.1` work well for RSI-style `[0, 100]` inputs (after centring at
50 via `(RSI - 50)`).

See `crates/wickra-core/src/indicators/inverse_fisher_transform.rs`.

## Parameters

| Name    | Type  | Default | Constraint           | Description |
|---------|-------|---------|----------------------|-------------|
| `scale` | `f64` | none    | finite, `> 0`        | Pre-tanh multiplier; larger = sharper transition. |

`InverseFisherTransform::new` returns `Error::InvalidPeriod {
message: "scale must be a positive finite number" }` for non-finite
or non-positive `scale`.

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Python:
`InverseFisherTransform(scale).batch(values)` returns a 1-D
`np.ndarray` (no warmup `NaN`s). Node: `update(value)` returns
`number`.

## Warmup

`warmup_period() == 1`. The function is stateless — every input
produces an output.

## Edge cases

- **Saturation.** For `|scale · input| >= ~19.06`, `tanh` returns
  exactly `±1` in IEEE 754 doubles. The indicator clamps cleanly to
  the boundary.
- **Zero input.** `tanh(0) == 0` regardless of scale.
- **Negative scale.** Rejected by validation; not meaningful in
  practice because it would simply invert the sign.
- **Reset.** `reset()` clears `last_value` to `None` — but since
  there's no state, `update` always returns a fresh value
  immediately.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, InverseFisherTransform};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let ift_input: Vec<f64> = (0..50)
        .map(|i| f64::from(i - 25) * 0.4)
        .collect();
    let mut ift = InverseFisherTransform::new(1.0)?;
    let out = ift.batch(&ift_input);
    println!("input -10..10 -> output {:?} .. {:?}", out[0], out.last());
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

# Centred RSI-style input: assume RSI was in [0, 100], shift to [-50, 50]
centred = np.array([-30.0, -10.0, 0.0, 10.0, 30.0])
ift = ta.InverseFisherTransform(0.1)
print(ift.batch(centred))
# ≈ [-0.995, -0.762, 0.0, 0.762, 0.995]
```

### Node

```javascript
const wickra = require('wickra');

const ift = new wickra.InverseFisherTransform(0.1);
console.log(ift.batch([-30, -10, 0, 10, 30]));
```

### Streaming

```rust
use wickra::{Indicator, InverseFisherTransform, Rsi};

let mut rsi = Rsi::new(14).unwrap();
let mut ift = InverseFisherTransform::new(0.1).unwrap();
for px in price_stream {
    if let Some(r) = rsi.update(px) {
        // Centre RSI at 0, then squash
        let signal = ift.update(r - 50.0).unwrap();
        if signal > 0.5 { /* overbought */ }
        if signal < -0.5 { /* oversold */ }
    }
}
```

## Interpretation

The Inverse Fisher Transform is a **bounded-oscillator generator**:

- **Apply to a centred RSI / Stochastic / momentum reading.**
  Center the source (e.g. `RSI - 50`) and pick `scale` so typical
  values map into the `[-2, +2]` pre-tanh range; the IFT then maps
  them into the `[-1, +1]` post-tanh range with sharp transitions
  at `±0.5`.
- **Universal thresholds.** Because output is bounded, the same
  threshold (`±0.5`, `±0.8`) makes sense across instruments and
  timeframes — unlike raw RSI, which needs per-instrument tuning.
- **Sharper signals.** A near-Gaussian input becomes near-uniform
  near `±1` and stays at zero for unremarkable values — this
  reduces the "indecisive middle band" that plagues raw oscillators.

## Common pitfalls

- **Forgetting to centre the source.** Feeding raw RSI (range
  `[0, 100]`) into IFT with `scale = 0.1` gives outputs all near
  `+1` because `tanh(5) ≈ 1`. Subtract `50` from RSI first.
- **Wrong scale.** Too small a scale (`0.01`) leaves the output in
  the near-linear `(-0.2, +0.2)` band — defeats the purpose.
  Too large (`1.0`) saturates the output on every bar.
- **Reading thresholds without backtesting.** `±0.5` is a *common*
  threshold, not a magical one. Different sources (RSI vs CCI vs
  Stoch) and different timeframes will need different cutoffs.

## References

- John F. Ehlers, *The Inverse Fisher Transform*, *Technical
  Analysis of Stocks & Commodities*, May 2004.
- John F. Ehlers, *Cybernetic Analysis for Stocks and Futures*
  (2004) — practical usage guidance.

## See also

- [FisherTransform](Indicator-FisherTransform) — the algebraic
  inverse, applied to price.
- [Rsi](Indicator-Rsi) — most common IFT input.
- [LaguerreRsi](Indicator-LaguerreRsi) — bounded RSI variant that
  pairs well with IFT.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
