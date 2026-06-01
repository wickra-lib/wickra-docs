# OrderBookImbalanceFull

> Signed depth pressure over the entire posted book — the imbalance of
> total bid versus total ask size across every level.

## Quick reference

| Item                | Value                                                          |
|---------------------|----------------------------------------------------------------|
| Family              | Microstructure                                                 |
| Input type          | `OrderBook` — sorted bid/ask depth snapshot                    |
| Output type         | `f64`                                                          |
| Output range        | `[−1, +1]`                                                     |
| Default parameters  | none                                                           |
| Warmup period       | `1`                                                            |
| Interpretation      | Whole-book pressure                                            |

## Formula

```
bidDepth = Σ size over all bids
askDepth = Σ size over all asks
obi      = (bidDepth − askDepth) / (bidDepth + askDepth)
```

Both depths zero → `0`. Stateless, O(levels). See
`crates/wickra-core/src/indicators/ob_imbalance_full.rs`.

## Parameters

None. Construct with `OrderBookImbalanceFull::new()`.

## Inputs / Outputs

`Indicator<Input = OrderBook, Output = f64>`. Bindings:
`update(bid_px, bid_sz, ask_px, ask_sz)`; Python / Node `batch` over a list of
snapshots → 1-D array. WASM streaming-only.

## Warmup

`warmup_period() == 1`.

## Edge cases

- **Bounded** in `[−1, +1]`; zero total depth → `0`.
- Sensitivity depends on how deep your feed publishes the book.

## Examples

### Rust

```rust
use wickra::{Indicator, Level, OrderBook, OrderBookImbalanceFull};

let book = OrderBook::new(
    vec![Level::new(100.0, 1.0).unwrap()],
    vec![Level::new(101.0, 2.0).unwrap(), Level::new(102.0, 1.0).unwrap()],
).unwrap();
// bidDepth 1, askDepth 3 -> (1 − 3) / 4 = −0.5
assert_eq!(OrderBookImbalanceFull::new().update(book).unwrap(), -0.5);
```

### Python

```python
import wickra as ta
print(ta.OrderBookImbalanceFull().update([100.0], [1.0], [101.0, 102.0], [2.0, 1.0]))  # -0.5
```

### Node

```js
const { OrderBookImbalanceFull } = require('wickra');
console.log(new OrderBookImbalanceFull().update([100], [1], [101, 102], [2, 1])); // -0.5
```

## Interpretation

The whole-book imbalance captures resting pressure beyond the touch — useful for
slower, position-level bias. It is the noisiest to spoof but also the slowest to
react, since deep liquidity rarely trades.

## Pitfalls

- Feeds that truncate depth make "full" venue-dependent; compare only across
  identical depth settings.

## See also

- [OrderBookImbalanceTop1](Indicator-OrderBookImbalanceTop1), [OrderBookImbalanceTopN](Indicator-OrderBookImbalanceTopN)
- [DepthSlope](Indicator-DepthSlope)
