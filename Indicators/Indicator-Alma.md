# ALMA

> Arnaud Legoux Moving Average — a Gaussian-weighted moving average over the
> last `period` closes, with the kernel centred at `offset · (period − 1)`
> and width controlled by `sigma`.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Moving Averages |
| Input type | `f64` (single close) |
| Output type | `f64` |
| Output range | unbounded; tracks the input price scale |
| Default parameters | `period = 9`, `offset = 0.85`, `sigma = 6.0` |
| Warmup period | `period` |
| Interpretation | Smoother than `Sma`, more responsive than `Ema` once `offset` is tilted toward 1.0. |

## Formula

```
m    = offset · (period − 1)
s    = period / sigma
w[i] = exp(−(i − m)² / (2 · s²))   for i in 0..period
ALMA = Σ price[i] · w[i] / Σ w[i]
```

`offset = 0.85` puts the kernel peak near the newest sample (responsive);
`offset = 0.5` centres it in the middle of the window (smooth). Larger
`sigma` produces a narrower kernel (sharper weighting); smaller `sigma`
broadens it toward an `Sma`. Wickra pre-computes the normalised weights at
construction, so each `update()` is a single rolling-window dot product.

## Parameters

| Name     | Type    | Default | Constraint   | Source |
|----------|---------|---------|--------------|--------|
| `period` | `usize` | `9`     | `>= 1`       | `Alma::new` (`alma.rs:64`) |
| `offset` | `f64`   | `0.85`  | finite, `[0, 1]` | `alma.rs:68` |
| `sigma`  | `f64`   | `6.0`   | finite, `> 0`    | `alma.rs:73` |

`period == 0` returns [`Error::PeriodZero`]; an `offset` outside `[0, 1]` or
a non-positive `sigma` returns [`Error::InvalidPeriod`]. `Alma::classic()`
returns `(9, 0.85, 6.0)`. Python defaults come from
`#[pyo3(signature = (period=9, offset=0.85, sigma=6.0))]`; the Node
constructor takes all three explicitly. The public class is `ALMA` in both
bindings.

## Inputs / Outputs

```rust
use wickra::{Indicator, Alma};
// Alma: Input = f64, Output = f64
const _: fn(&mut Alma, f64) -> Option<f64> = <Alma as Indicator>::update;
```

A single `f64` close in, an `Option<f64>` out. Python maps this to
`float | None` / a `float64` `np.ndarray` with `NaN` warmup; Node to
`number | null` / `Array<number>`.

## Warmup

`warmup_period()` returns `period`. There is no internal seeding stage — the
rolling window must simply fill, so the first non-`None` output lands on
input `period` (index `period − 1`). Pinned by
`warmup_emits_first_value_at_period`.

## Edge cases

- **Constant series.** The weights are normalised to sum to `1`, so any
  constant input is reproduced exactly from the first emission (test
  `constant_series_yields_the_constant`).
- **`offset = 0`.** The kernel peaks on the *oldest* sample, so ALMA leans
  below the window mean (test `offset_zero_centres_on_oldest_sample`).
- **`offset = 1`.** The kernel peaks on the *newest* sample, so ALMA leans
  above the mean (test `offset_one_centres_on_newest_sample`).
- **Non-finite input.** `NaN` / `±∞` are ignored.
- **Reset.** `reset()` clears the window (the pre-computed weights persist).

## Examples

### Rust

```rust
use wickra::{Alma, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // ALMA(3, 0.85, 6.0) on [10, 20, 30] is skewed toward the newest sample,
    // so it lands between 25 and 30.
    let mut alma = Alma::new(3, 0.85, 6.0)?;
    alma.update(10.0);
    alma.update(20.0);
    println!("{:?}", alma.update(30.0)); // Some(≈ 28.6)
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

alma = ta.ALMA(9, 0.85, 6.0)
out = alma.batch(np.array([...], dtype=float))  # 1-D, NaN for the first 8 rows
```

### Node

```javascript
const ta = require('wickra');
const alma = new ta.ALMA(9, 0.85, 6.0);
const out = alma.update(101.5); // null during warmup, else a number
```

## Interpretation

ALMA sits between an SMA and an EMA, with the trade-off exposed as two knobs:

1. **`offset` = lag vs smoothness.** Tilt toward `1.0` for a responsive,
   low-lag line; toward `0.5` for a smooth, SMA-like line. `0.85` is the
   community default that keeps most of the responsiveness with little
   overshoot.
2. **`sigma` = kernel sharpness.** A larger `sigma` concentrates the weight
   (sharper, more reactive); a smaller one spreads it (smoother).

Because the Gaussian has no long tail, ALMA produces noticeably less
overshoot than an EMA at comparable responsiveness.

## Common pitfalls

- **Setting `offset > 1` or `< 0`.** It is a *fraction* of the window, not a
  bar count; the constructor rejects out-of-range values.
- **Confusing `sigma` direction.** Larger `sigma` makes the kernel *narrower*
  (more reactive), which is the opposite of the usual "bigger = smoother"
  intuition.

## References

- Arnaud Legoux & Dimitrios Kouzis-Loukas, "ALMA — Arnaud Legoux Moving
  Average", 2009. The `(9, 0.85, 6.0)` defaults are the community standard.

## See also

- [Sma](/Indicators/Indicator-Sma) — ALMA at low `sigma` / centred offset.
- [Ema](/Indicators/Indicator-Ema) — comparable responsiveness, more overshoot.
- [Wma](/Indicators/Indicator-Wma) — linear (non-Gaussian) weighting.
- [Hma](/Indicators/Indicator-Hma) — another low-lag smoother.
