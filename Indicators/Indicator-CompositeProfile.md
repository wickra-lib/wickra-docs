# CompositeProfile

> A multi-session volume profile reduced to its point of control and value area —
> the swing-horizon levels that matter.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Market Profile |
| Input type | `Candle` (high / low / volume) |
| Output type | `CompositeProfileOutput { poc, vah, val }` |
| Output range | price levels; `val <= poc <= vah` |
| Default parameters | `(period = 100, bins = 50, value_area_pct = 0.70)` |
| Warmup period | `period` |
| Interpretation | POC = fair price; value area = in-balance zone. |

## Formula

```
build a `bins`-bucket volume profile over the last `period` candles
POC = bin with the most volume
expand from the POC, always adding the heavier adjacent bin, until the
  accumulated volume reaches `value_area_pct` of the total
VAH / VAL = highest / lowest price included
```

A composite profile merges many sessions to reveal the dominant control price and
value area over a longer horizon. The POC is the fairest price; the value area
(classically 70%) brackets where the market spent most of its time. Source:
`crates/wickra-core/src/indicators/composite_profile.rs`.

## Parameters

| Name             | Type    | Default | Valid range | Source | Description |
|------------------|---------|---------|-------------|--------|-------------|
| `period`         | `usize` | `100`   | `>= 1`      | `composite_profile.rs:73` | Composite window length. |
| `bins`           | `usize` | `50`    | `>= 1`      | `composite_profile.rs:73` | Price buckets. `0` for either errors with `Error::PeriodZero`. |
| `value_area_pct` | `f64`   | `0.70`  | `(0, 1]`    | `composite_profile.rs:73` | Fraction of volume in the value area. Outside `(0, 1]` errors with `Error::InvalidParameter`. |

`params()` returns `(period, bins, value_area_pct)`; `value` returns the current
output if ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/composite_profile.rs`:

```rust
use wickra::{Candle, Indicator, CompositeProfile, CompositeProfileOutput};
// CompositeProfile: Input = Candle, Output = CompositeProfileOutput
const _: fn(&mut CompositeProfile, Candle) -> Option<CompositeProfileOutput> =
    <CompositeProfile as Indicator>::update;
```

A `Candle` in, an `Option<CompositeProfileOutput>` out. The Python binding returns a
`(poc, vah, val)` tuple from `update` and an `(n, 3)` array from `batch(high, low,
volume)`; Node returns `{ poc, vah, val }` and a flat `Float64Array` of length
`n*3`; WASM mirrors the object with camelCase keys.

## Warmup

`warmup_period() == period`. The composite window must fill first
(`first_emission_at_warmup_period` pins this).

## Edge cases

- **Value area brackets POC.** `val <= poc <= vah` always
  (`value_area_brackets_poc` pins this).
- **POC at the cluster.** A heavy cluster wins the POC (`poc_at_heavy_cluster` pins
  this).
- **Flat window.** A zero-span window collapses all three onto the price (guarded in
  the source).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `p.reset()` clears the window and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, CompositeProfile};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut p = CompositeProfile::new(20, 30, 0.70)?;
    let candles: Vec<Candle> = (0..40)
        .map(|i| { let b = 100.0 + (f64::from(i) * 0.3).sin() * 8.0;
                   Candle::new(b, b + 1.0, b - 1.0, b, 1_000.0, 0).unwrap() })
        .collect();
    let out = p.batch(&candles).last().unwrap().unwrap();
    println!("poc={:.1} vah={:.1} val={:.1}", out.poc, out.vah, out.val);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

p = ta.CompositeProfile(100, 50, 0.70)
high = ...; low = ...; volume = ...
poc, vah, val = p.batch(high, low, volume).T
```

### Node

```javascript
const ta = require('wickra');
const p = new ta.CompositeProfile(100, 50, 0.70);
console.log('warmupPeriod:', p.warmupPeriod()); // 100
```

### Streaming

```rust
use wickra::{Candle, Indicator, CompositeProfile};

let mut p = CompositeProfile::new(100, 50, 0.70).unwrap();
let feed: Vec<Candle> = Vec::new(); // your live stream
for candle in feed {
    if let Some(out) = p.update(candle) {
        // price below out.val -> potential value migration / breakdown
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Fair value.** Trade reversion to the POC inside the value area; treat VAH/VAL
   as the balance edges.
2. **Value migration.** Acceptance (multiple closes) outside the value area signals
   the market is moving to a new value — trade with it.
3. **Swing levels.** A composite POC over many sessions is a higher-timeframe magnet
   than a single-session POC.

## Common pitfalls

- **Composite length.** A longer `period` smooths the structure but lags shifts in
  value.
- **Bin resolution.** Coarse bins move the POC/value-area edges; keep consistent.
- **Needs volume.** Meaningless on synthetic volume.

## References

Steidlmayer, J. P. — Market Profile / composite profiles; Dalton, J. F. (1993),
*Mind Over Markets*.

## See also

- [Indicator-VolumeProfile](/Indicators/Indicator-VolumeProfile) — the full single-window profile.
- [Indicator-ValueArea](/Indicators/Indicator-ValueArea) — the value area alone.
- [Indicator-NakedPoc](/Indicators/Indicator-NakedPoc) — untested points of control.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
