# VolumeRsi

> Wilder's RSI applied to the volume stream instead of price — a `[0, 100]`
> oscillator of expanding versus contracting participation.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Volume |
| Input type | `Candle` (volume only) |
| Output type | `f64` |
| Output range | `[0, 100]` (50 = balanced volume changes) |
| Default parameters | `(period = 14)` (Python) |
| Warmup period | `period + 1` |
| Interpretation | `> 50` = volume expanding; `< 50` = volume contracting. |

## Formula

```
change_t = volume_t − volume_{t−1}
gain     = max(change, 0),  loss = max(−change, 0)
avg_gain, avg_loss = Wilder-smoothed over `period`
VolumeRSI = 100 * avg_gain / (avg_gain + avg_loss)
```

The Volume RSI feeds the bar-over-bar change in **volume** through the exact
Wilder accumulator used by [`Rsi`](/Indicators/Indicator-Rsi): the first `period`
changes seed the average gain and loss with their simple mean, after which each
new change is folded in with weight `1/period`. A value above `50` means more
volume was added than removed over the smoothing window — expanding participation
that tends to confirm the prevailing price move — while a value below `50` marks
thinning interest. Source:
`crates/wickra-core/src/indicators/volume_rsi.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `14` (Python) | `>= 1`      | `volume_rsi.rs:58` | Wilder smoothing window over the volume changes. `0` errors with `Error::PeriodZero`. |

The `period` getter returns the window length; `value` returns the current output
if ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/volume_rsi.rs`:

```rust
use wickra::{Candle, Indicator, VolumeRsi};
// VolumeRsi: Input = Candle, Output = f64
const _: fn(&mut VolumeRsi, Candle) -> Option<f64> = <VolumeRsi as Indicator>::update;
```

A `Candle` in, an `Option<f64>` out. The Python binding takes a candle for
`update` and a single `volume` numpy column for `batch`; Node takes
`update(volume)` and `batch(volume[])` (NaN warmup).

## Warmup

`warmup_period() == period + 1`. Bar 1 sets the previous volume; bars
`2..=period+1` seed the Wilder averages; the first reading is emitted on bar
`period + 1` (`first_emission_at_warmup_period` pins this).

## Edge cases

- **Rising volume → 100.** A monotonically increasing volume stream has no down
  changes, so `avg_loss` is `0` and the reading saturates at `100`
  (`rising_volume_is_one_hundred` pins this).
- **Falling volume → 0.** A monotonically decreasing stream drives the reading to
  `0` (`falling_volume_is_zero` pins this).
- **Flat volume → 50.** Unchanged volume yields no gains and no losses; the ratio
  is guarded to the neutral `50` rather than `0 / 0`
  (`flat_volume_is_neutral` pins this).
- **Bounded.** The reading always lies in `[0, 100]` (`output_in_range` pins
  this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `vrsi.reset()` clears the previous volume, the seed accumulators,
  the Wilder averages and the last value (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, VolumeRsi};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut vrsi = VolumeRsi::new(3)?;
    // Six bars of steadily rising volume.
    let candles: Vec<Candle> = (1..=6)
        .map(|i| Candle::new(100.0, 101.0, 99.0, 100.5, f64::from(i) * 100.0, 0).unwrap())
        .collect();
    let out = vrsi.batch(&candles);
    println!("warmup_period = {}", vrsi.warmup_period());
    println!("last = {:?}", out.last().unwrap());
    Ok(())
}
```

Output:

```
warmup_period = 4
last = Some(100.0)
```

Every volume change is positive, so the average loss is `0` and the Volume RSI
saturates at `100`.

### Python

```python
import numpy as np
import wickra as ta

vrsi = ta.VolumeRsi(3)
close  = np.array([100, 101, 102, 101, 103, 104], dtype=float)
volume = np.array([1000, 1100, 1200, 1300, 1400, 1500], dtype=float)
print(vrsi.batch(close, volume))
```

Output:

```
[ nan  nan  nan 100. 100. 100.]
```

### Node

```javascript
const ta = require('wickra');

const vrsi = new ta.VolumeRsi(14);
console.log('warmupPeriod:', vrsi.warmupPeriod()); // 15
const close = Array.from({ length: 40 }, (_, i) => 100 + i);
const volume = Array.from({ length: 40 }, (_, i) => 1000 + i * 100);
console.log(vrsi.batch(close, volume).at(-1)); // 100 (volume only rises)
```

### Streaming

```rust
use wickra::{Candle, Indicator, VolumeRsi};

let mut vrsi = VolumeRsi::new(14).unwrap();
let mut last = None;
for i in 0..40 {
    let v = 1_000.0 + (f64::from(i) * 0.3).sin() * 400.0;
    let c = Candle::new(100.0, 101.0, 99.0, 100.5, v, 0).unwrap();
    last = vrsi.update(c);
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

Volume RSI turns raw volume into a normalized momentum reading:

1. **Confirmation.** A price breakout backed by a Volume RSI pushing above `50`
   carries more conviction than one on shrinking volume.
2. **Exhaustion.** A price advance into new highs while Volume RSI rolls under
   `50` warns that participation is fading — a classic non-confirmation.
3. **Accumulation/distribution proxy.** Persistent readings above `50` during a
   base often precede markups; sustained sub-`50` readings during a top hint at
   distribution.

Because the input is volume rather than price, Volume RSI is direction-agnostic —
it measures *how much* trading is happening, not *which way* price moved. Pair it
with a price oscillator for a full picture.

## Common pitfalls

- **Not a price oscillator.** A high Volume RSI says volume is rising, not that
  price is rising; read it alongside price.
- **Session seams.** Volume often gaps at session opens; on intraday data the
  first bars after a gap can spike the reading.
- **Choose `period` for your timeframe.** A short `period` reacts to every volume
  blip; a long one smooths genuine surges away.

## References

Wilder, J. W. (1978), *New Concepts in Technical Trading Systems* (the RSI
accumulator). The volume-input variant is a common adaptation charted by many
platforms as "Volume RSI" / "VRSI".

## See also

- [Indicator-Rsi](/Indicators/Indicator-Rsi) — the price-based original.
- [Indicator-Mfi](/Indicators/Indicator-Mfi) — the volume-weighted RSI of typical price.
- [Indicator-Obv](/Indicators/Indicator-Obv) — cumulative signed volume.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
