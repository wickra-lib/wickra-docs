# Microprice

> A size-weighted fair value that tilts the mid toward the side more
> likely to be hit. The standard high-frequency "true price" estimate.

## Quick reference

| Item                | Value                                                          |
|---------------------|----------------------------------------------------------------|
| Family              | Microstructure                                                 |
| Input type          | `OrderBook` — sorted bid/ask depth snapshot                    |
| Output type         | `f64` (price)                                                  |
| Output range        | between best bid and best ask                                  |
| Default parameters  | none                                                           |
| Warmup period       | `1`                                                            |
| Interpretation      | Imbalance-adjusted fair value                                  |

## Formula

```
microprice = (bidPrice₁ · askSize₁ + askPrice₁ · bidSize₁) / (bidSize₁ + askSize₁)
```

The opposite-size weighting pulls the price toward the side with *less* size
(the side more likely to be consumed). Total top size zero → the plain mid.
Stateless, O(1). See `crates/wickra-core/src/indicators/microprice.rs`.

## Parameters

None. Construct with `Microprice::new()`.

## Inputs / Outputs

`Indicator<Input = OrderBook, Output = f64>`. Bindings:
`update(bid_px, bid_sz, ask_px, ask_sz)`; Python / Node `batch` over a list of
snapshots → 1-D array. WASM streaming-only.

## Warmup

`warmup_period() == 1`.

## Edge cases

- **Zero top size.** Falls back to the mid `(bid + ask) / 2`.
- Always lies within the bid-ask spread.

## Examples

### Rust

```rust
use wickra::{Indicator, Level, Microprice, OrderBook};

let book = OrderBook::new(
    vec![Level::new(100.0, 1.0).unwrap()],
    vec![Level::new(101.0, 3.0).unwrap()],
).unwrap();
// (100·3 + 101·1) / (1 + 3) = 100.25 — heavy ask pulls toward the bid.
assert_eq!(Microprice::new().update(book).unwrap(), 100.25);
```

### Python

```python
import wickra as ta
print(ta.Microprice().update([100.0], [1.0], [101.0], [3.0]))  # 100.25
```

### Node

```js
const { Microprice } = require('wickra');
console.log(new Microprice().update([100], [1], [101], [3])); // 100.25
```

## Interpretation

The microprice is the market's size-weighted fair value: when the ask is thin
relative to the bid it sits above the mid, anticipating an up-tick. It is the
standard reference price for high-frequency valuation and PnL marking, and a
better short-horizon predictor of the next trade price than the mid.

## Pitfalls

- It only uses the top level; a deep but lopsided book is not reflected — pair
  with [imbalance](Indicator-OrderBookImbalanceFull) or [DepthSlope](Indicator-DepthSlope).

## See also

- [QuotedSpread](Indicator-QuotedSpread), [OrderBookImbalanceTop1](Indicator-OrderBookImbalanceTop1)
