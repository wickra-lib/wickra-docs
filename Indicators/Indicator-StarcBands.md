# StarcBands

> Stoller Average Range Channel — an SMA(close) centerline with bands
> sized by ATR. Same skeleton as Keltner Channels but with an SMA midline
> instead of an EMA of typical price.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Bands & Channels |
| Input type | `Candle` (uses `high`, `low`, `close`) |
| Output type | `StarcBandsOutput { upper, middle, lower }` |
| Output range | unbounded; `lower ≤ middle ≤ upper` |
| Default parameters | `sma_period = 6`, `atr_period = 15`, `multiplier = 2.0` |
| Warmup period | `max(sma_period, atr_period)` (`15` for defaults) |
| Interpretation | Swing levels. A flat SMA midline + wide ATR picks larger swing targets than Keltner's reactive EMA midline. |

## Formula

```
middle = SMA(close, sma_period)
upper  = middle + multiplier · ATR(atr_period)
lower  = middle − multiplier · ATR(atr_period)
```

The SMA-of-close centerline is flatter and less reactive than Keltner's
EMA-of-typical-price, which is why Stoller's classic configuration
pairs a *short* SMA (6) with a *longer* ATR (15) — the midline tracks
the swing rather than the trend.

## Parameters

| Name         | Type    | Default | Constraint    | Source |
|--------------|---------|---------|---------------|--------|
| `sma_period` | `usize` | `6`     | `>= 1`        | `StarcBands::new` (`starc_bands.rs:64`) |
| `atr_period` | `usize` | `15`    | `>= 1`        | `starc_bands.rs:64` |
| `multiplier` | `f64`   | `2.0`   | finite, `> 0` | `starc_bands.rs:65` |

A zero period returns [`Error::PeriodZero`]; a non-finite or non-positive
`multiplier` returns [`Error::NonPositiveMultiplier`]. `StarcBands::classic()`
returns `(6, 15, 2.0)`. Python defaults come from
`#[pyo3(signature = (sma_period=6, atr_period=15, multiplier=2.0))]`; the
Node constructor takes all three arguments explicitly.

## Inputs / Outputs

```rust
use wickra::{Indicator, StarcBands, Candle, StarcBandsOutput};
// StarcBands: Input = Candle, Output = StarcBandsOutput
const _: fn(&mut StarcBands, Candle) -> Option<StarcBandsOutput> = <StarcBands as Indicator>::update;
```

- **Python streaming.** `update(candle)` returns `(upper, middle, lower)` or `None`.
- **Python batch.** `StarcBands.batch(high, low, close)` returns an `(n, 3)`
  `np.ndarray` with columns `[upper, middle, lower]`; warmup rows are `NaN`.
- **Node streaming.** `update(high, low, close)` returns a
  `{ upper, middle, lower }` object or `null`.
- **Node batch.** `batch(high, low, close)` returns a flat `Array<number>`
  of length `n * 3`.

## Warmup

The SMA and ATR sub-indicators are fed *unconditionally* on every candle so
they warm up in parallel, and `update` emits once both are ready.
`warmup_period()` therefore returns `max(sma_period, atr_period)` — `15`
for the classic configuration. The ATR's Wilder seed (`atr_period` candles)
is the binding constraint when `atr_period > sma_period`.

## Edge cases

- **Flat market.** A constant-OHLC series drives ATR to `0`, so the bands
  collapse onto the SMA (test `flat_market_collapses_bands`).
- **Decomposition.** STARC equals an independent `SMA(close, sma_period)`
  plus `±multiplier · ATR(atr_period)` combined bar-for-bar (test
  `matches_independent_sma_and_atr`).
- **Ordering.** `upper >= middle >= lower` always holds (`ATR >= 0`).
- **Reset.** `reset()` resets both sub-indicators.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, StarcBands};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..40)
        .map(|i| {
            let base = 100.0 + f64::from(i);
            Candle::new(base, base + 2.0, base - 2.0, base + 1.0, 10.0, i64::from(i)).unwrap()
        })
        .collect();
    let mut s = StarcBands::classic(); // (6, 15, 2.0)
    if let Some(o) = s.batch(&candles).into_iter().flatten().last() {
        println!("upper={:.2} middle={:.2} lower={:.2}", o.upper, o.middle, o.lower);
    }
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

s = ta.StarcBands(6, 15, 2.0)
high  = np.array([...], dtype=float)
low   = np.array([...], dtype=float)
close = np.array([...], dtype=float)
bands = s.batch(high, low, close)  # shape (n, 3): [upper, middle, lower]
```

### Node

```javascript
const ta = require('wickra');
const s = new ta.StarcBands(6, 15, 2.0);
const out = s.update(102, 98, 101); // null during warmup, else { upper, middle, lower }
```

## Interpretation

STARC frames swing trading around a deliberately slow midline:

1. **Swing targets.** Because the SMA(6) midline is flat relative to
   price action, the ATR(15) bands sit far enough out to mark realistic
   swing extremes — Stoller used them to pick profit targets, not entries.
2. **Trend bias.** Price persistently riding the upper band signals an
   uptrend; a close back through the midline warns the swing is over.

Compare with [Keltner](/Indicators/Indicator-Keltner): same `MA ± k·ATR` skeleton, but
Keltner's EMA-of-typical-price midline reacts faster, making it the
better trend-following envelope while STARC is the better swing-level tool.

## Common pitfalls

- **Swapping the periods.** The classic setup is a *short* SMA and a *long*
  ATR; reversing them produces a reactive midline with a sluggish band and
  loses the swing-level character.
- **Expecting Keltner numbers.** STARC and Keltner differ in both the
  midline (SMA-of-close vs EMA-of-typical-price) and the default periods,
  so their bands will not line up even at the same multiplier.

## References

- Manning Stoller, *STARC Bands*, originally published in *Technical
  Analysis of Stocks & Commodities*. The "ARC" stands for *Average Range
  Channel*; the leading "ST" is Stoller's initials.

## See also

- [Keltner](/Indicators/Indicator-Keltner) — EMA-of-typical-price centerline + ATR.
- [AtrBands](/Indicators/Indicator-AtrBands) — close-anchored (no SMA), pure
  volatility band.
- [BollingerBands](/Indicators/Indicator-BollingerBands) — sigma-based instead of
  ATR-based.
