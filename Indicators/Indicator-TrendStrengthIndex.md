# TrendStrengthIndex

> Trend Strength Index — the signed coefficient of determination (`r²`) of a
> linear regression of price against time: how cleanly, and in which direction,
> the window trends.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trend & Directional |
| Input type | `f64` (single price, usually the close) |
| Output type | `f64` |
| Output range | `[-1, +1]`; `+1` clean uptrend, `-1` clean downtrend, `0` flat/noisy |
| Default parameters | `period` is required |
| Warmup period (`warmup_period()`) | `period` |
| Interpretation | Linear trend quality (`r²`), polarised by the regression slope. |

## Formula

```
regress y = close on x = 0..period-1
cov   = n·Σxy − Σx·Σy
r²    = cov² / [ (n·Σx² − (Σx)²)(n·Σy² − (Σy)²) ]
TSI   = sign(cov) · r²        (sign(cov) is the sign of the slope)
```

The coefficient of determination `r² ∈ [0, 1]` is the fraction of the price
variance explained by a straight line over the window — a pure measure of how
*linear* (trendy) the segment is, independent of direction. Multiplying by the
slope's sign polarizes it into `[-1, 1]`: `+1` is a perfectly straight uptrend,
`-1` a perfectly straight downtrend, and values near `0` mean the window has no
linear structure (flat or noisy). A constant window (zero `y`-variance) has no
defined trend and returns `0`.

Source: `crates/wickra-core/src/indicators/trend_strength_index.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= 2`      | `trend_strength_index.rs:52` | Regression window. `0` errors with `Error::PeriodZero`; `1` errors with `Error::InvalidPeriod` (a regression needs two points). |

(Python class `wickra.TREND_STRENGTH_INDEX(period)`; Node
`new ta.TREND_STRENGTH_INDEX(period)`.)

## Inputs / Outputs

From `crates/wickra-core/src/indicators/trend_strength_index.rs`:

```rust
use wickra::{Indicator, TrendStrengthIndex};
// TrendStrengthIndex: Input = f64, Output = f64
const _: fn(&mut TrendStrengthIndex, f64) -> Option<f64> =
    <TrendStrengthIndex as Indicator>::update;
```

Scalar in, scalar out. Python returns `float | None` (streaming) /
`array.array('d')` (batch, `NaN` for warmup). Node returns `number | null` /
`Array<number>` with `NaN`.

## Warmup

`warmup_period()` returns `period`: the regression needs a full window before
the first reading (bar `period`, index `period − 1`). Pinned by
`accessors_and_metadata` (`warmup_period() == 20`) and `warmup_emits_at_period`.

## Edge cases

- **Perfect uptrend.** `perfect_uptrend_is_plus_one` feeds a unit ramp; the fit
  is exact (`r² = 1`) with a positive slope → `+1`.
- **Perfect downtrend.** `perfect_downtrend_is_minus_one` feeds a falling ramp →
  `-1`.
- **Flat market.** `flat_market_returns_zero`: zero price variance → `0` (the
  `var_y <= 0` guard).
- **Noisy trend.** `noisy_trend_is_between`: an upward drift with a sawtooth
  gives a positive reading strictly inside `(0, 1)`.
- **Reset.** `reset_clears_state` empties the window buffer.
- **Streaming/batch:** `batch_equals_streaming`.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, TrendStrengthIndex};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut tsi = TrendStrengthIndex::new(10)?;
    // A clean ramp is a perfect uptrend -> r^2 = 1.
    let closes: Vec<f64> = (0..10).map(f64::from).collect();
    let last = tsi.batch(&closes).into_iter().flatten().last().unwrap();
    println!("{last}");
    Ok(())
}
```

Output:

```
1
```

A straight line fits the ramp exactly, so `r²` is `1` and the positive slope
keeps the sign positive.

### Python

```python
import numpy as np
import wickra as ta

tsi = ta.TREND_STRENGTH_INDEX(10)
closes = np.arange(10, dtype=float)
out = tsi.batch(closes)   # NaN through warmup, then 1.0
print(out[-1])            # 1.0
```

Output:

```
1.0
```

### Node

```javascript
const ta = require('wickra');
const tsi = new ta.TREND_STRENGTH_INDEX(10);
let last = null;
for (let i = 0; i < 10; i++) last = tsi.update(i);
console.log(last); // 1
```

Output:

```
1
```

### Streaming

```rust
use wickra::{Indicator, TrendStrengthIndex};

let mut tsi = TrendStrengthIndex::new(20)?;
let mut last = None;
for i in 0..60 {
    last = tsi.update(100.0 + (f64::from(i) * 0.2).sin() * 5.0);
}
println!("{last:?}");
# Ok::<(), Box<dyn std::error::Error>>(())
```

## Interpretation

TSI answers "is there a trend, how strong, and which way?" in a single number:

1. **Magnitude = trend quality.** `|TSI|` near `1` means a clean, linear move;
   near `0` means no linear structure (range or noise).
2. **Sign = direction.** Positive is an uptrend, negative a downtrend.
3. **Regime filter.** Enable trend-following only when `|TSI|` is above a
   threshold (e.g. `0.5`); fall back to mean-reversion when it is near zero.
4. **Slope of TSI.** A rising `|TSI|` means the trend is becoming more linear
   (strengthening); a falling one warns the move is breaking down into noise.

## Common pitfalls

- **It is not momentum.** TSI measures linearity, not speed: a slow but perfectly
  straight drift scores `±1`, while a fast but jagged move scores lower.
- **Window sensitivity.** `r²` is highly dependent on `period`; a short window
  finds local trends, a long one only the dominant one.
- **Confusing it with the True Strength Index.** This is a regression-`r²` trend
  gauge, unrelated to the momentum-based True Strength Index.

## References

The coefficient of determination `r²` of ordinary least squares — the standard
statistical measure of linear fit, applied here as a directional trend-strength
gauge.

## See also

- [Indicator-LinearRegression](/Indicators/Indicator-LinearRegression) — the fitted regression line itself.
- [Indicator-ChoppinessIndex](/Indicators/Indicator-ChoppinessIndex) — a complementary trend-vs-range gauge.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
