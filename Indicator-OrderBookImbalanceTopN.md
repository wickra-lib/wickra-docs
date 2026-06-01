# OrderBookImbalanceTopN

> Signed depth pressure over the top `levels` of each side — the same
> imbalance as Top-1, but aggregated across the visible near book.

## Quick reference

| Item                | Value                                                          |
|---------------------|----------------------------------------------------------------|
| Family              | Microstructure                                                 |
| Input type          | `OrderBook` — sorted bid/ask depth snapshot                    |
| Output type         | `f64`                                                          |
| Output range        | `[−1, +1]`                                                     |
| Default parameters  | `levels` required (`≥ 1`)                                      |
| Warmup period       | `1`                                                            |
| Interpretation      | Near-book pressure                                             |

## Formula

```
bidDepth = Σ size over the top min(levels, depth) bids
askDepth = Σ size over the top min(levels, depth) asks
obi      = (bidDepth − askDepth) / (bidDepth + askDepth)
```

Both depths zero → `0`. Stateless, O(levels). See
`crates/wickra-core/src/indicators/ob_imbalance_topn.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `levels` | `usize` | none    | `≥ 1`      | Number of levels per side to sum (clamped to available depth). |

## Inputs / Outputs

`Indicator<Input = OrderBook, Output = f64>`. Bindings:
`update(bid_px, bid_sz, ask_px, ask_sz)`; Python / Node `batch` over a list of
snapshots → 1-D array. WASM streaming-only.

## Warmup

`warmup_period() == 1`.

## Edge cases

- **Fewer than `levels` posted.** Uses `min(levels, depth)` — no padding.
- **Bounded** in `[−1, +1]`; zero total depth → `0`.

## Examples

### Rust

```rust
use wickra::{Indicator, Level, OrderBook, OrderBookImbalanceTopN};

let book = OrderBook::new(
    vec![Level::new(100.0, 2.0).unwrap(), Level::new(99.0, 1.0).unwrap()],
    vec![Level::new(101.0, 1.0).unwrap(), Level::new(102.0, 1.0).unwrap()],
).unwrap();
// bidDepth 3, askDepth 2 -> (3 − 2) / 5 = 0.2
assert!((OrderBookImbalanceTopN::new(2).unwrap().update(book).unwrap() - 0.2).abs() < 1e-12);
```

### Python

```python
import wickra as ta
ti = ta.OrderBookImbalanceTopN(2)
print(ti.update([100.0, 99.0], [2.0, 1.0], [101.0, 102.0], [1.0, 1.0]))  # 0.2
```

### Node

```js
const { OrderBookImbalanceTopN } = require('wickra');
console.log(new OrderBookImbalanceTopN(2).update([100, 99], [2, 1], [101, 102], [1, 1])); // 0.2
```

## Interpretation

Summing several levels is more robust to single-level spoofing than
[Top-1](Indicator-OrderBookImbalanceTop1) while staying more responsive than
the [Full](Indicator-OrderBookImbalanceFull) book. Choose `levels` to match the
depth that actually trades on your venue.

## Pitfalls

- Larger `levels` dilutes the signal with deep, rarely-hit liquidity.

## See also

- [OrderBookImbalanceTop1](Indicator-OrderBookImbalanceTop1), [OrderBookImbalanceFull](Indicator-OrderBookImbalanceFull)
- [DepthSlope](Indicator-DepthSlope) — the shape, not just the imbalance, of depth.
