# BetterVolume

> A Volume-Spread-Analysis "effort versus result" oscillator — positive means a
> bar spent more volume than its range warranted (churn), negative means it moved
> far on light volume (ease of movement).

## Quick reference

| Field | Value |
|-------|-------|
| Family | Volume |
| Input type | `Candle` (high / low / volume) |
| Output type | `f64` |
| Output range | centred near `0` (`+` = churn, `−` = ease of movement) |
| Default parameters | `(period = 20)` (Python) |
| Warmup period | `period` |
| Interpretation | `> 0` = effort exceeds result (absorption); `< 0` = efficient move. |

## Formula

```
range_t   = high_t − low_t
rel_vol   = volume_t / SMA(volume, period)
rel_range = range_t  / SMA(range,  period)
BetterVol = rel_vol − rel_range
```

Volume-Spread Analysis reads price action through **effort** (volume) versus
**result** (the bar's spread). Better Volume normalises both against their own
`period` simple moving averages (current bar included) and subtracts: a positive
reading means the bar used above-average volume to produce below-average range —
*churn*, the signature of absorption near turning points — while a negative
reading means an above-average range came on below-average volume — *ease of
movement*, a trend meeting no resistance. Source:
`crates/wickra-core/src/indicators/better_volume.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `20` (Python) | `>= 1`      | `better_volume.rs:60` | Averaging window for both the volume and range baselines. `0` errors with `Error::PeriodZero`. |

The `period` getter returns the window; `value` returns the current output if
ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/better_volume.rs`:

```rust
use wickra::{Candle, Indicator, BetterVolume};
// BetterVolume: Input = Candle, Output = f64
const _: fn(&mut BetterVolume, Candle) -> Option<f64> = <BetterVolume as Indicator>::update;
```

A `Candle` in, an `Option<f64>` out. The Python binding takes a candle for
`update` and three numpy columns `(high, low, volume)` for `batch`; Node takes
`update(high, low, volume)` and `batch(high[], low[], volume[])` (NaN warmup).

## Warmup

`warmup_period() == period`. The two simple moving averages need a full window
before the first reading (`first_emission_at_warmup_period` pins this).

## Edge cases

- **Steady bars → 0.** Identical volume and range every bar make both relative
  legs `1`, so the oscillator is `0` (`steady_bars_are_neutral` pins this).
- **Churn bar → positive.** A high-volume narrow-range bar reads positive
  (`churn_bar_is_positive` pins this).
- **Ease of movement → negative.** A wide-range light-volume bar reads negative
  (`ease_of_movement_bar_is_negative` pins this).
- **Degenerate averages.** Zero volume and zero range guard each leg to `0` rather
  than dividing by zero (`zero_everything_is_zero` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `bv.reset()` clears both rolling windows, both sums and the last
  value (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, BetterVolume};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut bv = BetterVolume::new(4)?;
    let mut candles: Vec<Candle> = (0..3)
        .map(|_| Candle::new(100.0, 105.0, 100.0, 102.0, 1_000.0, 0).unwrap())
        .collect();
    // A high-volume, narrow-range churn bar.
    candles.push(Candle::new(100.0, 100.5, 100.0, 100.2, 5_000.0, 0)?);
    let out = bv.batch(&candles);
    println!("last > 0 (churn): {}", out.last().unwrap().unwrap() > 0.0);
    Ok(())
}
```

Output:

```
last > 0 (churn): true
```

### Python

```python
import numpy as np
import wickra as ta

bv = ta.BetterVolume(20)
n = 60
high   = np.array([105.0] * n)
low    = np.array([100.0] * n)
close  = np.array([102.0] * n)
volume = np.array([1000.0] * n)
volume[-1] = 5000.0          # churn bar
high[-1] = 100.5             # narrow range
close[-1] = 100.2            # keep the last candle valid (low <= close <= high)
print(bv.batch(high, low, close, volume)[-1] > 0)  # True
```

### Node

```javascript
const ta = require('wickra');

const bv = new ta.BetterVolume(20);
console.log('warmupPeriod:', bv.warmupPeriod()); // 20
```

### Streaming

```rust
use wickra::{Candle, Indicator, BetterVolume};

let mut bv = BetterVolume::new(20).unwrap();
let mut last = None;
for i in 0..60 {
    let base = 100.0 + f64::from(i);
    let c = Candle::new(base, base + 2.0, base - 2.0, base + 0.5, 1_000.0, 0).unwrap();
    last = bv.update(c);
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Absorption / climax.** A strong positive spike — heavy volume, little range —
   at the end of a trend warns that the move is being absorbed; a reversal often
   follows.
2. **Healthy trend.** Sustained mildly-negative readings mean price is advancing
   efficiently on modest volume — the trend faces no resistance.
3. **No-demand / no-supply.** Combine the sign with bar direction: a narrow-range
   up-bar on low volume into resistance is "no demand"; the oscillator near zero
   on a tiny bar confirms the lack of effort.

## Common pitfalls

- **It is a digest, not the full VSA grid.** The classic Better Volume indicator
  colours bars into several categories; this oscillator distils the core
  effort-vs-result axis into one number — read it alongside price structure.
- **Needs real volume.** On feeds without genuine volume the signal is noise.
- **Period choice.** A short `period` makes every bar look extreme; a long one
  buries genuine climaxes.

## References

Williams, T., & Brooks, G. (2005), *Master the Markets* (Volume Spread Analysis);
Wyckoff, R. D. — the original effort-versus-result principle.

## See also

- [Indicator-EaseOfMovement](/Indicators/Indicator-EaseOfMovement) — Arms' range/volume mover.
- [Indicator-ForceIndex](/Indicators/Indicator-ForceIndex) — price change times volume.
- [Indicator-MarketFacilitationIndex](/Indicators/Indicator-MarketFacilitationIndex) — range per unit volume.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
