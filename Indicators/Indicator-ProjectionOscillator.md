# ProjectionOscillator

> Mel Widner's companion to the projection bands: where the close sits inside
> the `[lower, upper]` projection envelope, scaled to `0..100`.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Bands & Channels |
| Input type | `Candle` (uses `high`, `low`, `close`) |
| Output type | `f64` |
| Output range | `0..100` (≈) — `0` on the lower band, `100` on the upper, `50` at the midline |
| Default parameters | `period = 14` |
| Warmup period | `period` (exact — first emission on bar `period`) |
| Interpretation | A trend-relative %-position oscillator; extremes flag overbought/oversold against the tilted channel. |

## Formula

```
[lower, upper] = ProjectionBands(period)         // see ProjectionBands
PO = 100 · (close − lower) / (upper − lower)
```

The oscillator (Widner, *Technical Analysis of Stocks & Commodities*, May 1995)
maps the close onto the [ProjectionBands](/Indicators/Indicator-ProjectionBands)
envelope. Because the bands by construction bracket every projected high and
low, the close almost always lies inside them and `PO` stays in `0..100`. Source:
`crates/wickra-core/src/indicators/projection_oscillator.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Source |
|----------|---------|---------|------------|--------|
| `period` | `usize` | `14`    | `>= 2`     | `ProjectionOscillator::new` (`projection_oscillator.rs:55`) |

`period < 2` returns [`Error::InvalidPeriod`] (forwarded from the underlying
`ProjectionBands::new`). Python defaults come from
`#[pyo3(signature = (period=14))]`; the Node constructor takes the period
explicitly.

## Inputs / Outputs

```rust
use wickra::{Indicator, ProjectionOscillator, Candle};
// ProjectionOscillator: Input = Candle, Output = f64
const _: fn(&mut ProjectionOscillator, Candle) -> Option<f64> =
    <ProjectionOscillator as Indicator>::update;
```

- **Python streaming.** `update(candle)` returns a `float` or `None`.
- **Python batch.** `ProjectionOscillator.batch(high, low, close)` returns a
  1-D `np.ndarray`; warmup rows are `NaN`.
- **Node streaming.** `update(high, low, close)` returns a `number` or `null`.
- **Node batch.** `batch(high, low, close)` returns a flat `Array<number>`.

## Warmup

`warmup_period()` reports `period` (forwarded from the inner bands) and is
exact: the first non-`None` reading lands on candle `period`. Readiness is
pinned by the `warms_up_then_emits` test (two `None`s then `Some` for
`period = 3`).

## Edge cases

- **Collapsed bands.** When the window is zero-range (`upper == lower`) the
  position is undefined; the oscillator returns the neutral `50.0` rather than
  dividing by zero — pinned by `collapsed_bands_return_neutral`.
- **Outside the bands.** A close above the upper band or below the lower band
  (possible only on the live bar before it is folded into the window) reads
  `> 100` or `< 0`; this is intentional and flags an exceptional thrust.
- **Reset.** `reset()` clears the inner bands; the next `update` restarts warmup
  (test `reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, ProjectionOscillator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Same window as ProjectionBands: upper 12.5, lower 10; close 11.
    let candles = vec![
        Candle::new(8.0, 10.0, 8.0, 9.0, 1.0, 0)?,
        Candle::new(9.0, 12.0, 9.0, 11.0, 1.0, 1)?,
        Candle::new(10.0, 11.0, 10.0, 11.0, 1.0, 2)?,
    ];
    let mut po = ProjectionOscillator::new(3)?;
    for v in po.batch(&candles) {
        println!("{:?}", v);
    }
    Ok(())
}
```

Output:

```
None
None
Some(40.0)
```

With `upper = 12.5`, `lower = 10` and `close = 11`,
`PO = 100 · (11 − 10) / (12.5 − 10) = 40`. This matches the `known_position`
test.

### Python

```python
import numpy as np
import wickra as ta

po = ta.ProjectionOscillator(3)
high  = np.array([10.0, 12.0, 11.0])
low   = np.array([8.0, 9.0, 10.0])
close = np.array([9.0, 11.0, 11.0])
print(po.batch(high, low, close))
```

Output:

```
[nan nan 40.]
```

### Node

```javascript
const ta = require('wickra');
const po = new ta.ProjectionOscillator(3);
po.update(10, 8, 9);
po.update(12, 9, 11);
console.log(po.update(11, 10, 11)); // 40
```

## Interpretation

The Projection Oscillator is a trend-aware sibling of Williams %R / Stochastic
%K: it measures the close's position in a channel, but the channel is the
slope-tilted projection envelope rather than a horizontal high/low range.

1. **Overbought / oversold.** Readings near `100` sit on the projected highs;
   near `0` on the projected lows. In a ranging market these are fade levels.
2. **Trend filter.** In a strong trend the oscillator can ride near one extreme;
   combine with the band slope (rising bands + high PO = healthy uptrend) before
   fading.

## Common pitfalls

- **Reading `50` as a signal.** `50` is returned both at the genuine midline and
  on a collapsed (zero-range) window — check `ProjectionBands` width if the
  distinction matters.
- **Assuming a hard `0..100` clamp.** The oscillator is *not* clamped; an
  exceptional live-bar close can read slightly outside the range.

## References

- Mel Widner, "Projection Bands and the Projection Oscillator," *Technical
  Analysis of Stocks & Commodities*, vol. 13, May 1995.

## See also

- [ProjectionBands](/Indicators/Indicator-ProjectionBands) — the envelope this oscillator normalises against.
- [PercentB](/Indicators/Indicator-PercentB) — the analogous %-position inside Bollinger Bands.
- [WilliamsR](/Indicators/Indicator-WilliamsR) — %-position inside a horizontal high/low range.
