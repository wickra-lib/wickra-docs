# OpenInterestMomentum

> The percentage rate of change of open interest over a lookback — positioning
> trend rather than the single-tick delta.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Derivatives |
| Input type | `DerivativesTick` (open interest) |
| Output type | `f64` (percent) |
| Output range | signed (percent) |
| Default parameters | `(period = 5)` (Python) |
| Warmup period | `period + 1` |
| Interpretation | `> 0` OI expanding (new money); `< 0` contracting (deleveraging). |

## Formula

```
OIM = 100 · (OI_t − OI_{t−period}) / OI_{t−period}
```

Where [`OIDelta`](/Indicators/Indicator-OpenInterestDelta) reports the single-tick change, OI
Momentum measures the positioning trend over a window: rising OI = new money
building positions (trend fuel); falling OI = positions closing (deleveraging /
short-covering). Source:
`crates/wickra-core/src/indicators/open_interest_momentum.rs`.

## Parameters

| Name     | Type    | Default      | Valid range | Source | Description |
|----------|---------|--------------|-------------|--------|-------------|
| `period` | `usize` | `5` (Python) | `>= 1`      | `open_interest_momentum.rs:52` | Lookback in ticks for the rate of change. `0` errors with `Error::PeriodZero`. |

The `period` getter returns the lookback; `value` returns the current output if
ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/open_interest_momentum.rs`:

```rust
use wickra::{Indicator, OpenInterestMomentum};
use wickra::derivatives::DerivativesTick;
// OpenInterestMomentum: Input = DerivativesTick, Output = f64
const _: fn(&mut OpenInterestMomentum, DerivativesTick) -> Option<f64> =
    <OpenInterestMomentum as Indicator>::update;
```

A `DerivativesTick` in, an `Option<f64>` out. Python/Node take the full tick field
order; only `open_interest` is used.

## Warmup

`warmup_period() == period + 1`. The window needs the current and `period`-ago OI
(`first_emission_at_warmup_period` pins this).

## Edge cases

- **Reference value.** `1000 → 1200` over the window → `+20%`
  (`reference_value` pins this).
- **Expanding → positive.** (`expanding_oi_is_positive` pins this).
- **Contracting → negative.** (`contracting_oi_is_negative` pins this).
- **Zero base → 0.** A zero OI `period` ago returns `0` (`zero_base_is_zero` pins
  this).
- **Finiteness.** `DerivativesTick::new` rejects non-finite fields, so no in-method
  guard is needed.
- **Reset.** `o.reset()` clears the OI window and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, OpenInterestMomentum};
use wickra::derivatives::DerivativesTick;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut o = OpenInterestMomentum::new(2)?;
    let t = |oi: f64| DerivativesTick::new(0.0, 100.0, 100.0, 100.0, oi, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0).unwrap();
    let out = o.batch(&[t(1_000.0), t(1_100.0), t(1_200.0)]);
    println!("{:?}", out.last().unwrap()); // Some(20.0)
    Ok(())
}
```

Output:

```
Some(20.0)
```

### Python

```python
import numpy as np
import wickra as ta

o = ta.OpenInterestMomentum(5)
# build ticks via the binding's tick helper / per-field update
```

### Node

```javascript
const ta = require('wickra');
const o = new ta.OpenInterestMomentum(5);
console.log('warmupPeriod:', o.warmupPeriod()); // 6
```

### Streaming

```rust
use wickra::{Indicator, OpenInterestMomentum};
use wickra::derivatives::DerivativesTick;

let mut o = OpenInterestMomentum::new(5).unwrap();
for tick in deriv_feed {
    if let Some(oim) = o.update(tick) {
        // oim > 0 with rising price -> new-long trend
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Trend confirmation.** Rising OI Momentum with rising price = new longs fuelling
   the move; with falling price = new shorts.
2. **Short-covering tell.** Price up while OI Momentum is negative = a covering
   rally that may stall once shorts are out.
3. **Deleveraging.** Sharp negative OI Momentum during a selloff marks forced
   position closing / liquidations.

## Common pitfalls

- **Not OIDelta.** This is a multi-tick percentage trend, not the per-tick change.
- **Tick cadence.** "period" is in ticks — align the cadence to your bar size.
- **OI definition.** Use a consistent OI source; venue definitions differ.

## References

Open-interest trend analysis is standard futures practice; see Schwager, J. D.
(1996), *Schwager on Futures*.

## See also

- [Indicator-OpenInterestDelta](/Indicators/Indicator-OpenInterestDelta) — per-tick OI change.
- [Indicator-OIWeighted](/Indicators/Indicator-OIWeighted) — OI-weighted price.
- [Indicator-OiToVolumeRatio](/Indicators/Indicator-OiToVolumeRatio) — OI vs. turnover.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
