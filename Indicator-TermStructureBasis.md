# TermStructureBasis

> The dated future's relative premium to the spot index — the term-structure
> carry a calendar or cash-and-carry trade harvests as the contract converges
> at expiry.

## Quick reference

| Item                | Value                                                          |
|---------------------|----------------------------------------------------------------|
| Family              | Derivatives                                                    |
| Input type          | `DerivativesTick` — a perp / futures market tick               |
| Output type         | `f64` (fraction; × 10 000 for bps)                            |
| Output range        | unbounded around zero                                          |
| Default parameters  | none                                                           |
| Warmup period       | `1`                                                            |
| Interpretation      | Contango / backwardation carry                              |

## Formula

```
basis = (futuresPrice − indexPrice) / indexPrice
```

Where [FundingBasis](Indicator-FundingBasis) measures the *perpetual*'s premium
to spot, this measures a *dated future*'s. Stateless and O(1). See
`crates/wickra-core/src/indicators/term_structure_basis.rs`.

## Parameters

None. Construct with `TermStructureBasis::new()`.

## Inputs / Outputs

`Indicator<Input = DerivativesTick, Output = f64>`. The bindings expose the two
fields this indicator reads: `update(futures_price, index_price)`. Python / Node
`batch` accept two equal-length arrays `(futures_price, index_price)` and return
a 1-D array of fractions; WASM is streaming-only.

## Warmup

`warmup_period() == 1`; emits on the first tick.

## Edge cases

- **At par.** A future trading at spot reads `0`.
- **Index validity.** The index price must be finite and strictly positive; the
  `DerivativesTick` constructor and the bindings reject a non-positive index.

## Examples

### Rust

```rust
use wickra::{DerivativesTick, Indicator, TermStructureBasis};

let mut ts = TermStructureBasis::new();
let tick = DerivativesTick::new(
    0.0, 100.0, 100.0, 102.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0,
)
.unwrap();
assert!((ts.update(tick).unwrap() - 0.02).abs() < 1e-12); // 2% contango
```

### Python

```python
import wickra as ta

ts = ta.TermStructureBasis()
print(ts.update(102.0, 100.0))  # 0.02
```

### Node

```js
const { TermStructureBasis } = require('wickra');

const ts = new TermStructureBasis();
console.log(ts.update(102.0, 100.0)); // 0.02
```

## Interpretation

A positive basis is contango (the future trades over spot), a negative one
backwardation. The basis is the carry a calendar / cash-and-carry trade captures
as the contract pulls to spot at expiry; its magnitude, annualised by
time-to-expiry, is the implied roll yield.

## Common pitfalls

- **Not annualised.** This is the raw spot basis; divide by time-to-expiry to
  compare carries across tenors.
- **Future vs perp.** This uses the dated `futures_price`. For the perpetual's
  basis use [FundingBasis](Indicator-FundingBasis); for future-vs-perp use
  [CalendarSpread](Indicator-CalendarSpread).

## See also

- [FundingBasis](Indicator-FundingBasis) — perpetual vs spot.
- [CalendarSpread](Indicator-CalendarSpread) — dated future vs perpetual.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
