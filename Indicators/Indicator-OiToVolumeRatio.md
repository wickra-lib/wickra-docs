# OiToVolumeRatio

> Open interest divided by traded volume — how much position is held versus turned
> over.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Derivatives |
| Input type | `DerivativesTick` (open interest / taker volumes) |
| Output type | `f64` |
| Output range | `[0, ∞)` |
| Default parameters | None (parameter-free) |
| Warmup period | `1` |
| Interpretation | High = positions held (low churn); low = active churn. |

## Formula

```
OIVR = open_interest / (taker_buy_volume + taker_sell_volume)
```

A high ratio means open interest dwarfs the volume trading it — positions held, not
churned. A low ratio means heavy turnover relative to outstanding interest — active
churn around breakouts or capitulation. Source:
`crates/wickra-core/src/indicators/oi_to_volume_ratio.rs`.

## Parameters

| Name | Type | Default | Valid range | Source | Description |
|------|------|---------|-------------|--------|-------------|
| — | — | — | — | None. | OIVR is parameter-free; `OiToVolumeRatio::new()` is infallible. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/oi_to_volume_ratio.rs`:

```rust
use wickra::{Indicator, OiToVolumeRatio};
use wickra::DerivativesTick;
// OiToVolumeRatio: Input = DerivativesTick, Output = f64
const _: fn(&mut OiToVolumeRatio, DerivativesTick) -> Option<f64> =
    <OiToVolumeRatio as Indicator>::update;
```

A `DerivativesTick` in, an `Option<f64>` out. Python `update(funding, mark, index,
futures, oi, long_size, short_size, taker_buy, taker_sell, long_liq, short_liq)` /
`build_tick` + `batch`; Node mirrors the order. Uses `open_interest`,
`taker_buy_volume`, `taker_sell_volume`.

## Warmup

`warmup_period() == 1`. Each tick yields one value (`ready_after_first_update` pins
this).

## Edge cases

- **Reference value.** `5000 / (400 + 600) = 5.0` (`ratio_reference_value` pins
  this).
- **Volume lowers it.** More taker volume on the same OI lowers the ratio
  (`more_volume_lowers_ratio` pins this).
- **Zero volume → 0.** (`zero_volume_is_zero` pins this).
- **Finiteness.** `DerivativesTick::new` rejects non-finite fields, so no in-method
  guard is needed.
- **Reset.** `o.reset()` clears readiness (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Indicator, OiToVolumeRatio};
use wickra::DerivativesTick;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut o = OiToVolumeRatio::new();
    let tick = DerivativesTick::new(0.0, 100.0, 100.0, 100.0, 5_000.0, 0.0, 0.0, 400.0, 600.0, 0.0, 0.0, 0)?;
    println!("{:?}", o.update(tick)); // Some(5.0)
    Ok(())
}
```

Output:

```
Some(5.0)
```

### Python

```python
import wickra as ta
o = ta.OiToVolumeRatio()
print(o.update(0, 100, 100, 100, 5000, 0, 0, 400, 600, 0, 0))  # 5.0
```

### Node

```javascript
const ta = require('wickra');
const o = new ta.OiToVolumeRatio();
console.log(o.update(0, 100, 100, 100, 5000, 0, 0, 400, 600, 0, 0)); // 5
```

### Streaming

```rust
use wickra::{Indicator, OiToVolumeRatio};
use wickra::DerivativesTick;

let mut o = OiToVolumeRatio::new();
let deriv_feed: Vec<DerivativesTick> = Vec::new(); // your live stream
for tick in deriv_feed {
    if let Some(oivr) = o.update(tick) {
        // low oivr -> heavy churn vs outstanding interest
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **New money vs. churn.** OI and volume both rising = new participants (trend
   fuel); volume rising while OI flat = churn/rolls.
2. **Complacency.** A very high, stable ratio can mark a coiled, under-traded market
   set for an expansion.
3. **Confirmation.** Use alongside price to validate breakouts with fresh OI.

## Common pitfalls

- **Volume units.** OI and volume must be in comparable units (both notional or both
  contracts).
- **Interval volume.** The ratio depends on the tick's volume window; align it to
  your bar size.
- **Cross-venue.** OI/volume conventions differ across exchanges.

## References

OI-to-volume analysis is standard futures practice; see Schwager, J. D. (1996),
*Schwager on Futures*.

## See also

- [Indicator-EstimatedLeverageRatio](/Indicators/Indicator-EstimatedLeverageRatio) — OI vs. position base.
- [Indicator-OpenInterestMomentum](/Indicators/Indicator-OpenInterestMomentum) — OI rate of change.
- [Indicator-OpenInterestDelta](/Indicators/Indicator-OpenInterestDelta) — per-tick OI change.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
