# FundingImpliedApr

> The per-interval funding rate annualised — the carry cost (or yield) of holding a
> perpetual position for a year.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Derivatives |
| Input type | `DerivativesTick` (funding rate) |
| Output type | `f64` |
| Output range | signed fraction (×100 for %) |
| Default parameters | `(intervals_per_year = 1095)` (8h funding) |
| Warmup period | `1` |
| Interpretation | High positive = longs pay steep carry; negative = shorts pay. |

## Formula

```
APR = funding_rate · intervals_per_year
```

Funding is paid in small per-interval amounts (commonly every 8 hours → `1095`
intervals/year). Annualising converts the headline funding number into a yearly
carry, comparable with spot lending rates and basis trades. Source:
`crates/wickra-core/src/indicators/funding_implied_apr.rs`.

## Parameters

| Name                 | Type  | Default | Valid range | Source | Description |
|----------------------|-------|---------|-------------|--------|-------------|
| `intervals_per_year` | `f64` | `1095`  | `> 0`, finite | `funding_implied_apr.rs:46` | Funding intervals per year (`1095` for 8h, `365` for daily). Non-positive errors with `Error::InvalidParameter`. |

The `intervals_per_year` getter returns the scaling.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/funding_implied_apr.rs`:

```rust
use wickra::{Indicator, FundingImpliedApr};
use wickra::DerivativesTick;
// FundingImpliedApr: Input = DerivativesTick, Output = f64
const _: fn(&mut FundingImpliedApr, DerivativesTick) -> Option<f64> =
    <FundingImpliedApr as Indicator>::update;
```

A `DerivativesTick` in, an `Option<f64>` out. Python/Node take the full tick field
order; only `funding_rate` is used.

## Warmup

`warmup_period() == 1`. Each tick yields one value (`apr_reference_value` exercises
the first emission).

## Edge cases

- **Reference value.** `0.0001 · 1095 ≈ 0.1095` (`apr_reference_value` pins this).
- **Negative funding.** A negative rate gives a negative APR
  (`negative_funding_is_negative_apr` pins this).
- **Zero funding → 0.** (`zero_funding_is_zero` pins this).
- **Finiteness.** `DerivativesTick::new` rejects a non-finite funding rate, so no
  in-method guard is needed.
- **Reset.** `f.reset()` clears readiness (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Indicator, FundingImpliedApr};
use wickra::DerivativesTick;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut f = FundingImpliedApr::new(1095.0)?;
    let tick = DerivativesTick::new(0.0001, 100.0, 100.0, 100.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0)?;
    println!("{:.4}", f.update(tick).unwrap()); // 0.1095
    Ok(())
}
```

Output:

```
0.1095
```

### Python

```python
import wickra as ta
f = ta.FundingImpliedApr(1095.0)
print(f.update(0.0001, 100, 100, 100, 0, 0, 0, 0, 0, 0, 0))  # 0.1095
```

### Node

```javascript
const ta = require('wickra');
const f = new ta.FundingImpliedApr(1095.0);
console.log(f.update(0.0001, 100, 100, 100, 0, 0, 0, 0, 0, 0, 0)); // 0.1095
```

### Streaming

```rust
use wickra::{Indicator, FundingImpliedApr};
use wickra::DerivativesTick;

let mut f = FundingImpliedApr::new(1095.0).unwrap();
let deriv_feed: Vec<DerivativesTick> = Vec::new(); // your live stream
for tick in deriv_feed {
    if let Some(apr) = f.update(tick) {
        // apr vs spot lending -> cash-and-carry edge
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Carry trade.** A high positive APR rewards a short-perp / long-spot
   cash-and-carry; negative rewards the reverse.
2. **Positioning extreme.** Spiking APR marks crowded longs (or shorts) and an
   incentive to fade.
3. **Comparison.** Annualising lets you stack funding against any other yield on a
   like-for-like basis.

## Common pitfalls

- **Interval mismatch.** Set `intervals_per_year` to your venue's funding cadence
  (8h ≠ daily).
- **Snapshot, not realised.** This annualises the *current* rate; realised carry
  averages over time.
- **Fraction, not percent.** Multiply by `100` for a percentage APR.

## References

Perpetual funding mechanics; carry/basis analysis in Hull, J. (2018), *Options,
Futures, and Other Derivatives*.

## See also

- [Indicator-FundingRate](/Indicators/Indicator-FundingRate) — the raw funding rate.
- [Indicator-FundingRateMean](/Indicators/Indicator-FundingRateMean) — smoothed funding.
- [Indicator-PerpetualPremiumIndex](/Indicators/Indicator-PerpetualPremiumIndex) — perp premium to spot.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
