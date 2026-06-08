# CandleVolume

> The candlestick analogue of Equivolume — each bar's signed body paired with a
> width proportional to its volume relative to the recent average.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Ichimoku & Charts |
| Input type | `Candle` (open / close / volume) |
| Output type | `CandleVolumeOutput { body, width }` |
| Output range | `body` signed (price units); `width` ≥ 0 (1.0 = average) |
| Default parameters | `(period = 14)` (Python) |
| Warmup period | `period` |
| Interpretation | Wide bullish body = demand; wide bearish = supply; narrow+wide = churn. |

## Formula

```
body  = close − open                          (signed; + bullish, − bearish)
width = volume / SMA(volume, period)          (1.0 = average volume)
```

Where [`Equivolume`](/Indicators/Indicator-Equivolume) uses the high-low *range*,
CandleVolume uses the candlestick *body*, keeping direction. A wide bullish body
(long up candle on heavy volume) is strong demand; a wide bearish body is strong
supply; a narrow body on heavy volume is churn. Source:
`crates/wickra-core/src/indicators/candle_volume.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `14` (Python) | `>= 1`      | `candle_volume.rs:56` | Volume-averaging window for the width. `0` errors with `Error::PeriodZero`. |

The `period` getter returns the window; `value` returns the current box if ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/candle_volume.rs`:

```rust
use wickra::{Candle, Indicator, CandleVolume, CandleVolumeOutput};
// CandleVolume: Input = Candle, Output = CandleVolumeOutput
const _: fn(&mut CandleVolume, Candle) -> Option<CandleVolumeOutput> =
    <CandleVolume as Indicator>::update;
```

A `Candle` in, an `Option<CandleVolumeOutput>` out. The Python binding returns a
`(body, width)` tuple from `update` and an `(n, 2)` array from `batch(open, close,
volume)`; Node returns `{ body, width }` and a flat `Float64Array` of length `n*2`;
WASM mirrors the object with camelCase keys.

## Warmup

`warmup_period() == period`. The volume SMA seeds before the first box
(`first_emission_at_warmup_period` pins this).

## Edge cases

- **Bullish body.** `close > open` gives a positive body (`bullish_body_positive`
  pins this).
- **Bearish body.** `close < open` gives a negative body (`bearish_body_negative`
  pins this).
- **Heavy bar wide.** Above-average volume gives `width > 1` (`heavy_bar_is_wide`
  pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `cv.reset()` clears the volume SMA and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, CandleVolume};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut cv = CandleVolume::new(2)?;
    let c = |o: f64, cl: f64, v: f64| Candle::new(o, o.max(cl)+1.0, o.min(cl)-1.0, cl, v, 0).unwrap();
    let out = cv.batch(&[c(100.0,103.0,1_000.0), c(100.0,103.0,1_000.0)]).last().unwrap().unwrap();
    println!("body={} width={}", out.body, out.width); // 3, 1
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

cv = ta.CandleVolume(14)
o = ...; c = ...; volume = ...
body, width = cv.batch(o, c, volume).T
```

### Node

```javascript
const ta = require('wickra');

const cv = new ta.CandleVolume(14);
console.log('warmupPeriod:', cv.warmupPeriod()); // 14
```

### Streaming

```rust
use wickra::{Candle, Indicator, CandleVolume};

let mut cv = CandleVolume::new(14).unwrap();
for candle in feed {
    if let Some(box_) = cv.update(candle) {
        // box_.body > 0 && box_.width > 1.5 -> strong demand bar
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Conviction.** A wide body in the trend direction confirms participation; a wide
   body against it warns of a possible reversal.
2. **Churn.** A narrow body on a wide (heavy-volume) bar is absorption — watch for a
   turn.
3. **Body vs range.** Pair with [`Equivolume`](/Indicators/Indicator-Equivolume) to
   compare body-conviction against full-range ease of movement.

## Common pitfalls

- **Needs real volume.** Width is meaningless on synthetic volume.
- **Body ignores wicks.** A long-wicked bar with a small body reads "narrow" even if
  it travelled far.
- **Descriptive.** It quantifies the bar, it does not signal — combine with
  structure.

## References

A candlestick adaptation of Richard Arms' Equivolume (Arms, R. W., 1971); charted
on many platforms as "CandleVolume".

## See also

- [Indicator-Equivolume](/Indicators/Indicator-Equivolume) — the range-based variant.
- [Indicator-BetterVolume](/Indicators/Indicator-BetterVolume) — VSA effort-vs-result.
- [Indicator-ForceIndex](/Indicators/Indicator-ForceIndex) — body move × volume.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
