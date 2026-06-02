# OIPriceDivergence

> The gap between how fast open interest and the mark price have moved over a
> window — the classic positioning-vs-price divergence signal.

## Quick reference

| Item                | Value                                                          |
|---------------------|----------------------------------------------------------------|
| Family              | Derivatives                                                    |
| Input type          | `DerivativesTick` — a perp / futures market tick               |
| Output type         | `f64` (difference of fractions)                               |
| Output range        | unbounded around zero                                          |
| Default parameters  | `window`                                                       |
| Warmup period       | `window + 1`                                                   |
| Interpretation      | Buildup vs unwind / squeeze                                  |

## Formula

```
oiChange    = (openInterestₜ − openInterestₜ₋ₙ) / openInterestₜ₋ₙ
priceChange = (markPriceₜ    − markPriceₜ₋ₙ)    / markPriceₜ₋ₙ
divergence  = oiChange − priceChange                          (n = window)
```

Maintained in O(1) via a `window + 1` ring buffer of `(oi, mark)`. If the
reference open interest is zero, the OI term contributes zero. See
`crates/wickra-core/src/indicators/oi_price_divergence.rs`.

## Parameters

| Name     | Meaning                          | Constraint |
|----------|----------------------------------|------------|
| `window` | lookback in ticks for both rates | `>= 1`     |

Construct with `OIPriceDivergence::new(window)`; `window == 0` is rejected.

## Inputs / Outputs

`Indicator<Input = DerivativesTick, Output = f64>`. The bindings expose the two
fields this indicator reads: `update(open_interest, mark_price)`. Python / Node
`batch` accept two equal-length arrays `(open_interest, mark_price)` and return a
1-D array (`NaN` during warmup); WASM is streaming-only.

## Warmup

`warmup_period() == window + 1`; the first value lands once the buffer spans a
full `window`-tick lookback.

## Edge cases

- **Zero reference OI.** With no base to grow from, the OI term is `0` and only
  the price term contributes.
- **Mark validity.** The mark price is finite and strictly positive by
  construction, so the price denominator is always defined.

## Examples

### Rust

```rust
use wickra::{DerivativesTick, Indicator, OIPriceDivergence};

fn tick(oi: f64, mark: f64) -> DerivativesTick {
    DerivativesTick::new(0.0, mark, mark, mark, oi, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0)
        .unwrap()
}

let mut div = OIPriceDivergence::new(1).unwrap();
assert_eq!(div.update(tick(1_000.0, 100.0)), None);
assert!((div.update(tick(1_100.0, 100.0)).unwrap() - 0.1).abs() < 1e-12);
```

### Python

```python
import wickra as ta

div = ta.OIPriceDivergence(1)
print(div.update(1000.0, 100.0))  # None
print(div.update(1100.0, 100.0))  # 0.1
```

### Node

```js
const { OIPriceDivergence } = require('wickra');

const div = new OIPriceDivergence(1);
console.log(div.update(1000, 100)); // null
console.log(div.update(1100, 100)); // 0.1
```

## Interpretation

- **Positive.** Open interest grew faster than price rose (or grew while price
  fell) — fresh positioning building against the move, a classic short-buildup
  / accumulation read.
- **Negative.** Price outran open interest — a move on thinning positioning, the
  signature of a squeeze or unwind.
- **Near zero.** OI and price moved in step; the trend is being funded by new
  money in proportion.

## Common pitfalls

- **Window counts ticks.** Size `window` against your sampling cadence for a
  meaningful wall-clock lookback.
- **Difference of fractions.** The output mixes two percentage changes; read its
  sign and magnitude relatively, not as a single rate.

## See also

- [OpenInterestDelta](Indicator-OpenInterestDelta) — the raw OI change.
- [OIWeighted](Indicator-OIWeighted) — OI-weighted fair price.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
