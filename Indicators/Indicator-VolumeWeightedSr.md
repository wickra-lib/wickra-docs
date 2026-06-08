# VolumeWeightedSr

> A support/resistance band whose edges are the volume-weighted average of recent
> lows and highs — levels gravitate to where trading actually happened.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Pivots & S/R |
| Input type | `Candle` (high / low / volume) |
| Output type | `VolumeWeightedSrOutput { support, resistance }` |
| Output range | price units; `support <= resistance` |
| Default parameters | `(period = 20)` (Python) |
| Warmup period | `period` |
| Interpretation | Volume-weighted band; edges are sticky S/R levels. |

## Formula

```
support    = Σ(low_i  · volume_i) / Σ volume_i      over the window
resistance = Σ(high_i · volume_i) / Σ volume_i      over the window
```

Plain high/low channels weight every bar equally, so a thin wick sets the
boundary. Volume-weighting pulls the support and resistance toward the lows and
highs that carried real volume — the prices the market agreed mattered — producing
levels that tend to hold better. If the window's total volume is zero the band
falls back to the equal-weighted average high and low. Source:
`crates/wickra-core/src/indicators/volume_weighted_sr.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `20` (Python) | `>= 1`      | `volume_weighted_sr.rs:75` | Lookback window. `0` errors with `Error::PeriodZero`. |

The `period` getter returns the window; `value` returns the current output if
ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/volume_weighted_sr.rs`:

```rust
use wickra::{Candle, Indicator, VolumeWeightedSr, VolumeWeightedSrOutput};
// VolumeWeightedSr: Input = Candle, Output = VolumeWeightedSrOutput
const _: fn(&mut VolumeWeightedSr, Candle) -> Option<VolumeWeightedSrOutput> =
    <VolumeWeightedSr as Indicator>::update;
```

A `Candle` in, an `Option<VolumeWeightedSrOutput>` out. The Python binding returns
a `(support, resistance)` tuple from `update` and an `(n, 2)` array from
`batch(high, low, volume)`; Node returns `{ support, resistance }` and a flat
`Float64Array` of length `n*2`; WASM mirrors the object with camelCase keys.

## Warmup

`warmup_period() == period`. The first value lands once the window is full
(`first_emission_at_warmup_period` pins this).

## Edge cases

- **Ordering.** `support <= resistance` always (`support_below_resistance` pins
  this).
- **Volume pull.** A heavy bar drags the band toward its high/low
  (`weights_toward_high_volume_bars` pins this).
- **Zero volume.** A volume-free window falls back to equal-weighted means
  (`zero_volume_falls_back_to_equal_weight` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `v.reset()` clears the windows, the running sums and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, VolumeWeightedSr};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut v = VolumeWeightedSr::new(4)?;
    let c = |h: f64, l: f64, vol: f64| Candle::new(l, h, l, (h+l)/2.0, vol, 0).unwrap();
    let candles = [c(102.0,98.0,100.0), c(102.0,98.0,100.0), c(102.0,98.0,100.0), c(112.0,108.0,9_000.0)];
    let out = v.batch(&candles).last().unwrap().unwrap();
    println!("resistance leans to heavy bar: {:.1}", out.resistance);
    Ok(())
}
```

Output:

```
resistance leans to heavy bar: 11x.x
```

### Python

```python
import numpy as np
import wickra as ta

v = ta.VolumeWeightedSr(20)
high = ...; low = ...; volume = ...
support, resistance = v.batch(high, low, volume).T
```

### Node

```javascript
const ta = require('wickra');

const v = new ta.VolumeWeightedSr(20);
console.log('warmupPeriod:', v.warmupPeriod()); // 20
```

### Streaming

```rust
use wickra::{Candle, Indicator, VolumeWeightedSr};

let mut v = VolumeWeightedSr::new(20).unwrap();
let mut last = None;
for i in 0..40 {
    let base = 100.0 + (f64::from(i) * 0.3).sin() * 5.0;
    let c = Candle::new(base, base + 2.0, base - 2.0, base, 1_000.0 + f64::from(i), 0).unwrap();
    last = v.update(c);
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Sticky levels.** Trade reversals off the `support`/`resistance` edges; they
   reflect volume-validated prices rather than wick extremes.
2. **Band width.** A widening band signals expanding, volume-backed range; a
   narrowing one signals compression.
3. **Confluence.** Overlap with pivots or a volume profile POC for higher-conviction
   levels.

## Common pitfalls

- **Needs real volume.** On feeds with synthetic volume the weighting is
  meaningless; it then equals a plain average band.
- **Not the extreme.** These are weighted *averages* of highs/lows, not the max/min;
  for the absolute channel use [`Donchian`](/Indicators/Indicator-Donchian).
- **Window choice.** Longer windows give stabler but laggier levels.

## References

Volume-weighting of price levels follows the same logic as VWAP (Berkowitz,
Logue & Noser, 1988); the high/low band form is a common practitioner construction.

## See also

- [Indicator-Donchian](/Indicators/Indicator-Donchian) — equal-weighted high/low channel.
- [Indicator-Vwap](/Indicators/Indicator-Vwap) — volume-weighted average price.
- [Indicator-VolumeProfile](/Indicators/Indicator-VolumeProfile) — full volume-at-price profile.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
