# FisherRSI

> Fisher RSI — the Fisher transform applied to a normalised RSI, reshaping the
> bounded, middle-heavy RSI into sharp, near-symmetric momentum extremes.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Momentum Oscillators |
| Input type | `f64` (single price) |
| Output type | `f64` |
| Output range | unbounded; typically `[-3.8, 3.8]` (clamped at the RSI extremes) |
| Default parameters | `period` is required (no default in either binding) |
| Warmup period (`warmup_period()`) | `period + 1` (the inner RSI's warmup) |
| Interpretation | Sharpened RSI: clear peaks at momentum extremes. |

## Formula

```
rsi    = RSI(price, period)                 in [0, 100]
x      = clamp((rsi - 50) / 50, ±0.999)     normalise to (-1, 1)
Fisher = 0.5 * ln((1 + x) / (1 - x))
```

The RSI is bounded and its values cluster near the middle, which softens
turning points. The Fisher transform `0.5·ln((1+x)/(1−x))` maps a bounded input
toward a Gaussian shape, stretching the tails so momentum extremes become sharp,
near-symmetric peaks that are easier to threshold and to spot divergences on.
The `±0.999` clamp keeps the logarithm finite when the RSI pins at `0` or `100`
(where the raw transform would diverge), capping the output at
`±0.5·ln(1999) ≈ ±3.8`.

Source: `crates/wickra-core/src/indicators/fisher_rsi.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= 1`      | `fisher_rsi.rs:46` | Wilder RSI period. `period = 0` errors with `Error::PeriodZero`. |

(Python class `wickra.FisherRSI(period)` has no `#[pyo3(signature)]` default;
pass `period` explicitly.)

## Inputs / Outputs

From `crates/wickra-core/src/indicators/fisher_rsi.rs`:

```rust
use wickra::{FisherRsi, Indicator};
// FisherRsi: Input = f64, Output = f64
const _: fn(&mut FisherRsi, f64) -> Option<f64> = <FisherRsi as Indicator>::update;
```

Python returns `float | None` (streaming) / `array.array('d')` (batch, `NaN` for
warmup). Node returns `number | null` / `Array<number>` with `NaN`.

## Warmup

`warmup_period()` returns `period + 1` — it inherits the inner RSI's warmup
(Wilder seeds on `period` gains/losses, first RSI on input `period`, i.e. the
`(period + 1)`-th data point). Pinned by `accessors_and_metadata`
(`warmup_period() == 10` for `FisherRsi::new(9)`) and `warmup_matches_rsi`
(first three inputs of a period-3 instance return `None`, the fourth emits).

## Edge cases

- **Equivalence to Fisher-of-RSI.** `matches_fisher_of_rsi` runs a standalone
  RSI alongside and asserts the transform matches bar-for-bar.
- **Pinned extremes stay finite.** A monotonic rise pins RSI at `100`; the clamp
  keeps the output finite — pinned by `clamp_keeps_output_finite_at_extremes`,
  with `strong_uptrend_is_positive` checking it lands large and positive.
- **Reset.** `reset_clears_state` clears the inner RSI.
- **Streaming/batch equivalence.** `batch_equals_streaming`.

## Examples

### Rust

```rust
use wickra::{BatchExt, FisherRsi, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut f = FisherRsi::new(3)?;
    let prices: Vec<f64> = (1..=10).map(f64::from).collect();
    let out: Vec<Option<f64>> = f.batch(&prices);
    println!("warmup_period = {}", f.warmup_period());
    println!("{:?}", out);
    Ok(())
}
```

Output:

```
warmup_period = 4
[None, None, None, Some(3.800451295800734), Some(3.800451295800734), Some(3.800451295800734), Some(3.800451295800734), Some(3.800451295800734), Some(3.800451295800734), Some(3.800451295800734)]
```

A pure uptrend pins RSI at `100`, so `x` clamps to `0.999` and the Fisher value
saturates at `0.5·ln(1999) ≈ 3.8005` — the upper rail of the transform.

### Python

```python
import numpy as np
import wickra as ta

f = ta.FisherRSI(3)
out = f.batch(np.arange(1.0, 11.0))
print("warmup_period =", f.warmup_period())
print(np.round(out, 4))
```

Output:

```
warmup_period = 4
[   nan    nan    nan 3.8005 3.8005 3.8005 3.8005 3.8005 3.8005 3.8005]
```

### Node

```javascript
const ta = require('wickra');
const f = new ta.FisherRSI(3);
const prices = Array.from({ length: 10 }, (_, i) => i + 1);
console.log(f.batch(prices).map((v) => Math.round(v * 1e4) / 1e4));
console.log('warmupPeriod:', f.warmupPeriod());
```

Output:

```
[
  NaN, NaN, NaN, 3.8005, 3.8005,
  3.8005, 3.8005, 3.8005, 3.8005, 3.8005
]
warmupPeriod: 4
```

### Streaming

```rust
use wickra::{FisherRsi, Indicator};

let mut f = FisherRsi::new(9)?;
let mut last = None;
for i in 0..60 {
    last = f.update(100.0 + (f64::from(i) * 0.3).sin() * 5.0);
}
println!("{last:?}");
# Ok::<(), Box<dyn std::error::Error>>(())
```

## Interpretation

Fisher RSI is for traders who find the plain RSI too "mushy" around its turning
points. By Gaussian-ising the RSI, it turns the gentle RSI swings into crisp
spikes: tops and bottoms become sharp, roughly symmetric peaks instead of broad
plateaus, which makes threshold crossings and **divergences** far cleaner to
read.

Typical uses:

1. **Sharper overbought/oversold.** Use symmetric rails (e.g. `±2`) instead of
   the RSI's asymmetric 70/30; the transform's symmetry makes one threshold work
   both ways.
2. **Turning-point timing.** The peak of a Fisher spike marks the momentum
   extreme more precisely than the rounded RSI top.
3. **Divergence detection.** Sharpened extremes make price/oscillator
   divergences stand out.

## Common pitfalls

- **Treating the rails as signals.** Saturated values near `±3.8` mean the RSI
  is pinned (a strong trend), not necessarily an imminent reversal.
- **Very short periods.** A small `period` makes the underlying RSI — and hence
  the Fisher output — jumpy; pair with a longer period for a readable line.

## References

The Fisher transform's use to sharpen bounded oscillators is due to John F.
Ehlers, *"Using the Fisher Transform"*, Technical Analysis of Stocks &
Commodities, 2002; applied here to Wilder's RSI (1978).

## See also

- [Indicator-Rsi](/Indicators/Indicator-Rsi) — the underlying oscillator.
- [Indicator-FisherTransform](/Indicators/Indicator-FisherTransform) — the Fisher transform applied to price directly.
- [Indicator-InverseFisherTransform](/Indicators/Indicator-InverseFisherTransform) — the inverse mapping back into a bounded range.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
