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

Whole-book imbalance captures resting pressure across *every* posted level — the
slowest, broadest member of the family.

- **Positive (→ +1).** Total bid depth exceeds total ask depth; a standing
  upward bias that persists across the book, not just the touch.
- **Negative (→ −1).** Total ask depth dominates; downward bias.
- **Slow but hard to fake.** Spoofing the entire book is far costlier than
  flickering one level, so a sustained full-book tilt is more credible — but it
  reacts slowly, since deep liquidity rarely trades. Best for position-level
  bias, not for timing the next tick.

## Common pitfalls

- **"Full" is venue-defined.** Feeds truncate depth differently, so "the whole
  book" means different things across venues and snapshots. Compare only across
  identical depth settings.
- **Deep liquidity is inert.** Size far from the touch may never trade; it can
  dominate the ratio while having little bearing on the next move. For
  execution timing prefer [Top-1](/Indicators/Indicator-OrderBookImbalanceTop1) or
  [TopN](/Indicators/Indicator-OrderBookImbalanceTopN).
- **Iceberg and hidden orders.** The posted book omits hidden size, so the true
  imbalance can differ from what this measures.

## References

- Rama Cont, Arseniy Kukanov, Sasha Stoikov, *The Price Impact of Order Book
  Events*, *Journal of Financial Econometrics*, 2014.
- Jean-Philippe Bouchaud, Julius Bonart, Jonathan Donier, Martin Gould, *Trades,
  Quotes and Prices*, 2018 — limit-order-book dynamics and depth.

## See also

- [OrderBookImbalanceTop1](/Indicators/Indicator-OrderBookImbalanceTop1) — the fastest,
  touch-only version.
- [OrderBookImbalanceTopN](/Indicators/Indicator-OrderBookImbalanceTopN) — the tunable
  middle ground.
- [DepthSlope](/Indicators/Indicator-DepthSlope) — the *shape* of the resting book, not just
  its net imbalance.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
