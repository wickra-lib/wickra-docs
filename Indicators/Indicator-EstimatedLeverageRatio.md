# EstimatedLeverageRatio

> A derivatives exchange's open interest divided by its coin reserve —
> CryptoQuant's measure of how much leverage traders use on average.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Derivatives |
| Input type | `(f64, f64)` — `(open_interest, exchange_reserve)` pair |
| Output type | `f64` |
| Output range | `[0, ∞)` |
| Default parameters | None (parameter-free) |
| Warmup period | `1` |
| Interpretation | High/rising = crowded leverage; falling = deleveraging. |

## Formula

```
ELR = open_interest / exchange_reserve      (0 when exchange_reserve <= 0)
```

The estimated leverage ratio compares the open interest of an exchange's
derivatives to the amount of the coin the exchange holds in reserve, both in the
same unit. A rising ELR means a given reserve backs more outstanding contracts —
traders are taking on more leverage and the market is more fragile to
liquidation cascades; a falling ELR marks deleveraging. Source:
`crates/wickra-core/src/indicators/estimated_leverage_ratio.rs`.

## Parameters

| Name | Type | Default | Valid range | Source | Description |
|------|------|---------|-------------|--------|-------------|
| — | — | — | — | None. | ELR is parameter-free; `EstimatedLeverageRatio::new()` is infallible. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/estimated_leverage_ratio.rs`:

```rust
use wickra::{Indicator, EstimatedLeverageRatio};
// EstimatedLeverageRatio: Input = (f64, f64), Output = f64
const _: fn(&mut EstimatedLeverageRatio, (f64, f64)) -> Option<f64> =
    <EstimatedLeverageRatio as Indicator>::update;
```

An `(open_interest, exchange_reserve)` pair in, an `Option<f64>` out. ELR is a
two-series indicator (it stays in the Derivatives family but no longer consumes a
`DerivativesTick`).

- **Python.** `update(open_interest, exchange_reserve)` → `float | None`;
  `batch(open_interest, exchange_reserve)` → `array.array('d')` (`NaN` where an
  input is non-finite; the two series must have equal length).
- **Node / WASM.** `update(openInterest, exchangeReserve)` → `number | null`;
  `batch(openInterest, exchangeReserve)` → `number[]` (WASM: `Float64Array`).
- **C ABI.** `wickra_estimated_leverage_ratio_update(handle, x, y)` with
  `x = open_interest`, `y = exchange_reserve`; returns `NaN` for no value.

**Breaking change:** earlier releases took a `DerivativesTick` and divided open
interest by `long_size + short_size`; that input shape is gone.

## Warmup

`warmup_period() == 1`. The indicator is stateless — each finite pair yields one
value (`ready_after_first_update` pins this).

## Edge cases

- **Reference value.** `1000 / 4000 = 0.25` (`ratio_reference_value` pins this).
- **OI raises it.** Higher open interest on the same reserve raises the ratio
  (`higher_oi_raises_ratio` pins this).
- **Zero reserve → 0.** A non-positive reserve returns `0` rather than dividing by
  zero (`zero_reserve_is_zero` pins this).
- **Non-finite input → `None`.** A `NaN` or infinite open interest or reserve
  returns `None` and does not mark the indicator ready
  (`non_finite_input_returns_none`).
- **Reset.** `e.reset()` clears readiness (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Indicator, EstimatedLeverageRatio};

fn main() {
    let mut e = EstimatedLeverageRatio::new();
    // Open interest 25,000 coins against a 100,000-coin reserve.
    println!("{:?}", e.update((25_000.0, 100_000.0))); // Some(0.25)
    println!("{:?}", e.update((1_000.0, 0.0)));        // Some(0.0) — zero reserve
}
```

Output:

```
Some(0.25)
Some(0.0)
```

### Python

```python
import wickra as ta

e = ta.EstimatedLeverageRatio()
print(e.update(25000, 100000))  # open_interest, exchange_reserve -> 0.25
print(list(e.batch([1000, 2000, 3000], [4000, 4000, 0])))  # [0.25, 0.5, 0.0]
```

### Node

```javascript
const ta = require('wickra');
const e = new ta.EstimatedLeverageRatio();
console.log(e.update(25000, 100000)); // 0.25 (openInterest, exchangeReserve)
```

### Streaming

```rust
use wickra::{Indicator, EstimatedLeverageRatio};

let mut e = EstimatedLeverageRatio::new();
let feed: Vec<(f64, f64)> = Vec::new(); // your live (open_interest, exchange_reserve) stream
for pair in feed {
    if let Some(elr) = e.update(pair) {
        // elr spiking -> crowded leverage, cascade risk
    }
}
```

Streaming `update` and `batch` are equivalent pair-for-pair
(`batch_equals_streaming` pins this).

## Interpretation

1. **Liquidation risk.** ELR peaks often precede deleveraging events; pair with
   funding and liquidations for a squeeze map.
2. **Trend conviction.** A grinding ELR rise alongside price can mark a leveraged,
   reflexive advance prone to violent unwinds.
3. **Regime.** Sustained low ELR is a calmer, less reflexive market.

## Common pitfalls

- **Unit mismatch.** Open interest and reserve must be in the same unit (e.g. both
  in coins); dividing USD open interest by a coin reserve gives a meaningless
  scale.
- **Old tick input.** Code written for the earlier `DerivativesTick` /
  `(oi, long_size, short_size)` signature must be migrated to the
  `(open_interest, exchange_reserve)` pair.
- **Cross-venue.** OI definitions differ across exchanges; do not compare raw ELR
  across venues.

## References

- CryptoQuant, *Estimated Leverage Ratio* — defined as an exchange's open interest
  divided by its coin reserve.

## See also

- [Indicator-OiToVolumeRatio](/Indicators/Indicator-OiToVolumeRatio) — OI vs. turnover.
- [Indicator-OpenInterestMomentum](/Indicators/Indicator-OpenInterestMomentum) — OI rate of change.
- [Indicator-LiquidationFeatures](/Indicators/Indicator-LiquidationFeatures) — liquidation flow.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
