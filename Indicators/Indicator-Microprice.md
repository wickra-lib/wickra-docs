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

The microprice is the market's size-weighted fair value — the mid pulled toward
the side more likely to be consumed next.

- **Above the mid.** The ask is thin relative to the bid; the book leans to
  lift, so fair value sits above the midpoint and an up-tick is more likely
  than a down-tick.
- **Below the mid.** The bid is thin relative to the ask; downward pressure,
  fair value below the mid.
- **At the mid.** Top sizes are balanced — no directional tilt.

It is the standard reference price for high-frequency PnL marking and a better
short-horizon predictor of the next trade price than the plain mid, because it
already encodes top-of-book imbalance.

## Common pitfalls

- **Top-level only.** The estimator uses just the best bid/ask; a deep but
  lopsided book beyond the touch is invisible. Pair it with
  [OrderBookImbalanceFull](/Indicators/Indicator-OrderBookImbalanceFull) or
  [DepthSlope](/Indicators/Indicator-DepthSlope) when depth matters.
- **Spoofable inputs.** Quoted top size can be posted and pulled in
  milliseconds; a microprice driven by flickering quotes is noisy. Confirm
  with executed flow ([TradeImbalance](/Indicators/Indicator-TradeImbalance)).
- **Not a tradable price.** It is a fair-value estimate *between* the quotes,
  not a level you can transact at — you still cross the spread to execute.

## References

- Sasha Stoikov, *The Micro-Price: A High-Frequency Estimator of Future
  Prices*, *Quantitative Finance*, 2018 — the size-weighted fair-value
  estimator this implements.
- Álvaro Cartea, Sebastian Jaimungal, José Penalva, *Algorithmic and
  High-Frequency Trading*, 2015 — the microprice in optimal-execution context.

## See also

- [QuotedSpread](/Indicators/Indicator-QuotedSpread) — the cost of crossing the touch this
  fair value sits inside.
- [OrderBookImbalanceTop1](/Indicators/Indicator-OrderBookImbalanceTop1) — the raw
  top-of-book imbalance the microprice turns into a price.
- [DepthSlope](/Indicators/Indicator-DepthSlope) — fair-value context from the shape of the
  resting book.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
