# FRAMA

> Ehlers' Fractal Adaptive Moving Average — an EMA whose smoothing constant
> tracks the fractal dimension of the recent window.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Moving Averages |
| Input type | `f64` (single close) |
| Output type | `f64` |
| Output range | unbounded; tracks the input price scale |
| Default parameters | `period = 16` (must be even, `>= 2`) |
| Warmup period | `period` |
| Interpretation | Tight tracking in trends (low D), heavy smoothing in chop (high D). |

## Formula

Split the `period`-window of closes into two equal halves:

```
N1 = (max(first  half) − min(first  half)) / (period / 2)
N2 = (max(second half) − min(second half)) / (period / 2)
N3 = (max(window)      − min(window))      / period

D       = (log(N1 + N2) − log(N3)) / log(2)
alpha   = exp(−4.6 · (D − 1))            // clamped to [0.01, 1.0]
FRAMA_t = alpha · close_t + (1 − alpha) · FRAMA_{t-1}
```

Wickra uses the **close-only** variant (max/min over closes in each half),
matching the `pandas-ta`-style port. The pure Ehlers paper uses bar
`high`/`low`; the close-only form keeps the binding surface a scalar
indicator without giving up the fractal adaptivity.

## Parameters

| Name     | Type    | Default | Constraint   | Source |
|----------|---------|---------|--------------|--------|
| `period` | `usize` | `16`    | even, `>= 2` | `Frama::new` (`frama.rs:54`) |

`period == 0` returns [`Error::PeriodZero`]; an odd period or `period < 2`
returns [`Error::InvalidPeriod`]. Python default comes from
`#[pyo3(signature = (period=16))]`; the Node constructor takes `period`
explicitly. The public class is `FRAMA` in both bindings.

## Inputs / Outputs

```rust
use wickra::{Indicator, Frama};
// Frama: Input = f64, Output = f64
const _: fn(&mut Frama, f64) -> Option<f64> = <Frama as Indicator>::update;
```

A single `f64` close in, an `Option<f64>` out. Python maps this to
`float | None` / an `array.array('d')` with `NaN` warmup; Node to
`number | null` / `Array<number>`.

## Warmup

`warmup_period()` returns `period`. The window must hold a full `period`
closes before the fractal dimension is defined, so the first output lands on
input `period` (index `period − 1`); it is seeded with that bar's close and
the recurrence iterates from there. Pinned by `warmup_emits_first_value_at_period`.

## Edge cases

- **Constant series.** Zero ranges in both halves make the fractal dimension
  undefined; `alpha` falls back to the slow-end clamp `0.01` and the EMA
  recurrence holds the seed exactly (test `constant_series_yields_the_constant`).
- **Degenerate windows.** If any of `N1`, `N2`, `N3` is zero (a flat half or
  whole window), `log(0)` is avoided by the same `alpha = 0.01` fallback
  (`frama.rs:138`).
- **Pure trend.** A clean monotone move has fractal dimension ≈ 1, so `alpha`
  → `1.0` and FRAMA reduces to the latest close (test
  `pure_uptrend_alpha_close_to_one`).
- **Non-finite input.** `NaN` / `±∞` are ignored.
- **Reset.** `reset()` clears the window and the running value.

## Examples

### Rust

```rust
use wickra::{BatchExt, Frama, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut frama = Frama::new(4)?; // even, >= 2
    let prices: Vec<f64> = (1..=8).map(f64::from).collect(); // clean uptrend
    // alpha → 1 on a clean trend, so FRAMA hugs the latest close (≈ 8.0).
    println!("{:?}", frama.batch(&prices).into_iter().flatten().last());
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

frama = ta.FRAMA(16)
out = frama.batch(np.array([...], dtype=float))  # 1-D, NaN for the first 15 rows
```

### Node

```javascript
const ta = require('wickra');
const frama = new ta.FRAMA(16);
const out = frama.update(101.5); // null during warmup, else a number
```

## Interpretation

FRAMA reads the *texture* of recent price — its fractal dimension — and
adapts:

1. **Trending markets (low D ≈ 1).** `alpha` rises toward 1, so FRAMA
   follows price tightly with little lag.
2. **Choppy markets (high D ≈ 2).** `alpha` collapses toward `0.01`, so FRAMA
   flattens and rejects noise.

This makes it a single-line trend filter that needs no separate
range/trend regime detector — the adaptation is built in.

## Common pitfalls

- **Passing an odd period.** The window is split into two equal halves, so
  `period` must be even — the constructor rejects odd values.
- **Reading the high-D flattening as a stale indicator.** A frozen FRAMA in
  chop is the design intent; it resumes tracking the moment a trend resumes.

## References

- John F. Ehlers, "FRAMA — Fractal Adaptive Moving Average", 2005.

## See also

- [Vidya](/Indicators/Indicator-Vidya) — momentum-gated adaptive MA.
- [Kama](/Indicators/Indicator-Kama) — efficiency-ratio-gated adaptive MA.
- [Ema](/Indicators/Indicator-Ema) — FRAMA's behaviour at `alpha → 1`.
- [HurstExponent](/Indicators/Indicator-HurstExponent) — the fractal/Hurst measure FRAMA
  implicitly uses.
