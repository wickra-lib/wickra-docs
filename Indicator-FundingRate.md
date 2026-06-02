# FundingRate

> The current perpetual-swap funding rate, surfaced straight from the
> derivatives feed. The periodic payment that tethers the perpetual to spot —
> positive when longs pay shorts, negative when shorts pay longs.

## Quick reference

| Item                | Value                                                          |
|---------------------|----------------------------------------------------------------|
| Family              | Derivatives                                                    |
| Input type          | `DerivativesTick` — a perp / futures market tick               |
| Output type         | `f64` (rate per funding interval)                              |
| Output range        | unbounded; may be negative                                     |
| Default parameters  | none                                                           |
| Warmup period       | `1`                                                            |
| Interpretation      | Carry / crowd-positioning regime                              |

## Formula

```
fundingRate = tick.funding_rate
```

A passthrough of the funding field carried by each tick — the building block for
the rolling funding statistics. Stateless and O(1). See
`crates/wickra-core/src/indicators/funding_rate.rs`.

## Parameters

None. Construct with `FundingRate::new()`.

## Inputs / Outputs

`Indicator<Input = DerivativesTick, Output = f64>`. The bindings expose only the
field this indicator reads: `update(funding_rate)`. Python / Node `batch` accept
a single `funding_rate` array and return a 1-D array; WASM is streaming-only.

## Warmup

`warmup_period() == 1`; emits on the first tick.

## Edge cases

- **Negative funding.** A negative rate is valid and passed through unchanged —
  shorts are paying longs (the perpetual trades at a discount).
- **Finiteness.** The rate must be finite; the `DerivativesTick` constructor and
  the bindings reject `NaN` / infinity.

## Examples

### Rust

```rust
use wickra::{DerivativesTick, FundingRate, Indicator};

let mut fr = FundingRate::new();
let tick = DerivativesTick::new(
    0.0001, 100.0, 100.0, 100.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0,
)
.unwrap();
assert_eq!(fr.update(tick), Some(0.0001));
```

### Python

```python
import wickra as ta

fr = ta.FundingRate()
print(fr.update(0.0001))  # 0.0001
```

### Node

```js
const { FundingRate } = require('wickra');

const fr = new FundingRate();
console.log(fr.update(0.0001)); // 0.0001
```

## Interpretation

Funding is the perpetual market's tether to spot. A persistently positive rate
means longs are crowded and paying to hold their exposure — fuel for a long
squeeze; a persistently negative rate is the mirror. Read a single print as the
instantaneous carry, and smooth it with [FundingRateMean](Indicator-FundingRateMean)
or normalise it with [FundingRateZScore](Indicator-FundingRateZScore) for a
regime view.

## Common pitfalls

- **Interval, not annualised.** The rate is per funding interval (commonly 8h).
  Annualise it yourself before comparing against a yield.
- **Venue conventions differ.** Funding intervals and clamps vary by exchange;
  feed the rate the venue actually charged.

## See also

- [FundingRateMean](Indicator-FundingRateMean) — its rolling average.
- [FundingRateZScore](Indicator-FundingRateZScore) — its rolling z-score.
- [FundingBasis](Indicator-FundingBasis) — the spot basis funding chases.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
