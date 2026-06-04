# SWMA

> Sine-Weighted Moving Average — a windowed average whose weights trace one
> half-cycle of a sine wave, peaking in the middle of the window so the central
> observations dominate and both ends are de-emphasised.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Moving Averages |
| Input type | `f64` (single price) |
| Output type | `f64` |
| Output range | unbounded; tracks the input price scale |
| Default parameters | `period` is required (no default in either binding) |
| Warmup period (`warmup_period()`) | `period` — first emission lands on input `period` |
| Interpretation | Smooth, symmetric, low-noise trend line with no end-weight bias. |

## Formula

```
denom = period + 1
w_i   = sin(π · (i + 1) / denom)        for i = 0, 1, …, period − 1  (oldest → newest)
SWMA  = Σ (w_i · value_i) / Σ w_i
```

The weight vector is a half sine wave sampled at `period` interior points of
`(0, π)`: it starts small, rises to a peak at the centre of the window, and
falls symmetrically back. Because the argument `(i + 1) / (period + 1)` always
lies in the open interval `(0, 1)`, every weight is strictly positive, so the
normaliser `Σ w_i` is never zero. The weights are **symmetric**
(`w_i = w_{period−1−i}`), which is the defining property that distinguishes the
SWMA from the linear [`Wma`](Indicator-Wma) (whose weights ramp monotonically to
the newest bar).

Source: `crates/wickra-core/src/indicators/sine_weighted_ma.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= 1`      | `sine_weighted_ma.rs:55` | Window length. `period = 0` errors with `Error::PeriodZero`. `period = 1` collapses to a pass-through (`w_0 = sin(π/2) = 1`). |

(Python class `wickra.SWMA(period)` has no `#[pyo3(signature)]` default; pass
`period` explicitly.)

## Inputs / Outputs

From `crates/wickra-core/src/indicators/sine_weighted_ma.rs`:

```rust
use wickra::{Indicator, SineWeightedMa};
// SineWeightedMa: Input = f64, Output = f64
const _: fn(&mut SineWeightedMa, f64) -> Option<f64> =
    <SineWeightedMa as Indicator>::update;
```

Python returns `float | None` (streaming) / `numpy.ndarray` (batch, `NaN` for
warmup). Node returns `number | null` / `Array<number>` with `NaN`.

## Warmup

`warmup_period()` returns `period`: the window must hold `period` values before
the first dot product is defined, so the first non-`None` output lands on input
`period` (index `period − 1`). This is pinned by the `accessors_and_metadata`
test (`warmup_period() == 7` for `SineWeightedMa::new(7)`) and by
`warmup_returns_none`, which asserts the first two inputs of an SWMA(3) return
`None` and the third returns the weighted value.

## Edge cases

- **Linear window → arithmetic centre.** Because the weights are symmetric, a
  perfectly linear window collapses to the value at its centre. The
  `symmetric_weights_give_midpoint_on_linear_window` test pins
  `SWMA(5)` over `[1,2,3,4,5]` to exactly `3.0`.
- **`period = 1` pass-through.** With one weight `sin(π/2) = 1`, SWMA(1) returns
  the input unchanged — pinned by `period_one_is_pass_through`.
- **NaN / infinity inputs.** Non-finite inputs are ignored: the window is left
  unchanged and the current value is returned, pinned by
  `ignores_non_finite_input_but_keeps_state`.
- **Reset.** `swma.reset()` clears the window; the next `update` restarts the
  warmup countdown — pinned by `reset_clears_state`.
- **Equivalence to a from-scratch fit.** `matches_naive_over_inputs` and the
  `proptest_matches_naive` property test check the streaming output against an
  explicit weighted average recomputed over each trailing window.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, SineWeightedMa};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut swma = SineWeightedMa::new(5)?;
    let prices: Vec<f64> = (1..=20).map(f64::from).collect();
    let out: Vec<Option<f64>> = swma.batch(&prices);
    println!("warmup_period = {}", swma.warmup_period());
    println!("{:?}", out);
    Ok(())
}
```

Output:

```
warmup_period = 5
[None, None, None, None, Some(3.0), Some(4.0), Some(5.0), Some(6.0), Some(7.0), Some(8.0), Some(9.0), Some(10.0), Some(11.0), Some(12.0), Some(13.0), Some(14.0), Some(15.0), Some(16.0), Some(17.0), Some(18.0)]
```

On the linear ramp `1, 2, …, 20` the symmetric weighting reproduces the centre
of each trailing 5-bar window, so the output is the price two bars back — a
clean, lag-only line with no overshoot.

### Python

```python
import numpy as np
import wickra as ta

swma = ta.SWMA(5)
out = swma.batch(np.arange(1.0, 21.0))
print("warmup_period =", swma.warmup_period())
print(out)
```

Output:

```
warmup_period = 5
[nan nan nan nan  3.  4.  5.  6.  7.  8.  9. 10. 11. 12. 13. 14. 15. 16.
 17. 18.]
```

### Node

```javascript
const ta = require('wickra');
const swma = new ta.SWMA(5);
const prices = Array.from({ length: 20 }, (_, i) => i + 1);
console.log(swma.batch(prices));
console.log('warmupPeriod:', swma.warmupPeriod());
```

Output:

```
[
  NaN, NaN, NaN, NaN,  3,  4,
    5,   6,   7,  8,  9, 10,
   11,  12,  13, 14, 15, 16,
   17,  18
]
warmupPeriod: 5
```

### Streaming

```rust
use wickra::{Indicator, SineWeightedMa};

let mut swma = SineWeightedMa::new(3)?;
for price in [1.0, 2.0, 3.0, 4.0] {
    if let Some(v) = swma.update(price) {
        println!("{v:.4}");
    }
}
# Ok::<(), Box<dyn std::error::Error>>(())
```

Output (weights `[√½, 1, √½]`, total `1 + √2`):

```
2.0000
3.0000
```

## Interpretation

The SWMA is the moving average to reach for when you want **even, bias-free
smoothing**. Unlike the EMA or WMA — which both weight the most recent bar most
heavily and therefore react sharply to the latest tick — the SWMA's peak weight
sits at the centre of the window, so a single outlier at either edge has
limited influence. The result is a noticeably smoother line than a `Wma` of the
same period, at the cost of more lag (the effective centre of mass is the middle
of the window, like an [`Sma`](Indicator-Sma), rather than near the front).

Typical uses:

1. **Noise-tolerant trend slope.** The symmetric weighting makes the slope of
   the SWMA a stable trend-direction proxy that whipsaws less than an EMA slope.
2. **Baseline for envelopes/bands.** Its smoothness makes it a good centre line
   for channel constructions where front-loaded MAs would chatter.
3. **Cross-over pairs.** A fast/slow SWMA pair gives cleaner, later signals than
   the equivalent EMA pair.

Prefer [`Ema`](Indicator-Ema) or [`Hma`](Indicator-Hma) when responsiveness
matters more than smoothness; prefer SWMA (or [`Sma`](Indicator-Sma)) when you
want the steadiest possible line.

## Common pitfalls

- **Expecting EMA-like responsiveness.** The centre-weighted window means the
  SWMA lags like an SMA, not like an EMA. It is a smoother, not a fast filter.
- **Reading the leading `NaN`s as lag.** The first `period − 1` outputs are
  warmup, not lag; `warmup_period()` is the exact first-emission index and can
  be used directly for [`Chain`](Indicators-Overview) alignment.

## References

The sine-weighted moving average is a long-standing variant in the technical
analysis literature; the symmetric sine kernel `sin(π·k/(n+1))` is the standard
formulation used by charting platforms (e.g. the "Sine Weighted MA" study).

## See also

- [Indicator-Wma](Indicator-Wma) — linear (front-loaded) weights, the asymmetric counterpart.
- [Indicator-Sma](Indicator-Sma) — flat weights; the SWMA sits between SMA and WMA in smoothness.
- [Indicator-Alma](Indicator-Alma) — Gaussian-weighted window with an adjustable offset.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
