# BetterVolume

> Barry Taylor's (emini-watch) Better Volume — classifies each bar by its
> **effort** (volume) against its **result** (range) over a lookback: low
> volume, climax up/down, high churn, or climax + churn.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Volume |
| Input type | `Candle` (open / high / low / close / volume) |
| Output type | `f64` (a category code) |
| Output range | one of `0, 1, 2, 3, −3, 4` |
| Default parameters | `(period = 14)` (Python) |
| Warmup period | `period` |
| Interpretation | `1` low volume · `±3` climax up / down · `2` high churn · `4` climax + churn · `0` neutral. |

## Formula

```
range      = high − low
low volume : volume          is a new low  of the lookback   -> 1
climax     : volume · range  is a new high of the lookback   -> +3 up bar (close ≥ open), −3 down bar
churn      : volume / range  is a new high of the lookback   -> 2
both       : climax and churn on the same bar                -> 4
otherwise                                                    -> 0
```

The rules are applied **in that order and a later match overrides an earlier
one**, as in Taylor's original. "New high / low" means *strictly* beyond every
one of the previous `period − 1` bars (the current bar is compared against the
bars before it), so a run of identical bars stays neutral. A zero-range bar has
no defined volume per range and never counts as churn.

Volume-Spread Analysis reads price action through effort versus result. A
**climax** is the most effort meeting the widest result — often the start or
end of a move; **churn** is heavy volume going nowhere — professional
absorption near turning points; a **low-volume** bar shows the absence of
interest that marks pullbacks and tests. Source:
`crates/wickra-core/src/indicators/better_volume.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `14` (Python) | `>= 1`      | `better_volume.rs:76` | Lookback length: the current bar is compared against the previous `period − 1` bars. `0` errors with `Error::PeriodZero`. |

The `period` getter returns the lookback; `value` returns the current code if
ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/better_volume.rs`:

```rust
use wickra::{Candle, Indicator, BetterVolume};
// BetterVolume: Input = Candle, Output = f64
const _: fn(&mut BetterVolume, Candle) -> Option<f64> = <BetterVolume as Indicator>::update;
```

A `Candle` in, an `Option<f64>` code out. The `open` matters: it decides the
sign of a climax bar. The Python binding takes a candle for `update` and five
numpy columns `(open, high, low, close, volume)` for `batch`; Node and WASM
take `update(open, high, low, close, volume)` and
`batch(open[], high[], low[], close[], volume[])` (NaN warmup).

## Warmup

`warmup_period() == period`. The lookback must hold `period` bars before the
first classification (`first_emission_at_warmup_period` pins this for
`period = 3`).

## Edge cases

- **Steady bars → 0.** Identical bars are never a *strict* new high or low, so
  they classify as neutral (`steady_bars_are_neutral` pins this).
- **Low volume → 1.** A bar whose volume undercuts every previous bar in the
  lookback (`low_volume_bar` pins this).
- **Climax → ±3.** The largest `volume · range` of the lookback; `+3` when
  `close ≥ open`, `−3` otherwise (`climax_bars_carry_direction` pins both).
- **Churn → 2.** The largest `volume / range` of the lookback without being a
  climax (`churn_bar` pins this).
- **Climax + churn → 4.** Both on the same bar (`climax_and_churn_together`
  pins this).
- **Zero-range bars.** `volume / range` is undefined, so they never churn
  (`zero_range_bars_never_churn` pins a run of flat, zero-volume bars to `0`).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `bv.reset()` clears the lookback window and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, BetterVolume};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut bv = BetterVolume::new(3)?;
    let steady = Candle::new(100.0, 102.0, 100.0, 101.0, 1_000.0, 0)?;
    let candles = vec![
        steady,
        steady,
        // Same range, a bit more volume on a narrower bar: high churn.
        Candle::new(100.0, 101.0, 100.0, 100.5, 1_500.0, 0)?,
    ];
    println!("{:?}", bv.batch(&candles));
    Ok(())
}
```

Output:

```
[None, None, Some(2.0)]
```

### Python

```python
import numpy as np
import wickra as ta

S = (100, 102, 100, 101, 1000)                  # steady bar: open, high, low, close, volume
bars = [S, S, (100, 102, 100, 101, 200),        # low volume
        S, S, (100, 110, 100, 109, 4000),       # climax up
        S, S, (109, 110, 100, 100.5, 4000),     # climax down
        S, S, (100, 101, 100, 100.5, 1500),     # high churn
        S, S, (100, 103, 100, 102, 10000)]      # climax + churn
o, h, l, c, v = (np.array(col, dtype=float) for col in zip(*bars))
print(list(ta.BetterVolume(3).batch(o, h, l, c, v)))
# [nan, nan, 1.0, 0.0, 0.0, 3.0, 0.0, 0.0, -3.0, 0.0, 0.0, 2.0, 0.0, 0.0, 4.0]
```

### Node

```javascript
const ta = require('wickra');

const bv = new ta.BetterVolume(3);
bv.update(100, 102, 100, 101, 1000);
bv.update(100, 102, 100, 101, 1000);
console.log(bv.update(100, 101, 100, 100.5, 1500)); // 2 (high churn)
console.log('warmupPeriod:', bv.warmupPeriod());     // 3
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
println!("{last:?}"); // Some(0.0): constant volume and range never set a new extreme
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Climax (`±3`).** Maximum effort meeting maximum result. At the end of an
   extended move it often marks exhaustion (a buying climax up, a selling
   climax down); at the start of a range break it marks strong participation.
2. **High churn (`2`).** Heavy volume relative to the range — effort without
   result. Professionals are absorbing supply or demand; look for a turn,
   especially near support / resistance.
3. **Climax + churn (`4`).** Both signatures on one bar — the strongest
   turning-point warning.
4. **Low volume (`1`).** No interest: in a pullback it suggests the counter
   move is weak ("no supply" / "no demand") and the trend may resume.

## Common pitfalls

- **Reading the codes as a scale.** The output is a categorical code, not an
  oscillator — `4` is not "twice" `2`, and averaging or smoothing the codes is
  meaningless. Branch on the value instead.
- **Override order.** A bar that is both low-volume and churn (narrow range on
  little volume) reports `2`, not `1`, because later rules override earlier ones.
- **Needs real volume.** On feeds without genuine volume the classification is
  noise.
- **Period choice.** A short `period` makes many bars "new" extremes; a long one
  flags only the rare outliers.

## References

Barry Taylor, *Better Volume* indicator (emini-watch.com); Williams, T., &
Brooks, G. (2005), *Master the Markets* (Volume Spread Analysis); Wyckoff,
R. D. — the original effort-versus-result principle.

## See also

- [Indicator-EaseOfMovement](/Indicators/Indicator-EaseOfMovement) — Arms' range/volume mover.
- [Indicator-ForceIndex](/Indicators/Indicator-ForceIndex) — price change times volume.
- [Indicator-MarketFacilitationIndex](/Indicators/Indicator-MarketFacilitationIndex) — range per unit volume.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
