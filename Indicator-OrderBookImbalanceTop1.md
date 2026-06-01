# OrderBookImbalanceTop1

> Signed depth pressure at the touch: how lopsided the best bid and
> best ask sizes are. `+1` all bid, `−1` all ask, `0` balanced.

## Quick reference

| Item                | Value                                                          |
|---------------------|----------------------------------------------------------------|
| Family              | Microstructure                                                 |
| Input type          | `OrderBook` — sorted bid/ask depth snapshot                    |
| Output type         | `f64`                                                          |
| Output range        | `[−1, +1]`                                                     |
| Default parameters  | none                                                           |
| Warmup period       | `1`                                                            |
| Interpretation      | Top-of-book pressure                                           |

## Formula

```
obi = (bidSize₁ − askSize₁) / (bidSize₁ + askSize₁)
```

Uses only the best level on each side. Both sizes zero → `0`. Stateless, O(1).
See `crates/wickra-core/src/indicators/ob_imbalance_top1.rs`.

## Parameters

None. Construct with `OrderBookImbalanceTop1::new()`.

## Inputs / Outputs

`Indicator<Input = OrderBook, Output = f64>`. Bindings take a snapshot as four
arrays: `update(bid_px, bid_sz, ask_px, ask_sz)` (bids descending, asks
ascending). Python / Node `batch` take a list of such snapshots → 1-D array.
WASM streaming-only.

## Warmup

`warmup_period() == 1`.

## Edge cases

- **Empty / zero top level.** Returns `0` when both top sizes are zero.
- **Bounded.** Always in `[−1, +1]`.

## Examples

### Rust

```rust
use wickra::{Indicator, Level, OrderBook, OrderBookImbalanceTop1};

let book = OrderBook::new(
    vec![Level::new(100.0, 3.0).unwrap()],
    vec![Level::new(101.0, 1.0).unwrap()],
).unwrap();
// (3 − 1) / (3 + 1) = 0.5
assert_eq!(OrderBookImbalanceTop1::new().update(book).unwrap(), 0.5);
```

### Python

```python
import wickra as ta
print(ta.OrderBookImbalanceTop1().update([100.0], [3.0], [101.0], [1.0]))  # 0.5
```

### Node

```js
const { OrderBookImbalanceTop1 } = require('wickra');
console.log(new OrderBookImbalanceTop1().update([100], [3], [101], [1])); // 0.5
```

## Interpretation

A positive reading means more size rests on the bid than the ask at the touch —
short-horizon upward pressure; negative is the reverse. It is one of the
strongest high-frequency predictors of the next mid move.

## Pitfalls

- Top-of-book size is easily spoofed; confirm with depth ([TopN](Indicator-OrderBookImbalanceTopN) /
  [Full](Indicator-OrderBookImbalanceFull)) or flow.

## See also

- [OrderBookImbalanceTopN](Indicator-OrderBookImbalanceTopN), [OrderBookImbalanceFull](Indicator-OrderBookImbalanceFull)
- [Microprice](Indicator-Microprice) — turns the same imbalance into a fair value.
