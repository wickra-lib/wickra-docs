# TradeVolumeIndex

> Cumulative volume signed by a **minimum-tick** rule — adds volume on up-ticks,
> subtracts on down-ticks, and holds direction through sub-tick churn.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Volume |
| Input type | `Candle` (close / volume) |
| Output type | `f64` |
| Output range | `(−∞, +∞)` (a cumulative line; only slope/divergence matters) |
| Default parameters | `(min_tick = 0.5)` (Python) |
| Warmup period | `2` |
| Interpretation | Rising = net buying; falling = net selling; watch divergence vs price. |

## Formula

```
change = close − prev_close
if  change >  min_tick:  direction = +1
if  change < −min_tick:  direction = −1
else:                    direction unchanged
TVI_t = TVI_{t−1} + direction * volume
```

The Trade Volume Index is [`Obv`](/Indicators/Indicator-Obv) with a **dead-band**.
A move must exceed `min_tick` (the minimum tick value, MTV) to flip the
accumulation direction; smaller moves are treated as price "churning" inside the
spread, so the line keeps accumulating in the last established direction rather
than whipsawing on noise. The result is a cleaner cumulative-volume line on
instruments that trade in a tight band. Source:
`crates/wickra-core/src/indicators/trade_volume_index.rs`.

## Parameters

| Name       | Type  | Default        | Valid range | Source | Description |
|------------|-------|----------------|-------------|--------|-------------|
| `min_tick` | `f64` | `0.5` (Python) | `>= 0`, finite | `trade_volume_index.rs:54` | Dead-band: moves at or below this size hold the prior direction. Non-finite or negative errors with `Error::InvalidParameter`. |

The `min_tick` getter returns the dead-band; `value` returns the current output
if ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/trade_volume_index.rs`:

```rust
use wickra::{Candle, Indicator, TradeVolumeIndex};
// TradeVolumeIndex: Input = Candle, Output = f64
const _: fn(&mut TradeVolumeIndex, Candle) -> Option<f64> = <TradeVolumeIndex as Indicator>::update;
```

A `Candle` in, an `Option<f64>` out. The Python binding takes a candle for
`update` and two numpy columns `(close, volume)` for `batch`; Node takes
`update(close, volume)` and `batch(close[], volume[])` (NaN warmup).

## Warmup

`warmup_period() == 2`. The first candle only seeds the reference close; the first
cumulative value lands on the second bar (`first_bar_seeds_without_output` pins
this).

## Edge cases

- **Uptrend accumulates.** Moves above `min_tick` add volume in the up direction
  (`uptrend_accumulates_volume` pins this).
- **Sub-tick churn holds direction.** A move at or below `min_tick` keeps adding
  in the last established direction (`small_move_holds_last_direction` pins this).
- **Downtrend distributes.** Moves below `−min_tick` subtract volume
  (`downtrend_distributes_volume` pins this).
- **`min_tick = 0` allowed.** A zero dead-band makes every non-zero move flip the
  direction (`rejects_invalid_min_tick` pins the accepted `0` case).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `tvi.reset()` clears the reference close, the direction, the running
  total and the last value (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, TradeVolumeIndex};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut tvi = TradeVolumeIndex::new(0.5)?;
    let candles = [
        Candle::new(100.0, 100.0, 100.0, 100.0, 1_000.0, 0)?, // seed
        Candle::new(101.0, 101.0, 101.0, 101.0,   500.0, 0)?, // +1 -> +500
        Candle::new(102.0, 102.0, 102.0, 102.0,   300.0, 0)?, // +1 -> +300
    ];
    let out = tvi.batch(&candles);
    println!("{:?}", out); // [None, Some(500.0), Some(800.0)]
    Ok(())
}
```

Output:

```
[None, Some(500.0), Some(800.0)]
```

### Python

```python
import numpy as np
import wickra as ta

tvi = ta.TradeVolumeIndex(0.5)
close  = np.array([100, 101, 102], dtype=float)
volume = np.array([1000, 500, 300], dtype=float)
print(tvi.batch(close, volume))
```

Output:

```
[ nan  500.  800.]
```

### Node

```javascript
const ta = require('wickra');

const tvi = new ta.TradeVolumeIndex(0.5);
console.log('warmupPeriod:', tvi.warmupPeriod()); // 2
console.log(tvi.batch([100, 101, 102], [1000, 500, 300])); // [NaN, 500, 800]
```

### Streaming

```rust
use wickra::{Candle, Indicator, TradeVolumeIndex};

let mut tvi = TradeVolumeIndex::new(0.5).unwrap();
let mut last = None;
for i in 0..20 {
    let close = 100.0 + f64::from(i);
    let c = Candle::new(close, close + 0.5, close - 0.5, close, 1_000.0, 0).unwrap();
    last = tvi.update(c);
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Trend confirmation.** A TVI rising with price confirms that volume is backing
   the advance; a flat TVI under rising price warns of a hollow rally.
2. **Divergence.** TVI making lower highs while price makes higher highs flags
   distribution; the mirror flags accumulation.
3. **Tuning the dead-band.** Set `min_tick` to the instrument's actual minimum
   price increment (or a small multiple) so intrabar noise does not flip the
   accumulation direction.

## Common pitfalls

- **Pick `min_tick` deliberately.** Too small and TVI degenerates to OBV; too
  large and it stops responding to real moves.
- **Level is arbitrary.** Only the shape matters; the starting value carries no
  information.
- **Close-to-close only.** TVI ignores the intrabar path, so a bar that travels
  far and returns near its open is treated as quiet.

## References

The Trade Volume Index is documented in MetaStock's formula reference and Steven
Achelis, *Technical Analysis from A to Z* — the minimum-tick (MTV) accumulation
rule is the defining feature.

## See also

- [Indicator-Obv](/Indicators/Indicator-Obv) — cumulative signed volume without a dead-band.
- [Indicator-Pvi](/Indicators/Indicator-Pvi) — the positive volume index.
- [Indicator-Nvi](/Indicators/Indicator-Nvi) — the negative volume index.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
