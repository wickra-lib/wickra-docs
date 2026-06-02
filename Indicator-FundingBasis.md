# FundingBasis

> The perpetual mark's relative premium to the spot index — the spread the
> funding mechanism continuously pulls toward zero.

## Quick reference

| Item                | Value                                                          |
|---------------------|----------------------------------------------------------------|
| Family              | Derivatives                                                    |
| Input type          | `DerivativesTick` — a perp / futures market tick               |
| Output type         | `f64` (fraction; × 10 000 for bps)                            |
| Output range        | unbounded around zero                                          |
| Default parameters  | none                                                           |
| Warmup period       | `1`                                                            |
| Interpretation      | Perp-vs-spot carry                                            |

## Formula

```
basis = (markPrice − indexPrice) / indexPrice
```

A positive basis (perpetual above spot) accompanies positive funding; a negative
basis a discount. Stateless and O(1). See
`crates/wickra-core/src/indicators/funding_basis.rs`.

## Parameters

None. Construct with `FundingBasis::new()`.

## Inputs / Outputs

`Indicator<Input = DerivativesTick, Output = f64>`. The bindings expose the two
fields this indicator reads: `update(mark_price, index_price)`. Python / Node
`batch` accept two equal-length arrays `(mark_price, index_price)` and return a
1-D array of fractions; WASM is streaming-only.

## Warmup

`warmup_period() == 1`; emits on the first tick.

## Edge cases

- **At par.** Mark equal to index reads exactly `0`.
- **Index validity.** The index price must be finite and strictly positive; the
  `DerivativesTick` constructor and the bindings reject a non-positive index.

## Examples

### Rust

```rust
use wickra::{DerivativesTick, FundingBasis, Indicator};

let mut fb = FundingBasis::new();
let tick = DerivativesTick::new(
    0.0, 100.5, 100.0, 100.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0,
)
.unwrap();
assert!((fb.update(tick).unwrap() - 0.005).abs() < 1e-12); // 50 bps
```

### Python

```python
import wickra as ta

fb = ta.FundingBasis()
print(fb.update(100.5, 100.0))  # 0.005
```

### Node

```js
const { FundingBasis } = require('wickra');

const fb = new FundingBasis();
console.log(fb.update(100.5, 100.0)); // 0.005
```

## Interpretation

The basis is what funding is chasing: when the perpetual trades over spot the
basis is positive and funding turns positive to drag it back. Reading the
instantaneous basis alongside [FundingRate](Indicator-FundingRate) separates a
real premium from a stale-funding artefact and sizes the carry available to a
cash-and-carry trade. Multiply by `10 000` for basis points.

## Common pitfalls

- **Fraction, not bps.** The output is a fraction; scale it yourself for a bps
  reading.
- **Perp vs dated future.** This is the *perpetual*'s basis. For a dated
  future's basis use [TermStructureBasis](Indicator-TermStructureBasis).

## See also

- [TermStructureBasis](Indicator-TermStructureBasis) — dated future vs spot.
- [CalendarSpread](Indicator-CalendarSpread) — dated future vs perpetual.
- [FundingRate](Indicator-FundingRate) — the rate the basis drives.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
