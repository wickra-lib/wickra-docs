# FundingRateMean

> The rolling mean funding rate over a trailing window of ticks. Smoothing the
> raw rate reveals the persistent carry regime behind the per-interval noise.

## Quick reference

| Item                | Value                                                          |
|---------------------|----------------------------------------------------------------|
| Family              | Derivatives                                                    |
| Input type          | `DerivativesTick` — a perp / futures market tick               |
| Output type         | `f64` (rate per funding interval)                              |
| Output range        | unbounded; may be negative                                     |
| Default parameters  | `window`                                                       |
| Warmup period       | `window`                                                       |
| Interpretation      | Sustained carry regime                                        |

## Formula

```
mean = (1 / window) · Σ fundingRate over the last `window` ticks
```

A simple moving average of the funding field, maintained in O(1) per tick via a
running sum over a `VecDeque`. See
`crates/wickra-core/src/indicators/funding_rate_mean.rs`.

## Parameters

| Name     | Meaning                          | Constraint |
|----------|----------------------------------|------------|
| `window` | number of ticks in the average   | `>= 1`     |

Construct with `FundingRateMean::new(window)`; `window == 0` is rejected.

## Inputs / Outputs

`Indicator<Input = DerivativesTick, Output = f64>`. The bindings expose only the
field this indicator reads: `update(funding_rate)`. Python / Node `batch` accept
a single `funding_rate` array and return a 1-D array (`NaN` during warmup); WASM
is streaming-only.

## Warmup

`warmup_period() == window`; the first mean lands on the `window`-th tick.

## Edge cases

- **Negative funding.** Averages straight through; a negative mean marks a
  sustained discount / crowded-short regime.
- **Window of one.** Degenerates to the raw [FundingRate](/Indicators/Indicator-FundingRate).

## Examples

### Rust

```rust
use wickra::{DerivativesTick, FundingRateMean, Indicator};

fn tick(rate: f64) -> DerivativesTick {
    DerivativesTick::new(rate, 100.0, 100.0, 100.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0)
        .unwrap()
}

let mut frm = FundingRateMean::new(2).unwrap();
assert_eq!(frm.update(tick(0.001)), None);
assert_eq!(frm.update(tick(0.003)), Some(0.002));
```

### Python

```python
import wickra as ta

frm = ta.FundingRateMean(2)
print(frm.update(0.001))  # None
print(frm.update(0.003))  # 0.002
```

### Node

```js
const { FundingRateMean } = require('wickra');

const frm = new FundingRateMean(2);
console.log(frm.update(0.001)); // null
console.log(frm.update(0.003)); // 0.002
```

## Interpretation

The mean strips the per-interval jitter from funding and leaves the regime: a
positive mean is a market that has been paying to be long for a while, a
negative one a market paying to be short. Pair it with the spot
[FundingBasis](/Indicators/Indicator-FundingBasis) to separate a genuine carry from a
stale-funding artefact.

## Common pitfalls

- **Window vs funding interval.** `window` counts ticks, not hours; size it
  against your tick cadence to get a meaningful lookback in wall-clock time.
- **Warmup is `None`.** No output until the window fills — the bindings emit
  `NaN` there.

## See also

- [FundingRate](/Indicators/Indicator-FundingRate) — the raw rate.
- [FundingRateZScore](/Indicators/Indicator-FundingRateZScore) — the normalised extreme.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
