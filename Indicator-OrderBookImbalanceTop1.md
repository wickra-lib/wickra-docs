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

Top-1 imbalance is the rawest read of pressure at the touch — which side of the
best quote is heavier.

- **Positive (→ +1).** More size rests on the bid than the ask; short-horizon
  upward pressure. Near `+1` the ask is nearly empty and an up-tick is likely.
- **Negative (→ −1).** The ask is heavier; downward pressure.
- **Near zero.** Balanced touch — no directional tilt.

Of the order-book imbalance family this is the most responsive and, empirically,
one of the strongest high-frequency predictors of the *next* mid move — but also
the easiest to manipulate.

## Common pitfalls

- **Spoofable.** A single best-level size can be posted and pulled in
  milliseconds. Confirm with depth
  ([TopN](Indicator-OrderBookImbalanceTopN) /
  [Full](Indicator-OrderBookImbalanceFull)) or executed flow
  ([TradeImbalance](Indicator-TradeImbalance)).
- **Very short horizon.** Its predictive edge decays in seconds; it is a
  high-frequency signal, not a position-level bias.
- **Ignores price, only size.** It says nothing about *where* the quotes sit,
  only their relative size — pair with [QuotedSpread](Indicator-QuotedSpread)
  for the cost dimension.

## References

- Rama Cont, Arseniy Kukanov, Sasha Stoikov, *The Price Impact of Order Book
  Events*, *Journal of Financial Econometrics*, 2014 — order-flow imbalance and
  short-horizon price moves.
- Martin D. Gould and Julius Bonart, *Queue Imbalance as a One-Tick-Ahead Price
  Predictor in a Limit Order Book*, *Market Microstructure and Liquidity*, 2016.

## See also

- [OrderBookImbalanceTopN](Indicator-OrderBookImbalanceTopN) — the same idea
  aggregated over the near book, more robust to spoofing.
- [OrderBookImbalanceFull](Indicator-OrderBookImbalanceFull) — whole-book
  pressure for slower bias.
- [Microprice](Indicator-Microprice) — turns this imbalance into a fair value.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
