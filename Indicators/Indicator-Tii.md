# TII

> M.H. Pee's Trend Intensity Index — the share of the most recent
> `dev_period` SMA-deviations that sit on the positive side, scaled to
> `[0, 100]`. Saturates at the extremes on sustained trends.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trend & Directional |
| Input type | `f64` (single close) |
| Output type | `f64` |
| Output range | `[0, 100]` |
| Default parameters | `sma_period = 60`, `dev_period = 30` |
| Warmup period | `sma_period + dev_period − 1` (`89` for defaults) |
| Interpretation | `> 80` strong uptrend, `< 20` strong downtrend, `50` flat / no trend. |

## Formula

Given an `SMA(close, sma_period)`, for each bar `t` past warmup compute the
deviation `dev_t = close_t − SMA_t`. Then over the most recent `dev_period`
deviations:

```
SD_pos = Σ_{i in window, dev_i > 0}  dev_i
SD_neg = Σ_{i in window, dev_i < 0}  |dev_i|
TII    = 100 · SD_pos / (SD_pos + SD_neg)
```

A perfectly flat window (every `dev_i == 0`) returns the neutral mid-point
`50`. The output is clamped to `[0, 100]` against floating-point drift in the
rolling subtractions. Pee's canonical setup uses `dev_period = sma_period / 2`.

## Parameters

| Name         | Type    | Default | Constraint | Source |
|--------------|---------|---------|------------|--------|
| `sma_period` | `usize` | `60`    | `>= 1`     | `Tii::new` (`tii.rs:66`) |
| `dev_period` | `usize` | `30`    | `>= 1`     | `tii.rs:66` |

Either parameter `== 0` returns [`Error::PeriodZero`]. Python defaults come
from `#[pyo3(signature = (sma_period=60, dev_period=30))]`; the Node
constructor takes both explicitly. The public class is `TII` in both bindings.

## Inputs / Outputs

```rust
use wickra::{Indicator, Tii};
// Tii: Input = f64, Output = f64
const _: fn(&mut Tii, f64) -> Option<f64> = <Tii as Indicator>::update;
```

A single `f64` close in, an `Option<f64>` out in `[0, 100]`. Python maps this
to `float | None` / a `float64` `np.ndarray` with `NaN` warmup; Node to
`number | null` / `Array<number>`.

## Warmup

`warmup_period()` returns `sma_period + dev_period − 1`. The SMA emits at
input `sma_period`; the deviation ring then needs `dev_period − 1` more
inputs to fill, so the first TII lands at `sma_period + dev_period − 1` (`89`
for the defaults). Pinned by `first_emission_at_warmup_period`.

## Edge cases

- **Pure uptrend.** Every close sits above the lagging SMA ⇒ every deviation
  positive ⇒ TII `= 100` (test `pure_uptrend_saturates_at_100`).
- **Pure downtrend.** Every close below the SMA ⇒ TII `= 0` (test
  `pure_downtrend_falls_to_zero`).
- **Flat series.** Every deviation `0` ⇒ neutral `50` (test
  `constant_series_yields_neutral_50`).
- **Bounded.** Always within `[0, 100]` (test `output_bounded_in_unit_interval`).
- **Reset.** `reset()` clears the SMA, the deviation window and both sums.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, Tii};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Strict uptrend: every close above the lagging SMA → TII saturates at 100.
    let prices: Vec<f64> = (1..=80).map(|i| 100.0 + f64::from(i)).collect();
    let mut t = Tii::new(10, 5)?;
    println!("{:?}", t.batch(&prices).into_iter().flatten().last()); // Some(100.0)
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

t = ta.TII(60, 30)
out = t.batch(np.array([...], dtype=float))  # 1-D in [0, 100], NaN for first 88 rows
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.TII(60, 30);
const v = t.update(101.5); // null during warmup, else a value in [0, 100]
```

## Interpretation

TII frames "how one-sided is price relative to its trend?" as a `0–100`
percentage:

1. **Trend confirmation.** Above `80` the recent closes are overwhelmingly
   above the SMA — a confirmed uptrend; below `20` a confirmed downtrend.
2. **Range detection.** Readings hovering near `50` mean positive and
   negative deviations roughly cancel — a trendless, mean-reverting regime
   where trend-following entries should be avoided.

Unlike [Adx](/Indicators/Indicator-Adx), TII is referenced to a moving average, so it
answers a slightly different question: not "is there a trend?" but "is price
persistently on one side of its mean?".

## Common pitfalls

- **Reading direction below the SMA.** A low TII means closes are mostly
  *below* the SMA — it is directional, unlike ADX which is direction-agnostic.
- **Using a tiny `sma_period`.** Pee's design is long-horizon
  (`60`/`30`); short periods make the deviation sign flip constantly and the
  index hover near `50`.

## References

- M.H. Pee, "Trend Intensity Index", *Technical Analysis of Stocks &
  Commodities*, June 2002.

## See also

- [Adx](/Indicators/Indicator-Adx) — directional-strength complement (no MA reference).
- [VerticalHorizontalFilter](/Indicators/Indicator-VerticalHorizontalFilter) — range-based
  trend-strength filter.
- [ChoppinessIndex](/Indicators/Indicator-ChoppinessIndex) — trend-vs-range gauge.
