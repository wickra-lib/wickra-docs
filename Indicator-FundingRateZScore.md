# FundingRateZScore

> The latest funding rate expressed in standard deviations from its rolling
> mean. Makes funding extremes comparable across regimes and assets — a
> contrarian-fade gauge.

## Quick reference

| Item                | Value                                                          |
|---------------------|----------------------------------------------------------------|
| Family              | Derivatives                                                    |
| Input type          | `DerivativesTick` — a perp / futures market tick               |
| Output type         | `f64` (standard deviations)                                    |
| Output range        | unbounded around zero                                          |
| Default parameters  | `window`                                                       |
| Warmup period       | `window`                                                       |
| Interpretation      | Funding extreme / mean-reversion                              |

## Formula

```
zScore = (fundingRate − mean) / population_stddev   over the last `window` ticks
```

Population standard deviation (`window` denominator), maintained in O(1) via
running sum and sum-of-squares. A window with zero dispersion yields `0`. See
`crates/wickra-core/src/indicators/funding_rate_zscore.rs`.

## Parameters

| Name     | Meaning                              | Constraint |
|----------|--------------------------------------|------------|
| `window` | number of ticks in the z-score window | `>= 1`    |

Construct with `FundingRateZScore::new(window)`; `window == 0` is rejected.

## Inputs / Outputs

`Indicator<Input = DerivativesTick, Output = f64>`. The bindings expose only the
field this indicator reads: `update(funding_rate)`. Python / Node `batch` accept
a single `funding_rate` array and return a 1-D array (`NaN` during warmup); WASM
is streaming-only.

## Warmup

`warmup_period() == window`; the first z-score lands on the `window`-th tick.

## Edge cases

- **Flat window.** Zero dispersion (a constant funding series) returns exactly
  `0` rather than dividing by zero.
- **Precision.** The variance uses `E[x²] − E[x]²` with a non-negative clamp;
  compare z-scores with an `1e-9` tolerance, not `1e-12`.

## Examples

### Rust

```rust
use wickra::{DerivativesTick, FundingRateZScore, Indicator};

fn tick(rate: f64) -> DerivativesTick {
    DerivativesTick::new(rate, 100.0, 100.0, 100.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0)
        .unwrap()
}

let mut z = FundingRateZScore::new(2).unwrap();
assert_eq!(z.update(tick(0.001)), None);
assert!((z.update(tick(0.003)).unwrap() - 1.0).abs() < 1e-9);
```

### Python

```python
import wickra as ta

z = ta.FundingRateZScore(2)
print(z.update(0.001))  # None
print(z.update(0.003))  # ~1.0
```

### Node

```js
const { FundingRateZScore } = require('wickra');

const z = new FundingRateZScore(2);
console.log(z.update(0.001)); // null
console.log(z.update(0.003)); // ~1.0
```

## Interpretation

A reading of `+2` means funding is two standard deviations richer than its
recent norm — an unusually crowded long, often faded; `−2` is the mirror.
Because it is unit-free it compares funding stress across assets and time in a
way the raw rate cannot.

## Common pitfalls

- **Population, not sample, stddev.** The denominator is `window`, not
  `window − 1`; small windows read slightly larger than a sample z-score.
- **Regime shifts.** A structural change in the funding level inflates the
  z-score transiently until the window rolls past it.

## See also

- [FundingRate](Indicator-FundingRate) — the raw rate.
- [FundingRateMean](Indicator-FundingRateMean) — its rolling mean.
- [ZScore](Indicator-ZScore) — the price-series equivalent.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
