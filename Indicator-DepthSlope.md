# DepthSlope

> How fast resting liquidity accumulates away from the mid. The mean
> per-side OLS slope of cumulative size against distance from the mid —
> a deep book reads a large slope, a thin one a small slope.

## Quick reference

| Item                | Value                                                          |
|---------------------|----------------------------------------------------------------|
| Family              | Microstructure                                                 |
| Input type          | `OrderBook` — sorted bid/ask depth snapshot                    |
| Output type         | `f64`                                                          |
| Output range        | `≥ 0` for a well-formed book                                   |
| Default parameters  | none                                                           |
| Warmup period       | `1`                                                            |
| Interpretation      | Resting-book depth / liquidity resilience                      |

## Formula

```
slope_side = OLS slope of (|priceᵢ − mid|, Σ_{j≤i} sizeⱼ)
depthSlope = (slope_bid + slope_ask) / 2
```

For each side the cumulative resting size (walking outward from the touch) is
regressed on the level's distance from the mid; the output is the mean of the
two side slopes. Stateless and O(levels) per update. See
`crates/wickra-core/src/indicators/depth_slope.rs`.

## Parameters

None. Construct with `DepthSlope::new()`.

## Inputs / Outputs

`Indicator<Input = OrderBook, Output = f64>`. The bindings take a depth snapshot
as four arrays — `update(bid_px, bid_sz, ask_px, ask_sz)` — with bids
best-first (descending price) and asks best-first (ascending price). Python /
Node `batch` accept a list of such snapshots and return a 1-D array. WASM is
streaming-only.

## Warmup

`warmup_period() == 1`; emits on the first snapshot.

## Edge cases

- **Fewer than two levels per side.** No slope can be fit; returns `0`
  (including an empty book).
- **Non-negative by construction.** Because the response is *cumulative* size it
  never decreases with distance, so the slope is a magnitude, not a direction.
- **Front- vs back-loaded books.** Two books of equal total depth differ in
  slope: the one that thickens away from the touch reads larger than the one
  whose size sits at the touch.

## Examples

### Rust

```rust
use wickra::{DepthSlope, Indicator, Level, OrderBook};

let book = OrderBook::new(
    vec![Level::new(99.0, 1.0).unwrap(), Level::new(98.0, 2.0).unwrap()],
    vec![Level::new(101.0, 1.0).unwrap(), Level::new(102.0, 2.0).unwrap()],
).unwrap();
assert!(DepthSlope::new().update(book).unwrap() > 0.0);
```

### Python

```python
import wickra as ta

ds = ta.DepthSlope()
# distances 1,2 -> cumulative 1,3 -> OLS slope 2 per side
print(ds.update([99.0, 98.0], [1.0, 2.0], [101.0, 102.0], [1.0, 2.0]))  # 2.0
```

### Node

```js
const { DepthSlope } = require('wickra');
const ds = new DepthSlope();
console.log(ds.update([99, 98], [1, 2], [101, 102], [1, 2])); // 2
```

## Interpretation

DepthSlope summarises the shape of the resting book in a single number: how
quickly cumulative liquidity builds as you move away from the touch. A large
slope is a deep, cushioned book that absorbs size with little walking; a small
slope is a shallow book that gaps under pressure. Unlike
[KylesLambda](Indicator-KylesLambda), which infers impact from *executed* flow,
DepthSlope reads it straight off the *resting* quotes.

## Pitfalls

- It is sensitive to how many levels your feed publishes; compare only across
  snapshots of comparable depth.
- It measures the *posted* book, which can be spoofed or pulled; pair it with a
  flow-based measure for confirmation.

## See also

- [OrderBookImbalanceFull](Indicator-OrderBookImbalanceFull) — net depth pressure.
- [Microprice](Indicator-Microprice) — fair value from top-of-book sizes.
- [KylesLambda](Indicator-KylesLambda) — impact from executed flow.
