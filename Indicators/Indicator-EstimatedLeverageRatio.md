# EstimatedLeverageRatio

> Open interest relative to aggregate position size — a proxy for how leveraged the
> outstanding positions are.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Derivatives |
| Input type | `DerivativesTick` (open interest / long & short size) |
| Output type | `f64` |
| Output range | `[0, ∞)` |
| Default parameters | None (parameter-free) |
| Warmup period | `1` |
| Interpretation | High/rising = crowded leverage; falling = deleveraging. |

## Formula

```
ELR = open_interest / (long_size + short_size)
```

The estimated leverage ratio compares open interest (notional of outstanding
contracts) to the position base backing it. A rising ELR means a given pool of
positions controls more open interest — hotter leverage and a more fragile market
prone to liquidation cascades. Source:
`crates/wickra-core/src/indicators/estimated_leverage_ratio.rs`.

## Parameters

| Name | Type | Default | Valid range | Source | Description |
|------|------|---------|-------------|--------|-------------|
| — | — | — | — | None. | ELR is parameter-free; `EstimatedLeverageRatio::new()` is infallible. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/estimated_leverage_ratio.rs`:

```rust
use wickra::{Indicator, EstimatedLeverageRatio};
use wickra::derivatives::DerivativesTick;
// EstimatedLeverageRatio: Input = DerivativesTick, Output = f64
const _: fn(&mut EstimatedLeverageRatio, DerivativesTick) -> Option<f64> =
    <EstimatedLeverageRatio as Indicator>::update;
```

A `DerivativesTick` in, an `Option<f64>` out. The Python binding takes a tick via
`update(funding, mark, index, futures, oi, long_size, short_size, taker_buy,
taker_sell, long_liq, short_liq)` and a `build_tick` helper for `batch`; Node
mirrors the field order. Only `open_interest`, `long_size`, `short_size` are used.

## Warmup

`warmup_period() == 1`. Each tick yields one value (`ready_after_first_update` pins
this).

## Edge cases

- **Reference value.** `1000 / (400 + 600) = 1.0` (`ratio_reference_value` pins
  this).
- **OI raises it.** Higher open interest on the same base raises the ratio
  (`higher_oi_raises_ratio` pins this).
- **Zero base → 0.** A tick with zero aggregate size returns `0`
  (`zero_base_is_zero` pins this).
- **Finiteness.** `DerivativesTick::new` rejects non-finite fields, so no in-method
  guard is needed.
- **Reset.** `e.reset()` clears readiness (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Indicator, EstimatedLeverageRatio};
use wickra::derivatives::DerivativesTick;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut e = EstimatedLeverageRatio::new();
    let tick = DerivativesTick::new(0.0001, 100.0, 100.0, 100.0, 1_000.0, 400.0, 600.0, 0.0, 0.0, 0.0, 0.0, 0)?;
    println!("{:?}", e.update(tick)); // Some(1.0)
    Ok(())
}
```

Output:

```
Some(1.0)
```

### Python

```python
import wickra as ta

e = ta.EstimatedLeverageRatio()
print(e.update(0.0001, 100, 100, 100, 1000, 400, 600, 0, 0, 0, 0))  # 1.0
```

### Node

```javascript
const ta = require('wickra');
const e = new ta.EstimatedLeverageRatio();
console.log(e.update(0.0001, 100, 100, 100, 1000, 400, 600, 0, 0, 0, 0)); // 1
```

### Streaming

```rust
use wickra::{Indicator, EstimatedLeverageRatio};
use wickra::derivatives::DerivativesTick;

let mut e = EstimatedLeverageRatio::new();
for tick in deriv_feed {
    if let Some(elr) = e.update(tick) {
        // elr spiking -> crowded leverage, cascade risk
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Liquidation risk.** ELR peaks often precede deleveraging events; pair with
   funding and liquidations for a squeeze map.
2. **Trend conviction.** A grinding ELR rise alongside price can mark a leveraged,
   reflexive advance prone to violent unwinds.
3. **Regime.** Sustained low ELR is a calmer, less reflexive market.

## Common pitfalls

- **Proxy base.** This uses the tick's size fields as the position base; if your
  feed reports account *counts* rather than notional, interpret ELR accordingly.
- **Not OI/MarketCap.** The canonical ELR divides OI by exchange reserves or market
  cap; substitute that base if you have it.
- **Cross-venue.** OI definitions differ across exchanges; do not compare raw ELR
  across venues.

## References

The estimated leverage ratio is popularised by on-chain analytics (e.g. CryptoQuant)
as `open interest / reserves`.

## See also

- [Indicator-OiToVolumeRatio](/Indicators/Indicator-OiToVolumeRatio) — OI vs. turnover.
- [Indicator-OpenInterestMomentum](/Indicators/Indicator-OpenInterestMomentum) — OI rate of change.
- [Indicator-LiquidationFeatures](/Indicators/Indicator-LiquidationFeatures) — liquidation flow.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
