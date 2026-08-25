# BomarBands

> Adaptive percentage bands around a moving average, sized so that a fixed
> `coverage` fraction of recent closes falls inside them. The pre-Bollinger
> percentage band.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Bands & Channels |
| Input type | `f64` |
| Output type | `BomarBandsOutput { upper, middle, lower }` |
| Output range | unbounded; `lower ≤ middle ≤ upper` |
| Default parameters | `period = 20`, `coverage = 0.85` |
| Warmup period | `period` (exact — first emission on bar `period`) |
| Interpretation | Self-tuning percentage envelope: widens in turbulent regimes, tightens in quiet ones, with no volatility input. |

## Formula

```
middle = SMA(close, period)
dev_i  = | close_i / middle − 1 |             relative distance from the midline
p      = coverage-quantile of { dev_i }        type-7 interpolation
upper  = middle + |middle| · p
lower  = middle − |middle| · p
```

John Bollinger credits the Bomar Bands as an inspiration for his own work:
percentage bands around a moving average, with the percentage tuned so that a
fixed share (classically ~85%) of price stayed within. Wickra realises that idea
deterministically — the half-width is the `coverage` quantile of the relative
deviations from the midline, so by construction `coverage` of the window's closes
lie inside the bands. Source:
`crates/wickra-core/src/indicators/bomar_bands.rs`.

## Parameters

| Name       | Type    | Default | Constraint              | Source |
|------------|---------|---------|-------------------------|--------|
| `period`   | `usize` | `20`    | `>= 1`                  | `BomarBands::new` (`bomar_bands.rs:76`) |
| `coverage` | `f64`   | `0.85`  | finite, in `(0.0, 1.0]` | `bomar_bands.rs:76` |

`period == 0` returns [`Error::PeriodZero`]; a `coverage` outside `(0.0, 1.0]`
or non-finite returns [`Error::InvalidParameter`]. Python defaults come from
`#[pyo3(signature = (period=20, coverage=0.85))]`; the Node constructor takes
both arguments explicitly.

## Inputs / Outputs

```rust
use wickra::{Indicator, BomarBands, BomarBandsOutput};
// BomarBands: Input = f64, Output = BomarBandsOutput
const _: fn(&mut BomarBands, f64) -> Option<BomarBandsOutput> =
    <BomarBands as Indicator>::update;
```

- **Python streaming.** `update(value)` returns `(upper, middle, lower)` or `None`.
- **Python batch.** `BomarBands.batch(prices)` returns an `(n, 3)` `Matrix`
  with columns `[upper, middle, lower]`; warmup rows are `NaN`.
- **Node streaming.** `update(value)` returns a `{ upper, middle, lower }`
  object or `null`.
- **Node batch.** `batch(prices)` returns a flat `Array<number>` of length
  `n * 3` interleaved per row `[u0, m0, l0, …]`.

## Warmup

`warmup_period()` reports `period` and is exact: the SMA midline needs a full
window before the bands are defined, so the first non-`None` output lands on
bar `period`. Pinned by `warms_up_then_emits` (three `None`s then `Some` for
`period = 4`).

## Edge cases

- **Zero midline.** When the window mean is exactly `0` the relative deviation
  is undefined; the bands collapse onto the midline (`upper == middle == lower`)
  — pinned by `zero_midline_collapses_bands` (window `[3, −3]`).
- **`coverage = 1.0`.** The half-width becomes the *maximum* relative deviation,
  so every close in the window lies inside the bands.
- **Ordering.** `upper ≥ middle ≥ lower` always holds because `offset ≥ 0`.
- **Reset.** `reset()` clears the window and scratch buffer; the next `update`
  restarts warmup (test `reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, BomarBands, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut bb = BomarBands::new(4, 0.85)?;
    for v in bb.batch(&[100.0, 102.0, 98.0, 104.0]) {
        println!("{:?}", v);
    }
    Ok(())
}
```

Output:

```
None
None
None
Some(BomarBandsOutput { upper: 104.0, middle: 101.0, lower: 98.0 })
```

`SMA = 101`; the relative deviations are `{1, 1, 3, 3} / 101`; the `0.85`
quantile is `3/101`, so `offset = 101 · 3/101 = 3` and the bands sit at
`101 ± 3`. This matches the `known_bands` test.

### Python

```python
import numpy as np
import wickra as ta

bb = ta.BomarBands(4, 0.85)
print(bb.batch(np.array([100.0, 102.0, 98.0, 104.0])))
```

Output:

```
[[ nan  nan  nan]
 [ nan  nan  nan]
 [ nan  nan  nan]
 [104. 101.  98.]]
```

### Node

```javascript
const ta = require('wickra');
const bb = new ta.BomarBands(4, 0.85);
bb.update(100); bb.update(102); bb.update(98);
console.log(bb.update(104)); // { upper: 104, middle: 101, lower: 98 }
```

## Interpretation

Bomar Bands are a self-calibrating percentage envelope:

1. **Containment.** By design ~`coverage` of recent closes sit inside the bands,
   so a close outside is a genuine `(1 − coverage)`-tail event for the current
   regime — a cleaner overbought/oversold trigger than a fixed-percent
   [MaEnvelope](/Indicators/Indicator-MaEnvelope).
2. **Adaptive width.** The bands breathe with realised dispersion without an ATR
   or sigma input; a sudden widening flags a volatility regime change.

## Common pitfalls

- **Reading the width as volatility.** The half-width is a *quantile* of
  deviations, not a standard deviation — it is bounded by the largest deviation
  in the window and ignores the extreme tail beyond the `coverage` rank.
- **Non-positive series.** The percentage construction assumes a meaningful
  non-zero midline; on series that cross zero (e.g. spreads) the midline can
  vanish and the bands collapse.

## References

- Bollinger, John, *Bollinger on Bollinger Bands*, McGraw-Hill, 2001 (historical
  note crediting the Bomar percentage bands).

## See also

- [MaEnvelope](/Indicators/Indicator-MaEnvelope) — fixed-percent band around an MA.
- [BollingerBands](/Indicators/Indicator-BollingerBands) — sigma-based dispersion envelope.
- [QuartileBands](/Indicators/Indicator-QuartileBands) — non-parametric quartile envelope.
- [PercentB](/Indicators/Indicator-PercentB) — close position inside Bollinger Bands.
