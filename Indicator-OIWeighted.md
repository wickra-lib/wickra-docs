# OIWeighted

> The running mean mark price, weighting each tick by its open interest — the
> price level the bulk of outstanding positioning sits around.

## Quick reference

| Item                | Value                                                          |
|---------------------|----------------------------------------------------------------|
| Family              | Derivatives                                                    |
| Input type          | `DerivativesTick` — a perp / futures market tick               |
| Output type         | `f64` (price scale)                                           |
| Output range        | unbounded (price scale)                                        |
| Default parameters  | none                                                           |
| Warmup period       | `1`                                                            |
| Interpretation      | Fair-value anchor for positioning                           |

## Formula

```
oiWeighted = Σ(markPrice · openInterest) / Σ openInterest
```

A cumulative open-interest-weighted average, maintained with running sums; O(1).
Until any open interest has accrued it returns the current mark price. Call
`reset()` at session boundaries to re-anchor. See
`crates/wickra-core/src/indicators/oi_weighted.rs`.

## Parameters

None. Construct with `OIWeighted::new()`.

## Inputs / Outputs

`Indicator<Input = DerivativesTick, Output = f64>`. The bindings expose the two
fields this indicator reads: `update(mark_price, open_interest)`. Python / Node
`batch` accept two equal-length arrays `(mark_price, open_interest)` and return a
1-D array; WASM is streaming-only.

## Warmup

`warmup_period() == 1`; emits on the first tick.

## Edge cases

- **Zero open interest.** Before any OI accrues, the fallback is the current mark
  price (no division by zero).
- **Cumulative.** The average runs from construction; `reset()` re-anchors it at
  the next tick.

## Examples

### Rust

```rust
use wickra::{DerivativesTick, Indicator, OIWeighted};

fn tick(mark: f64, oi: f64) -> DerivativesTick {
    DerivativesTick::new(0.0, mark, mark, mark, oi, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0)
        .unwrap()
}

let mut oiw = OIWeighted::new();
assert_eq!(oiw.update(tick(100.0, 10.0)), Some(100.0));
assert_eq!(oiw.update(tick(110.0, 30.0)), Some(107.5));
```

### Python

```python
import wickra as ta

oiw = ta.OIWeighted()
print(oiw.update(100.0, 10.0))  # 100.0
print(oiw.update(110.0, 30.0))  # 107.5
```

### Node

```js
const { OIWeighted } = require('wickra');

const oiw = new OIWeighted();
console.log(oiw.update(100, 10)); // 100
console.log(oiw.update(110, 30)); // 107.5
```

## Interpretation

Where a plain average treats every tick equally, the OI-weighted price pulls
toward the levels at which the most contracts were actually open — a fair-value
anchor for liquidation and mean-reversion analysis. Price trading far above its
OI-weighted level means recent positioning is offside relative to where the
crowd built.

## Common pitfalls

- **Cumulative drift.** Without periodic `reset()` the anchor reflects the whole
  session; re-anchor when you want a recent reading.
- **Argument order.** The binding signature is `(mark_price, open_interest)` —
  price first, weight second.

## See also

- [OpenInterestDelta](Indicator-OpenInterestDelta) — the raw OI change.
- [OIPriceDivergence](Indicator-OIPriceDivergence) — OI vs price moves.
- [Vwap](Indicator-Vwap) — the volume-weighted analogue.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
