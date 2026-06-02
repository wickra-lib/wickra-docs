# CalendarSpread

> The dated future's relative premium to the perpetual mark — the roll yield
> between the two contracts a basis trade actually holds.

## Quick reference

| Item                | Value                                                          |
|---------------------|----------------------------------------------------------------|
| Family              | Derivatives                                                    |
| Input type          | `DerivativesTick` — a perp / futures market tick               |
| Output type         | `f64` (fraction; × 10 000 for bps)                            |
| Output range        | unbounded around zero                                          |
| Default parameters  | none                                                           |
| Warmup period       | `1`                                                            |
| Interpretation      | Inter-contract roll yield                                   |

## Formula

```
spread = (futuresPrice − markPrice) / markPrice
```

A calendar (inter-delivery) spread trades the near leg against the far leg —
here the perpetual against a dated future. Stateless and O(1). See
`crates/wickra-core/src/indicators/calendar_spread.rs`.

## Parameters

None. Construct with `CalendarSpread::new()`.

## Inputs / Outputs

`Indicator<Input = DerivativesTick, Output = f64>`. The bindings expose the two
fields this indicator reads: `update(futures_price, mark_price)`. Python / Node
`batch` accept two equal-length arrays `(futures_price, mark_price)` and return a
1-D array of fractions; WASM is streaming-only.

## Warmup

`warmup_period() == 1`; emits on the first tick.

## Edge cases

- **Flat.** A future trading at the perpetual mark reads `0`.
- **Mark validity.** The mark price is finite and strictly positive by
  construction, so the denominator is always defined.

## Examples

### Rust

```rust
use wickra::{CalendarSpread, DerivativesTick, Indicator};

let mut cs = CalendarSpread::new();
let tick = DerivativesTick::new(
    0.0, 100.0, 100.0, 101.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0,
)
.unwrap();
assert!((cs.update(tick).unwrap() - 0.01).abs() < 1e-12);
```

### Python

```python
import wickra as ta

cs = ta.CalendarSpread()
print(cs.update(101.0, 100.0))  # 0.01
```

### Node

```js
const { CalendarSpread } = require('wickra');

const cs = new CalendarSpread();
console.log(cs.update(101.0, 100.0)); // 0.01
```

## Interpretation

Positive when the dated future trades over the perpetual (contango roll),
negative when under (backwardation). Where [TermStructureBasis](Indicator-TermStructureBasis)
measures the future against spot, this measures it against the perpetual — the
exact leg a perp-vs-future basis trade carries, so its sign and size are the
roll yield that trade earns or pays.

## Common pitfalls

- **Reference is the perp, not spot.** Use [TermStructureBasis](Indicator-TermStructureBasis)
  if you want the future's premium to the spot index instead.
- **Fraction, not bps.** Multiply by `10 000` for a basis-point reading.

## See also

- [TermStructureBasis](Indicator-TermStructureBasis) — dated future vs spot.
- [FundingBasis](Indicator-FundingBasis) — perpetual vs spot.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
