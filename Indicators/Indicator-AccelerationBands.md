# AccelerationBands

> Price Headley's momentum-biased band: the upper and lower envelopes
> widen with the bar's relative range `(H − L) / (H + L)`, so impulsive
> bars flare the bands while quiet bars compress them.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Bands & Channels |
| Input type | `Candle` (uses `high`, `low`, `close`) |
| Output type | `AccelerationBandsOutput { upper, middle, lower }` |
| Output range | unbounded; `lower ≤ middle ≤ upper` (on non-degenerate input) |
| Default parameters | `period = 20`, `factor = 0.001` |
| Warmup period | `period` (exact) |
| Interpretation | Breakout-style. Headley enters on closes outside the band; exits on a tag of the middle. |

## Formula

```
ratio    = (high − low) / (high + low)
raw_up   = high · (1 + factor · ratio)
raw_lo   = low  · (1 − factor · ratio)
upper    = SMA(raw_up, period)
middle   = SMA(close,  period)
lower    = SMA(raw_lo, period)
```

`ratio` is a *fractional* range measure, so the literal `factor` for
intraday equity markets is small (`~0.001` in Headley's reference
publication). On crypto and other higher-volatility assets traders
typically raise it to `0.01`–`0.05`. The three component series are each
smoothed by their own SMA, so the bands inherit the SMA's warmup and
ordering.

## Parameters

| Name     | Type    | Default | Constraint    | Source |
|----------|---------|---------|---------------|--------|
| `period` | `usize` | `20`    | `>= 1`        | `AccelerationBands::new` (`acceleration_bands.rs:69`) |
| `factor` | `f64`   | `0.001` | finite, `> 0` | `acceleration_bands.rs:70` |

`period == 0` returns [`Error::PeriodZero`]; a non-finite or non-positive
`factor` returns [`Error::NonPositiveMultiplier`]. `AccelerationBands::classic()`
returns `(20, 0.001)`. Python defaults come from
`#[pyo3(signature = (period=20, factor=0.001))]`; the Node constructor takes
both arguments explicitly.

## Inputs / Outputs

```rust
use wickra::{Indicator, AccelerationBands, Candle, AccelerationBandsOutput};
// AccelerationBands: Input = Candle, Output = AccelerationBandsOutput
const _: fn(&mut AccelerationBands, Candle) -> Option<AccelerationBandsOutput> = <AccelerationBands as Indicator>::update;
```

- **Python streaming.** `update(candle)` returns `(upper, middle, lower)` or `None`.
- **Python batch.** `AccelerationBands.batch(high, low, close)` returns an
  `(n, 3)` `Matrix` with columns `[upper, middle, lower]`; warmup rows
  are `NaN`.
- **Node streaming.** `update(high, low, close)` returns a
  `{ upper, middle, lower }` object or `null`.
- **Node batch.** `batch(high, low, close)` returns a flat `Array<number>`
  of length `n * 3`.

## Warmup

All three SMAs are fed unconditionally on every candle so they warm up in
lock-step; `warmup_period()` returns `period` and the first non-`None`
output lands on candle `period` (index `period − 1`). Pinned by
`warmup_returns_none` (period 5: candles 1–4 return `None`, candle 5 emits).

## Edge cases

- **Flat market.** When `high == low`, `ratio = 0`, so `raw_up == high` and
  `raw_lo == low`; all three SMAs converge and the bands collapse onto the
  midline (test `flat_market_collapses_to_constant`).
- **Zero-price bar.** A degenerate `high + low == 0` bar collapses the ratio
  to `0` rather than emitting `NaN` (test
  `zero_price_candle_collapses_ratio_to_zero`). Real OHLC never reaches this,
  but the guard keeps fuzz inputs well-behaved.
- **Ordering.** `upper >= middle >= lower` holds on non-degenerate data
  (test `upper_above_middle_above_lower`).
- **Reset.** `reset()` resets all three SMAs.

## Examples

### Rust

```rust
use wickra::{AccelerationBands, Candle, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Single bar, period 1, factor 0.5: high 12, low 8, close 10.
    // ratio = (12 − 8)/(12 + 8) = 0.2 → raw_up = 12·1.1 = 13.2, raw_lo = 8·0.9 = 7.2.
    let mut ab = AccelerationBands::new(1, 0.5)?;
    let v = ab.update(Candle::new(10.0, 12.0, 8.0, 10.0, 1.0, 0)?).unwrap();
    println!("upper={} middle={} lower={}", v.upper, v.middle, v.lower);
    Ok(())
}
```

Output:

```
upper=13.2 middle=10 lower=7.2
```

This matches the `reference_value_single_bar` test.

### Python

```python
import numpy as np
import wickra as ta

ab = ta.AccelerationBands(1, 0.5)
print(ab.batch(np.array([12.0]), np.array([8.0]), np.array([10.0])))  # [[13.2 10.  7.2]]
```

### Node

```javascript
const ta = require('wickra');
const ab = new ta.AccelerationBands(1, 0.5);
console.log(ab.update(12, 8, 10)); // { upper: 13.2, middle: 10, lower: 7.2 }
```

## Interpretation

Acceleration Bands are momentum-biased rather than volatility-biased: the
band width responds to each bar's *relative* range, so it flares the instant
an impulsive bar prints rather than after volatility has been elevated for a
full window.

1. **Breakout entry.** Headley's rule: a close *outside* the band signals a
   breakout in that direction; ride it while closes stay beyond the band.
2. **Exit.** A tag of the middle (SMA of close) ends the move.

This makes Acceleration Bands quicker to flag a fresh thrust than the
slower-reacting [BollingerBands](/Indicators/Indicator-BollingerBands) or
[Keltner](/Indicators/Indicator-Keltner) on the same period.

## Common pitfalls

- **Leaving `factor` at the equity default on crypto.** `0.001` produces a
  near-invisible band on assets with large fractional ranges — raise it to
  `0.01`–`0.05`.
- **Confusing the band geometry.** The width comes from `high`/`low`
  geometry smoothed by an SMA, not from a stddev or ATR — it will not match
  any sigma- or ATR-based band even qualitatively in choppy conditions.

## References

- Price Headley, *Big Trends in Trading: Strategies to Master Major Market
  Moves*, Wiley, 2002. The "Acceleration Bands" chapter describes the
  original setup.

## See also

- [BollingerBands](/Indicators/Indicator-BollingerBands) — sigma-driven width.
- [Keltner](/Indicators/Indicator-Keltner) — ATR-driven width with EMA centerline.
- [StarcBands](/Indicators/Indicator-StarcBands) — SMA-centerline + ATR sibling.
