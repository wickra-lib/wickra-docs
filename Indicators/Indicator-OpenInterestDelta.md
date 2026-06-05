# OpenInterestDelta

> The tick-over-tick change in open interest — new positioning versus mere
> turnover. The raw input to OI-vs-price divergence analysis.

## Quick reference

| Item                | Value                                                          |
|---------------------|----------------------------------------------------------------|
| Family              | Derivatives                                                    |
| Input type          | `DerivativesTick` — a perp / futures market tick               |
| Output type         | `f64` (contracts / notional)                                  |
| Output range        | unbounded around zero                                          |
| Default parameters  | none                                                           |
| Warmup period       | `2`                                                            |
| Interpretation      | Position building vs unwinding                               |

## Formula

```
delta = openInterestₜ − openInterestₜ₋₁
```

Stateful only in the previous open-interest value; O(1). The first tick seeds
the previous value and returns `None`. See
`crates/wickra-core/src/indicators/oi_delta.rs`.

## Parameters

None. Construct with `OpenInterestDelta::new()`.

## Inputs / Outputs

`Indicator<Input = DerivativesTick, Output = f64>`. The bindings expose only the
field this indicator reads: `update(open_interest)`. Python / Node `batch`
accept a single `open_interest` array and return a 1-D array (`NaN` on the first,
seeding tick); WASM is streaming-only.

## Warmup

`warmup_period() == 2`; the first delta lands on the second tick.

## Edge cases

- **First tick.** Returns `None` — there is no previous value to difference yet.
- **Reset.** After `reset()` the next tick only re-seeds, returning `None`
  again.

## Examples

### Rust

```rust
use wickra::{DerivativesTick, Indicator, OpenInterestDelta};

fn tick(oi: f64) -> DerivativesTick {
    DerivativesTick::new(0.0, 100.0, 100.0, 100.0, oi, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0)
        .unwrap()
}

let mut oid = OpenInterestDelta::new();
assert_eq!(oid.update(tick(1_000.0)), None);
assert_eq!(oid.update(tick(1_250.0)), Some(250.0));
```

### Python

```python
import wickra as ta

oid = ta.OpenInterestDelta()
print(oid.update(1000.0))  # None
print(oid.update(1250.0))  # 250.0
```

### Node

```js
const { OpenInterestDelta } = require('wickra');

const oid = new OpenInterestDelta();
console.log(oid.update(1000)); // null
console.log(oid.update(1250)); // 250
```

## Interpretation

Open interest counts outstanding contracts; its change separates fresh money
from churn. Rising OI alongside a rising price confirms a trend (new longs);
rising OI into a falling price marks fresh shorts; falling OI is an unwind
regardless of direction. Combine the sign of this delta with the price move —
or use [OIPriceDivergence](/Indicators/Indicator-OIPriceDivergence) for the windowed
version.

## Common pitfalls

- **Absolute, not relative.** This is a raw change in contracts. For a
  percentage that compares across instruments, use the relative term inside
  [OIPriceDivergence](/Indicators/Indicator-OIPriceDivergence).
- **Snapshot cadence.** OI is a level sampled per tick; deltas inherit your
  sampling interval.

## See also

- [OIPriceDivergence](/Indicators/Indicator-OIPriceDivergence) — OI change vs price change.
- [OIWeighted](/Indicators/Indicator-OIWeighted) — OI-weighted fair price.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
