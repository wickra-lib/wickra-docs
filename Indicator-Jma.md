# JMA

> Jurik Moving Average — three-stage filter reconstruction of Mark Jurik's
> proprietary adaptive MA. Smoother than `EMA(period)` with less phase lag.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Moving Averages |
| Input type | `f64` (single close) |
| Output type | `f64` |
| Output range | unbounded; tracks the input price scale |
| Default parameters | `period = 14`, `phase = 0`, `power = 2` |
| Warmup period | `1` |
| Interpretation | Smoother than `Ema(period)` with less phase lag at the same effective period. |

## Formula

```
beta        = 0.45 · (period − 1) / (0.45 · (period − 1) + 2)
alpha       = beta ^ power
phase_ratio = clamp(phase / 100 + 1.5, 0.5, 2.5)

e0_t  = (1 − alpha) · x_t + alpha · e0_{t-1}
e1_t  = (x_t − e0_t) · (1 − beta) + beta · e1_{t-1}
e2_t  = (e0_t + phase_ratio · e1_t − JMA_{t-1}) · (1 − alpha)² + alpha² · e2_{t-1}
JMA_t = JMA_{t-1} + e2_t
```

Jurik Research has never published the original algorithm; the form above is
the widely-circulated three-stage filter reconstruction used by `pandas-ta`,
the TradingView Pine `jma` libraries, and most MQL ports. The Wickra source
docstring documents this lineage.

## Parameters

| Name     | Type    | Default | Constraint              | Source |
|----------|---------|---------|-------------------------|--------|
| `period` | `usize` | `14`    | `>= 1`                  | `Jma::new` (`jma.rs:66`) |
| `phase`  | `f64`   | `0`     | finite; clamped to `[-100, 100]` | `jma.rs:70` |
| `power`  | `u32`   | `2`     | `1..=4`                 | `jma.rs:75` |

`period == 0` returns [`Error::PeriodZero`]; a non-finite `phase` or a
`power` outside `1..=4` returns [`Error::InvalidPeriod`]. `Jma::classic()`
returns `(14, 0.0, 2)`. Python defaults come from
`#[pyo3(signature = (period=14, phase=0.0, power=2))]`; the Node constructor
takes all three explicitly. The public class is `JMA` in both bindings.

## Inputs / Outputs

```rust
impl Indicator for Jma {
    type Input  = f64;
    type Output = f64;
    fn update(&mut self, input: f64) -> Option<f64>;
}
```

A single `f64` close in, an `Option<f64>` out. Python maps this to
`float | None` / a `float64` `np.ndarray` with `NaN` warmup; Node to
`number | null` / `Array<number>`.

## Warmup

`warmup_period()` returns `1`. The state is seeded by setting
`e0 = JMA = first input`, so JMA emits a value on the *very first* `update()`
and never returns `None` after that. There is no fill-the-window phase.

## Edge cases

- **Constant series.** With the `e0 = JMA = first input` seed, `e1` and `e2`
  stay at `0`, so `JMA_t = JMA_{t-1}` holds the constant forever (test
  `constant_series_yields_the_constant`).
- **Extreme phase.** `phase` outside `[-100, 100]` clamps the `phase_ratio`
  to `[0.5, 2.5]` rather than failing or diverging (test
  `extreme_phase_is_clamped`).
- **`period = 1`.** `beta = alpha = 0`, so the recurrence reduces to a
  pass-through `JMA_t = input` (test `period_one_is_pass_through`).
- **Non-finite input.** `NaN` / `±∞` are ignored (test `ignores_non_finite_input`).
- **Reset.** `reset()` zeroes the three filter stages and the output.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, Jma};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prices: Vec<f64> = (1..=80).map(f64::from).collect();
    let mut jma = Jma::classic(); // (14, 0.0, 2)
    // Emits from the first bar (warmup 1); tracks a clean uptrend closely.
    println!("{:?}", jma.batch(&prices).into_iter().flatten().last());
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

jma = ta.JMA(14, 0.0, 2)
out = jma.batch(np.arange(1, 81, dtype=float))  # emits from row 0 (warmup 1)
```

### Node

```javascript
const ta = require('wickra');
const jma = new ta.JMA(14, 0.0, 2);
console.log(jma.update(100)); // emits immediately (warmup 1)
```

## Interpretation

JMA targets the classic smoothing trade-off — lag vs noise — more
aggressively than a plain EMA:

1. **Trend line.** Use it as a low-lag trend filter; at the same effective
   `period` it lags less than an EMA while staying smoother.
2. **`phase` tuning.** Positive `phase` makes JMA more responsive (less lag,
   more overshoot); negative `phase` makes it smoother (more lag, less
   overshoot). `power` controls how hard the adaptive kernel reacts.

## Common pitfalls

- **Expecting bit-exact agreement with Jurik's commercial JMA.** The
  original is proprietary; this is the community reconstruction. It matches
  the open-source ports (`pandas-ta`, Pine, MQL), not necessarily Jurik's
  closed binary.
- **Pushing `power` outside `1..=4`.** The constructor rejects it — the
  kernel exponent is bounded.

## References

- Mark Jurik, "JMA — Jurik Moving Average", *Technical Analysis of Stocks &
  Commodities*, 1999. The three-stage reconstruction is the community-standard
  open-source form.

## See also

- [Ema](Indicator-Ema) — the baseline JMA improves on.
- [Hma](Indicator-Hma) — Hull MA, another low-lag smoother.
- [T3](Indicator-T3) — Tillson's multi-EMA low-lag average.
- [Vidya](Indicator-Vidya) — momentum-adaptive alternative.
