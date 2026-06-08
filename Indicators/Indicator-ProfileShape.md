# ProfileShape

> Classifies the rolling volume profile by where its point of control sits: P-shape
> (+1), b-shape (−1), or D/normal (0).

## Quick reference

| Field | Value |
|-------|-------|
| Family | Market Profile |
| Input type | `Candle` (high / low / volume) |
| Output type | `f64` (shape code) |
| Output range | `{−1, 0, +1}` |
| Default parameters | `(period = 20, bins = 24)` (Python) |
| Warmup period | `period` |
| Interpretation | `+1` P-shape (short-cover/accum); `−1` b-shape (liquidation); `0` balanced. |

## Formula

```
build a `bins`-bucket volume profile over the last `period` candles
poc_idx = bin with the most volume
+1  P-shape : POC in the upper third
−1  b-shape : POC in the lower third
 0  D/normal: POC in the middle third
```

Market Profile readers classify the day by where the heaviest trading sits. A
**P-shape** (control high, thin tail below) marks short-covering or early
accumulation; a **b-shape** (control low, thin tail above) marks long liquidation
or distribution; a **D-shape** is a balanced two-sided day. Source:
`crates/wickra-core/src/indicators/profile_shape.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `20` (Python) | `>= 1`      | `profile_shape.rs:60` | Rolling profile window. `0` errors with `Error::PeriodZero`. |
| `bins`   | `usize` | `24` (Python) | `>= 3`      | `profile_shape.rs:60` | Price buckets (need three for the split). `< 3` errors with `Error::InvalidPeriod`. |

`params()` returns `(period, bins)`; `value` returns the current code if ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/profile_shape.rs`:

```rust
use wickra::{Candle, Indicator, ProfileShape};
// ProfileShape: Input = Candle, Output = f64
const _: fn(&mut ProfileShape, Candle) -> Option<f64> = <ProfileShape as Indicator>::update;
```

A `Candle` in, an `Option<f64>` out (`+1`/`0`/`−1`). Python `update(candle)` /
`batch(high, low, volume)`; Node `update(high, low, volume)` / `batch(...)`.

## Warmup

`warmup_period() == period`. The profile window must fill first
(`first_emission_at_warmup_period` pins this).

## Edge cases

- **P-shape.** Heavy top volume → `+1` (`heavy_top_is_p_shape` pins this).
- **b-shape.** Heavy bottom volume → `−1` (`heavy_bottom_is_b_shape` pins this).
- **D-shape.** Balanced middle → `0` (`balanced_is_d_shape` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `p.reset()` clears the window and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, ProfileShape};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut p = ProfileShape::new(6, 9)?;
    let c = |hi: f64, lo: f64, v: f64| Candle::new((hi+lo)/2.0, hi, lo, (hi+lo)/2.0, v, 0).unwrap();
    let mut candles: Vec<Candle> = (0..5).map(|_| c(119.0, 117.0, 5_000.0)).collect();
    candles.push(c(119.0, 80.0, 50.0)); // thin tail down
    println!("{:?}", p.batch(&candles).last().unwrap()); // Some(1.0) P-shape
    Ok(())
}
```

Output:

```
Some(1.0)
```

### Python

```python
import numpy as np
import wickra as ta

p = ta.ProfileShape(20, 24)
high = ...; low = ...; volume = ...
print(p.batch(high, low, volume)[-1])  # -1 / 0 / 1
```

### Node

```javascript
const ta = require('wickra');
const p = new ta.ProfileShape(20, 24);
console.log('warmupPeriod:', p.warmupPeriod()); // 20
```

### Streaming

```rust
use wickra::{Candle, Indicator, ProfileShape};

let mut p = ProfileShape::new(20, 24).unwrap();
let feed: Vec<Candle> = Vec::new(); // your live stream
for candle in feed {
    match p.update(candle) {
        Some(1.0)  => println!("P-shape (short-covering / accumulation)"),
        Some(-1.0) => println!("b-shape (long liquidation / distribution)"),
        Some(0.0)  => println!("D-shape (balanced)"),
        _ => {}
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Posture.** P after a downtrend = short-covering (possible bottom); b after an
   uptrend = distribution (possible top).
2. **Continuation vs. reversal.** Read the shape in context of the prior trend to
   judge whether it confirms or warns.
3. **Balance detection.** Repeated D-shapes signal a balancing market — fade the
   edges until it breaks.

## Common pitfalls

- **Coarse code.** Three buckets summarise a rich profile; inspect the full
  [`VolumeProfile`](/Indicators/Indicator-VolumeProfile) for nuance.
- **Window = session.** Set `period` to one session's bars for classic shape reads.
- **Bins resolution.** Too few bins coarsen the POC location.

## References

Dalton, J. F. (1993), *Mind Over Markets*; Steidlmayer, J. P. — Market Profile.

## See also

- [Indicator-VolumeProfile](/Indicators/Indicator-VolumeProfile) — the full profile.
- [Indicator-HighLowVolumeNodes](/Indicators/Indicator-HighLowVolumeNodes) — HVN/LVN levels.
- [Indicator-ValueArea](/Indicators/Indicator-ValueArea) — the 70% value area.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
