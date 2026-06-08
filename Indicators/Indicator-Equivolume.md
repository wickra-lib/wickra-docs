# Equivolume

> Richard Arms' Equivolume chart as numbers — each bar is a box whose height is its
> price range and whose width is its volume relative to the recent average.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Ichimoku & Charts |
| Input type | `Candle` (high / low / volume) |
| Output type | `EquivolumeOutput { height, width }` |
| Output range | `height` ≥ 0 (price units); `width` ≥ 0 (1.0 = average volume) |
| Default parameters | `(period = 14)` (Python) |
| Warmup period | `period` |
| Interpretation | Tall+narrow = easy move; short+wide = churn (S/R). |

## Formula

```
height = high − low
width  = volume / SMA(volume, period)        (1.0 = average volume)
```

Equivolume substitutes volume for the time axis. A **tall narrow** box (big range,
light volume) is an easy move; a **short wide** box (small range, heavy volume) is
churn that often marks support/resistance. Reporting both dimensions lets you
reconstruct that shape — the height/width relationship is Arms' ease-of-movement
read. Source: `crates/wickra-core/src/indicators/equivolume.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `14` (Python) | `>= 1`      | `equivolume.rs:56` | Volume-averaging window for the box width. `0` errors with `Error::PeriodZero`. |

The `period` getter returns the window; `value` returns the current box if ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/equivolume.rs`:

```rust
use wickra::{Candle, Indicator, Equivolume, EquivolumeOutput};
// Equivolume: Input = Candle, Output = EquivolumeOutput
const _: fn(&mut Equivolume, Candle) -> Option<EquivolumeOutput> =
    <Equivolume as Indicator>::update;
```

A `Candle` in, an `Option<EquivolumeOutput>` out. The Python binding returns a
`(height, width)` tuple from `update` and an `(n, 2)` array from `batch(high, low,
volume)`; Node returns `{ height, width }` and a flat `Float64Array` of length
`n*2`; WASM mirrors the object with camelCase keys.

## Warmup

`warmup_period() == period`. The volume SMA seeds before the first box
(`first_emission_at_warmup_period` pins this).

## Edge cases

- **Height = range.** `height` equals `high − low` (`height_is_range` pins this).
- **Average width = 1.** Average volume gives `width == 1` (`average_volume_width_is_one`
  pins this).
- **Heavy bar wide.** Above-average volume gives `width > 1` (`heavy_bar_is_wide`
  pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `e.reset()` clears the volume SMA and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, Equivolume};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut e = Equivolume::new(3)?;
    let c = |vol: f64| Candle::new(98.0, 102.0, 98.0, 100.0, vol, 0).unwrap();
    let out = e.batch(&[c(1_000.0), c(1_000.0), c(4_000.0)]).last().unwrap().unwrap();
    println!("height={} width={}", out.height, out.width); // 4, >1 (heavy)
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

e = ta.Equivolume(14)
high = ...; low = ...; volume = ...
height, width = e.batch(high, low, volume).T
```

### Node

```javascript
const ta = require('wickra');

const e = new ta.Equivolume(14);
console.log('warmupPeriod:', e.warmupPeriod()); // 14
```

### Streaming

```rust
use wickra::{Candle, Indicator, Equivolume};

let mut e = Equivolume::new(14).unwrap();
let feed: Vec<Candle> = Vec::new(); // your live stream
for candle in feed {
    if let Some(box_) = e.update(candle) {
        let ease = box_.height / box_.width.max(1e-9); // tall/narrow -> high
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Ease of movement.** Tall, narrow boxes (high height/width) confirm a strong,
   unopposed move; the opposite warns of resistance.
2. **Breakout quality.** A wide box on a breakout means heavy participation —
   stronger than a narrow one.
3. **Power boxes.** A box both taller and wider than its neighbours (Arms' "power
   box") signals a decisive, high-conviction bar.

## Common pitfalls

- **Needs real volume.** Width is meaningless on synthetic volume.
- **Not a signal.** Equivolume is descriptive; combine the shape with price
  structure.
- **Range, not body.** Height uses the high-low range; for the body version see
  [`CandleVolume`](/Indicators/Indicator-CandleVolume).

## References

Arms, R. W. (1971), *Profits in Volume: Equivolume Charting*.

## See also

- [Indicator-CandleVolume](/Indicators/Indicator-CandleVolume) — the candlestick (body) variant.
- [Indicator-EaseOfMovement](/Indicators/Indicator-EaseOfMovement) — Arms' EMV oscillator.
- [Indicator-BetterVolume](/Indicators/Indicator-BetterVolume) — VSA effort-vs-result.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
