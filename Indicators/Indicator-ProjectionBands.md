# ProjectionBands

> Mel Widner's forward-projected high/low envelope: fit a separate regression
> to the highs and to the lows, slide every bar forward along its slope, and
> take the running max / min.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Bands & Channels |
| Input type | `Candle` (uses `high`, `low`; `open`/`close` ignored) |
| Output type | `ProjectionBandsOutput { upper, middle, lower }` |
| Output range | unbounded; `lower ≤ middle ≤ upper` |
| Default parameters | `period = 14` |
| Warmup period | `period` (exact — first emission on bar `period`) |
| Interpretation | Trend-tilted channel that by construction contains every projected high and low in the window. |

## Formula

```
slope_h = OLS slope of (x, high) over the window      x = 0..period-1
slope_l = OLS slope of (x, low)  over the window
// bar i (0 = oldest, period-1 = newest) is (period-1-i) bars in the past
upper   = max over i of [ high_i + slope_h · (period-1-i) ]
lower   = min over i of [ low_i  + slope_l · (period-1-i) ]
middle  = (upper + lower) / 2
```

Widner ("Projection Bands and the Projection Oscillator", *Technical Analysis of
Stocks & Commodities*, May 1995) projects each bar's high and low forward to the
current bar using the regression slope of the highs and lows respectively, then
reports the extreme projections as the band edges. A flat slope reduces the
bands to the rolling highest-high / lowest-low — a [Donchian](/Indicators/Indicator-Donchian)
channel — while a steep slope tilts the whole envelope with the trend. Source:
`crates/wickra-core/src/indicators/projection_bands.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Source |
|----------|---------|---------|------------|--------|
| `period` | `usize` | `14`    | `>= 2`     | `ProjectionBands::new` (`projection_bands.rs:78`) |

`period < 2` returns [`Error::InvalidPeriod`] — a regression slope needs at
least two points. Python defaults come from `#[pyo3(signature = (period=14))]`;
the Node constructor takes the period explicitly.

## Inputs / Outputs

```rust
use wickra::{Indicator, ProjectionBands, Candle, ProjectionBandsOutput};
// ProjectionBands: Input = Candle, Output = ProjectionBandsOutput
const _: fn(&mut ProjectionBands, Candle) -> Option<ProjectionBandsOutput> =
    <ProjectionBands as Indicator>::update;
```

- **Python streaming.** `update(candle)` returns `(upper, middle, lower)` or `None`.
- **Python batch.** `ProjectionBands.batch(high, low)` returns an `(n, 3)`
  `np.ndarray` with columns `[upper, middle, lower]`; warmup rows are `NaN`.
- **Node streaming.** `update(high, low)` returns a `{ upper, middle, lower }`
  object or `null`.
- **Node batch.** `batch(high, low)` returns a flat `Array<number>` of length
  `n * 3` interleaved per row `[u0, m0, l0, u1, m1, l1, …]`.

## Warmup

`warmup_period()` reports `period` and the figure is exact: both regressions
need a full window before the bands are defined, so the first non-`None` output
lands on candle `period` (index `period − 1`). Readiness is pinned by the
`warms_up_then_emits` test (the first two updates return `None`, the third
returns `Some` for `period = 3`).

## Edge cases

- **Perfect trend.** When highs and lows rise by a constant amount each bar,
  every projected high collapses onto the current high and every projected low
  onto the current low, so the bands hug the latest bar's extremes — pinned by
  `perfect_trend_pins_bands_to_current_extremes`.
- **Ordering.** `upper ≥ middle ≥ lower` always holds because `middle` is their
  midpoint and `upper ≥ lower` by construction.
- **Reset.** `reset()` clears both high/low deques; the next `update` restarts
  the warmup countdown (test `reset_clears_state`).
- **Non-finite inputs.** `Candle::new` rejects non-finite OHLC up front, so the
  indicator never sees `NaN`/`inf`.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, ProjectionBands};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // (high, low): (10, 8), (12, 9), (11, 10).
    let candles = vec![
        Candle::new(8.0, 10.0, 8.0, 9.0, 1.0, 0)?,
        Candle::new(9.0, 12.0, 9.0, 11.0, 1.0, 1)?,
        Candle::new(10.0, 11.0, 10.0, 11.0, 1.0, 2)?,
    ];
    let mut pb = ProjectionBands::new(3)?;
    for v in pb.batch(&candles) {
        println!("{:?}", v);
    }
    Ok(())
}
```

Output:

```
None
None
Some(ProjectionBandsOutput { upper: 12.5, middle: 11.25, lower: 10.0 })
```

Highs `10, 12, 11` give `slope_h = 0.5`; the projected highs are `11, 12.5, 11`
so `upper = 12.5`. Lows `8, 9, 10` give `slope_l = 1.0`; the projected lows are
all `10` so `lower = 10`. This matches the `known_projection` test.

### Python

```python
import numpy as np
import wickra as ta

pb = ta.ProjectionBands(3)
high = np.array([10.0, 12.0, 11.0])
low  = np.array([8.0, 9.0, 10.0])
print(pb.batch(high, low))
```

Output:

```
[[  nan   nan   nan]
 [  nan   nan   nan]
 [12.5  11.25 10.  ]]
```

### Node

```javascript
const ta = require('wickra');
const pb = new ta.ProjectionBands(3);
pb.update(10, 8);
pb.update(12, 9);
console.log(pb.update(11, 10)); // { upper: 12.5, middle: 11.25, lower: 10 }
```

## Interpretation

Projection Bands answer "how far has price stretched relative to its own
trend?" Because the envelope is built from the projected extremes rather than a
dispersion statistic, price physically cannot close outside the bands within the
fitting window — the bands act as a dynamic, slope-aware support/resistance pair:

1. **Trend channel.** In a steady advance the bands tilt up together; a close
   that repeatedly tags the upper band signals trend strength, not an immediate
   reversal.
2. **Squeeze.** When `upper − lower` contracts the recent range has narrowed —
   often a precursor to expansion, the same logic as a Bollinger squeeze but
   range-based.

Pair with the [ProjectionOscillator](/Indicators/Indicator-ProjectionOscillator)
to read the close's position inside the bands as a bounded `0..100` value.

## Common pitfalls

- **Expecting breakouts.** Unlike Bollinger Bands, a close cannot pierce
  Projection Bands inside the window — use the *band slope* and *width*, or the
  oscillator, for signals rather than waiting for a pierce.
- **Tiny periods.** `period = 2` makes the regression interpolate two points
  exactly; use a longer window (10–20) for a meaningful slope estimate.

## References

- Mel Widner, "Projection Bands and the Projection Oscillator," *Technical
  Analysis of Stocks & Commodities*, vol. 13, May 1995.

## See also

- [ProjectionOscillator](/Indicators/Indicator-ProjectionOscillator) — the close's position inside these bands.
- [Donchian](/Indicators/Indicator-Donchian) — the zero-slope limit (pure rolling high/low).
- [LinRegChannel](/Indicators/Indicator-LinRegChannel) — close-regression endpoint ± σ.
- [StandardErrorBands](/Indicators/Indicator-StandardErrorBands) — close-regression ± standard error.
