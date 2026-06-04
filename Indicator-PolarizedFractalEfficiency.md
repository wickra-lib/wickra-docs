# PolarizedFractalEfficiency

> Polarized Fractal Efficiency (PFE) — how efficiently price travelled over the
> lookback, signed by direction: `+100` for a clean up-move, `-100` for a clean
> down-move, near zero for chop.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trend & Directional |
| Input type | `f64` (single price, usually the close) |
| Output type | `f64` |
| Output range | `(-100, +100)`; `+100` efficient up, `-100` efficient down, `0` choppy/flat |
| Default parameters | `period` and `smoothing` are required |
| Warmup period (`warmup_period()`) | `period + smoothing` |
| Interpretation | Trend efficiency / "fractal" straightness, polarised by direction. |

## Formula

```
straight = sqrt((C_t - C_{t-n})^2 + n^2)                  (direct n-bar distance)
path     = Σ_{i=1..n} sqrt((C_{t-i+1} - C_{t-i})^2 + 1)   (sum of single-bar steps)
raw      = 100 * sign(C_t - C_{t-n}) * straight / path
PFE      = EMA(raw, smoothing)
```

PFE measures the ratio of the straight-line distance price covered over `n` bars
to the actual jagged path it took. Treating each bar as one unit on the x-axis,
a perfectly straight ramp makes `straight == path` (efficiency `1`), while a
choppy market makes the path much longer than the diagonal (efficiency toward
`0`). Multiplying by `100 * sign(net move)` *polarizes* the reading: efficient
up-moves push toward `+100`, efficient down-moves toward `-100`, and chop
oscillates near zero. The EMA smooths the raw efficiency. Because every step and
the diagonal both carry the bar count (`+1`, `+n^2`), the path length is always
`>= n`, so the denominator is never zero.

Source: `crates/wickra-core/src/indicators/polarized_fractal_efficiency.rs`.

## Parameters

| Name        | Type    | Default | Valid range | Source | Description |
|-------------|---------|---------|-------------|--------|-------------|
| `period`    | `usize` | none    | `>= 1`      | `polarized_fractal_efficiency.rs:59` | Fractal lookback `n`. `0` errors with `Error::PeriodZero`. |
| `smoothing` | `usize` | none    | `>= 1`      | `polarized_fractal_efficiency.rs:59` | EMA period applied to the raw efficiency. `0` errors. |

(Python class `wickra.POLARIZED_FRACTAL_EFFICIENCY(period, smoothing)`; Node
`new ta.POLARIZED_FRACTAL_EFFICIENCY(period, smoothing)`. Hannula's original used
`period = 10`, `smoothing = 5`.)

## Inputs / Outputs

From `crates/wickra-core/src/indicators/polarized_fractal_efficiency.rs`:

```rust
use wickra::{Indicator, PolarizedFractalEfficiency};
// PolarizedFractalEfficiency: Input = f64, Output = f64
const _: fn(&mut PolarizedFractalEfficiency, f64) -> Option<f64> =
    <PolarizedFractalEfficiency as Indicator>::update;
```

Scalar in, scalar out. Python returns `float | None` (streaming) /
`numpy.ndarray` (batch, `NaN` for warmup). Node returns `number | null` /
`Array<number>` with `NaN`.

## Warmup

`warmup_period()` returns `period + smoothing`: the raw efficiency needs
`period + 1` closes (its first value at input `period + 1`), then the EMA needs
`smoothing` raws to seed. Pinned by `accessors_and_metadata`
(`warmup_period() == 15`) and `warmup_emits_after_period_plus_smoothing`.

## Edge cases

- **Perfect uptrend.** `perfect_uptrend_is_strongly_positive` feeds a unit ramp;
  the diagonal and the path are both `n·√2`, so the efficiency is exactly `1`
  and PFE saturates at `+100`.
- **Perfect downtrend.** `perfect_downtrend_is_strongly_negative` mirrors that to
  `-100`.
- **Flat market.** `flat_market_returns_zero`: no net move over the window →
  `sign == 0` → raw `0` → PFE `0`.
- **Choppy whip.** `choppy_market_is_inefficient`: a sawtooth keeps `|PFE|` well
  below the `±100` saturation of a clean trend.
- **Reset.** `reset_clears_state` clears the close buffer, the segment sum and
  the EMA, preserving the configured periods.
- **Streaming/batch:** `batch_equals_streaming`.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, PolarizedFractalEfficiency};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut pfe = PolarizedFractalEfficiency::new(5, 3)?;
    // A clean unit ramp is maximally efficient -> PFE saturates at +100.
    let closes: Vec<f64> = (0..20).map(f64::from).collect();
    let last = pfe.batch(&closes).into_iter().flatten().last().unwrap();
    println!("{last}");
    Ok(())
}
```

Output:

```
100
```

On a straight ramp the diagonal `√(n² + n²)` equals the path `n·√2`, so the
efficiency is `1` and the polarized, EMA-smoothed value sits at `+100`.

### Python

```python
import numpy as np
import wickra as ta

pfe = ta.POLARIZED_FRACTAL_EFFICIENCY(5, 3)
closes = np.arange(20, dtype=float)
out = pfe.batch(closes)   # NaN through warmup, then 100.0
print(out[-1])            # 100.0
```

Output:

```
100.0
```

### Node

```javascript
const ta = require('wickra');
const pfe = new ta.POLARIZED_FRACTAL_EFFICIENCY(5, 3);
let last = null;
for (let i = 0; i < 20; i++) last = pfe.update(i);
console.log(last); // 100
```

Output:

```
100
```

### Streaming

```rust
use wickra::{Indicator, PolarizedFractalEfficiency};

let mut pfe = PolarizedFractalEfficiency::new(10, 5)?;
let mut last = None;
for i in 0..60 {
    last = pfe.update(100.0 + (f64::from(i) * 0.3).sin() * 5.0);
}
println!("{last:?}");
# Ok::<(), Box<dyn std::error::Error>>(())
```

## Interpretation

PFE separates *how far* price went from *how efficiently* it got there:

1. **Magnitude = trend quality.** Readings near `±100` mean an efficient,
   straight-line move — a strong, tradeable trend. Readings near zero mean the
   path was jagged relative to the net move (chop).
2. **Sign = direction.** Positive readings polarize an up-move, negative a
   down-move.
3. **Zero line as a regime switch.** Sustained readings far from zero favour
   trend-following; persistent near-zero readings favour mean-reversion or
   standing aside.
4. **Threshold bands.** Many traders treat `|PFE| > 50` (after smoothing) as
   "trending" and the band around zero as "ranging".

## Common pitfalls

- **Treating it as overbought/oversold.** PFE is an *efficiency* gauge, not an
  RSI; a reading of `+100` is a strong trend, not a sell signal.
- **Smoothing trade-off.** A larger `smoothing` removes whipsaw but delays the
  turn; tune it against the `period` for the timeframe.
- **Input choice.** PFE is defined on a single price series (the close); feeding
  a different series changes the efficiency it measures.

## References

Hans Hannula, "Polarized Fractal Efficiency", *Technical Analysis of Stocks &
Commodities*, 1994.

## See also

- [Indicator-Ema](Indicator-Ema) — the smoothing applied to the raw efficiency.
- [Indicator-ChoppinessIndex](Indicator-ChoppinessIndex) — a complementary trend-vs-range gauge.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
