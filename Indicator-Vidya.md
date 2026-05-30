# VIDYA

> Variable Index Dynamic Average — Chande's EMA whose smoothing factor is
> scaled by the absolute Chande Momentum Oscillator (CMO).

## Quick reference

| Field | Value |
|-------|-------|
| Family | Moving Averages |
| Input type | `f64` (single close) |
| Output type | `f64` |
| Output range | unbounded; tracks the input price scale |
| Default parameters | `period = 14`, `cmo_period = 9` |
| Warmup period | `cmo_period + 1` |
| Interpretation | Adapts to momentum: tight tracking when momentum is strong, coasts when momentum is weak. |

## Formula

```
alpha_base = 2 / (period + 1)                    // standard EMA alpha
alpha_t    = alpha_base · |CMO(cmo_period)| / 100
VIDYA_t    = alpha_t · price_t + (1 − alpha_t) · VIDYA_{t-1}
```

Strong directional momentum (|CMO| near 100) drives `alpha` toward the
EMA-of-`period`'s natural rate; flat or balanced markets (|CMO| near 0)
shrink `alpha` toward zero, so VIDYA freezes on its prior value rather than
chasing noise. Wickra reuses the existing [Cmo](Indicator-Cmo) indicator
internally; the streaming and batch paths share the same state machine.

## Parameters

| Name         | Type    | Default | Constraint | Source |
|--------------|---------|---------|------------|--------|
| `period`     | `usize` | `14`    | `>= 1`     | `Vidya::new` (`vidya.rs:50`) |
| `cmo_period` | `usize` | `9`     | `>= 1`     | `vidya.rs:50` |

Either parameter `== 0` returns [`Error::PeriodZero`]. Python defaults come
from `#[pyo3(signature = (period=14, cmo_period=9))]`; the Node constructor
takes both arguments explicitly. The public class is `VIDYA` in both bindings.

## Inputs / Outputs

```rust
impl Indicator for Vidya {
    type Input  = f64;
    type Output = f64;
    fn update(&mut self, input: f64) -> Option<f64>;
}
```

A single `f64` close in, an `Option<f64>` out. Python maps this to
`float | None` / a `float64` `np.ndarray` with `NaN` warmup; Node to
`number | null` / `Array<number>`.

## Warmup

`warmup_period()` returns `cmo_period + 1`: the inner [Cmo](Indicator-Cmo)
needs `cmo_period` price *changes* (i.e. `cmo_period + 1` prices) before it
emits. Pinned by `warmup_emits_first_value_at_cmo_period_plus_one`
(cmo_period 3 → warmup 4: first three updates `None`, fourth emits).

## Edge cases

- **Constant series.** `CMO = 0` ⇒ `alpha = 0` ⇒ `VIDYA = VIDYA_{t-1}`; once
  seeded, a flat series is reproduced exactly (test
  `constant_series_yields_the_constant`).
- **Pure trend.** `|CMO|` saturates at `100`, so `alpha = alpha_base` and
  VIDYA behaves as a plain `EMA(period)` (test `pure_uptrend_alpha_equals_base`).
- **Non-finite input.** `NaN` / `±∞` are ignored; the previous value is
  returned (test `ignores_non_finite_input`).
- **Reset.** `reset()` resets the inner CMO and clears the running value.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, Vidya};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prices: Vec<f64> = (1..=60)
        .map(|i| 100.0 + (f64::from(i) * 0.2).sin() * 5.0)
        .collect();
    let mut v = Vidya::new(14, 9)?;
    println!("{:?}", v.batch(&prices).into_iter().flatten().last());
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

v = ta.VIDYA(14, 9)
out = v.batch(np.array([...], dtype=float))  # 1-D series, NaN for the first 9 rows
```

### Node

```javascript
const ta = require('wickra');
const v = new ta.VIDYA(14, 9);
const out = v.update(101.5); // null during warmup, else a number
```

## Interpretation

VIDYA is a momentum-gated EMA — it moves like a fast average when a trend is
underway and like a slow one (effectively freezing) in chop:

1. **Trend following with noise rejection.** In a strong move it tracks price
   closely; in a range it flattens, cutting the whipsaw that a fixed EMA
   suffers.
2. **Crossover signals.** Price crossing VIDYA is a higher-quality signal
   than crossing a fixed EMA precisely because VIDYA does not chase sideways
   noise.

## Common pitfalls

- **Expecting EMA-speed in quiet markets.** By design VIDYA *slows down* when
  momentum is low; that lag is the feature, not a bug.
- **Confusing the two periods.** `period` sets the maximum (EMA) speed;
  `cmo_period` sets how momentum is measured and gates the actual speed.

## References

- Tushar Chande, "Variable Index Dynamic Average", *Technical Analysis of
  Stocks & Commodities*, 1992.

## See also

- [Cmo](Indicator-Cmo) — the momentum oscillator that gates the smoothing.
- [Ema](Indicator-Ema) — VIDYA's behaviour at full momentum.
- [Kama](Indicator-Kama) — Kaufman's efficiency-ratio-gated adaptive MA, a
  close cousin.
- [Frama](Indicator-Frama) — fractal-dimension-gated adaptive MA.
