# PerpetualPremiumIndex

> The perpetual's mark price relative to spot — positive means the perp trades at a
> premium (net long demand), negative a discount.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Derivatives |
| Input type | `DerivativesTick` (mark / index price) |
| Output type | `f64` |
| Output range | centred on `0` (fraction) |
| Default parameters | None (parameter-free) |
| Warmup period | `1` |
| Interpretation | `> 0` premium (bullish positioning); `< 0` discount. |

## Formula

```
premium = (mark_price − index_price) / index_price
```

A perpetual is pegged to spot by funding but can trade above (premium) or below
(discount). A positive premium signals net long demand paying up to hold the perp —
the proximate driver of positive funding; a negative premium the reverse. Source:
`crates/wickra-core/src/indicators/perpetual_premium_index.rs`.

## Parameters

| Name | Type | Default | Valid range | Source | Description |
|------|------|---------|-------------|--------|-------------|
| — | — | — | — | None. | Parameter-free; `PerpetualPremiumIndex::new()` is infallible. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/perpetual_premium_index.rs`:

```rust
use wickra::{Indicator, PerpetualPremiumIndex};
use wickra::derivatives::DerivativesTick;
// PerpetualPremiumIndex: Input = DerivativesTick, Output = f64
const _: fn(&mut PerpetualPremiumIndex, DerivativesTick) -> Option<f64> =
    <PerpetualPremiumIndex as Indicator>::update;
```

A `DerivativesTick` in, an `Option<f64>` out. Python/Node take the full tick field
order; only `mark_price` and `index_price` are used. `index_price` is validated
strictly positive, so the division is always defined.

## Warmup

`warmup_period() == 1`. Each tick yields one value (`ready_after_first_update` pins
this).

## Edge cases

- **Premium.** Mark above index → positive (`premium_reference_value` pins `+1%`).
- **Discount.** Mark below index → negative (`discount_is_negative` pins this).
- **At par → 0.** Equal mark and index → `0` (`at_par_is_zero` pins this).
- **Finiteness.** `DerivativesTick::new` rejects non-finite/non-positive prices, so
  no in-method guard is needed.
- **Reset.** `p.reset()` clears readiness (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Indicator, PerpetualPremiumIndex};
use wickra::derivatives::DerivativesTick;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut p = PerpetualPremiumIndex::new();
    let tick = DerivativesTick::new(0.0, 101.0, 100.0, 101.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0)?;
    println!("{:?}", p.update(tick)); // Some(0.01)
    Ok(())
}
```

Output:

```
Some(0.01)
```

### Python

```python
import wickra as ta
p = ta.PerpetualPremiumIndex()
print(p.update(0, 101, 100, 101, 0, 0, 0, 0, 0, 0, 0))  # 0.01
```

### Node

```javascript
const ta = require('wickra');
const p = new ta.PerpetualPremiumIndex();
console.log(p.update(0, 101, 100, 101, 0, 0, 0, 0, 0, 0, 0)); // 0.01
```

### Streaming

```rust
use wickra::{Indicator, PerpetualPremiumIndex};
use wickra::derivatives::DerivativesTick;

let mut p = PerpetualPremiumIndex::new();
for tick in deriv_feed {
    if let Some(premium) = p.update(tick) {
        // premium >> 0 -> crowded longs, funding pressure building
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Positioning gauge.** A persistent premium marks crowded longs (and rising
   funding); a discount marks crowded shorts.
2. **Mean reversion.** Extreme premiums often unwind as funding bleeds longs out —
   a contrarian timing input.
3. **Basis link.** Combine with [`FundingBasis`](/Indicators/Indicator-FundingBasis)
   and futures basis for a full term-structure view.

## Common pitfalls

- **Mark vs. last.** Use the *mark* price (fair value), not the last trade, to avoid
  noise.
- **Index quality.** A stale or thin index price distorts the premium.
- **Fraction, not percent.** Multiply by `100` for a percentage.

## References

Perpetual swap mechanics: see the BitMEX/Binance perpetual contract specifications;
basis and premium analysis in Hull, J. (2018), *Options, Futures, and Other
Derivatives*.

## See also

- [Indicator-FundingBasis](/Indicators/Indicator-FundingBasis) — funding-implied basis.
- [Indicator-FundingImpliedApr](/Indicators/Indicator-FundingImpliedApr) — annualised funding.
- [Indicator-TermStructureBasis](/Indicators/Indicator-TermStructureBasis) — futures basis.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
