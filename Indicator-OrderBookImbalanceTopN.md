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

Top-N imbalance is the middle ground of the family — pressure aggregated over
the `levels` of near-book depth that actually get hit.

- **Positive (→ +1).** Bid-side depth dominates the near book; upward pressure
  that is harder to fake than a single best level.
- **Negative (→ −1).** Ask-side depth dominates; downward pressure.
- **Versus Top-1 and Full.** Summing several levels is more robust to
  single-level spoofing than [Top-1](Indicator-OrderBookImbalanceTop1) while
  staying more responsive than the whole
  [Full](Indicator-OrderBookImbalanceFull) book. The `levels` knob trades
  responsiveness for robustness.

Choose `levels` to match the depth that actually trades on your venue — the
liquidity a real order would consume.

## Common pitfalls

- **Dilution at large `levels`.** Summing deep, rarely-hit liquidity drowns the
  near-touch signal; the reading drifts toward the slow
  [Full](Indicator-OrderBookImbalanceFull) measure.
- **Clamping is silent.** When fewer than `levels` are posted it sums
  `min(levels, depth)` with no padding, so a thin snapshot quietly behaves like
  a shallower `levels` — comparable only across snapshots of similar depth.
- **Still posted, not committed.** Like all book measures it reads resting
  quotes; confirm a strong tilt with executed flow
  ([TradeImbalance](Indicator-TradeImbalance)).

## References

- Rama Cont, Arseniy Kukanov, Sasha Stoikov, *The Price Impact of Order Book
  Events*, *Journal of Financial Econometrics*, 2014.
- Álvaro Cartea, Sebastian Jaimungal, José Penalva, *Algorithmic and
  High-Frequency Trading*, 2015 — depth-weighted imbalance signals.

## See also

- [OrderBookImbalanceTop1](Indicator-OrderBookImbalanceTop1) — the most
  responsive, single-level version.
- [OrderBookImbalanceFull](Indicator-OrderBookImbalanceFull) — the whole-book,
  slowest version.
- [DepthSlope](Indicator-DepthSlope) — the shape, not just the imbalance, of
  depth.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
