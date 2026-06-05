# OrderFlowImbalance

> The rolling sum of best-level order-flow events over the last `period`
> order-book snapshots (Cont-Kukanov-Stoikov OFI).

## Quick reference

| Field | Value |
|-------|-------|
| Family | Microstructure |
| Input type | `OrderBook` |
| Output type | `f64` |
| Output range | unbounded; signed (positive = net buy pressure) |
| Default parameters | `period` is required |
| Warmup period | `period + 1` |
| Interpretation | Large positive = net buying pressure at top of book; negative = net selling. |

## Formula

Following Cont, Kukanov & Stoikov (2014), each new snapshot contributes a signed
event from how the best bid and ask moved versus the previous one:

```
Δᵇ = qᵇₙ·1{Pᵇₙ ≥ Pᵇₙ₋₁} − qᵇₙ₋₁·1{Pᵇₙ ≤ Pᵇₙ₋₁}     (bid pressure)
Δᵃ = qᵃₙ·1{Pᵃₙ ≤ Pᵃₙ₋₁} − qᵃₙ₋₁·1{Pᵃₙ ≥ Pᵃₙ₋₁}     (ask pressure)
eₙ = Δᵇ − Δᵃ
OFI = Σ eₙ  over the last `period` snapshots
```

A rising bid (or replenished bid size) and a falling/depleting ask both add
positive flow; the mirror subtracts. The rolling sum is a strong short-horizon
predictor of price moves.

Source: `crates/wickra-core/src/indicators/order_flow_imbalance.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= 1`      | `order_flow_imbalance.rs:56` | Number of snapshots summed. `0` errors with `Error::PeriodZero`. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/order_flow_imbalance.rs`:

```rust
use wickra::{Indicator, OrderBook, OrderFlowImbalance};
// OrderFlowImbalance: Input = OrderBook, Output = f64
const _: fn(&mut OrderFlowImbalance, OrderBook) -> Option<f64> =
    <OrderFlowImbalance as Indicator>::update;
```

Node `update(bidPx[], bidSz[], askPx[], askSz[])` and `batch(snapshots)`; Python
`update(bid_px, bid_sz, ask_px, ask_sz)` and `batch(list_of_snapshots)` → 1-D
`ndarray`. Only the best (first) level of each side is read.

## Warmup

`warmup_period() == period + 1`: one snapshot seeds the reference quotes, then
`period` events fill the window. The unit test `accessors_and_metadata` pins
`warmup_period() == 21` for `period = 20`; `first_snapshot_is_none` pins the seed.

## Edge cases

- **Rising bid.** A lifted bid adds positive flow (`+6` for the test snapshot);
  pinned by `rising_bid_adds_positive_flow`.
- **Falling bid.** A dropped bid adds negative flow; pinned by
  `falling_bid_adds_negative_flow`.
- **Accumulation.** The rolling sum accumulates events; pinned by
  `rolling_sum_accumulates`.
- **Empty book side.** A book with no levels on a side (only via
  `OrderBook::new_unchecked`) returns `None`; pinned by `empty_book_side_is_none`.

## Examples

### Rust

```rust
use wickra::{Indicator, Level, OrderBook, OrderFlowImbalance};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut ofi = OrderFlowImbalance::new(1)?;
    let b0 = OrderBook::new(vec![Level::new(100.0, 5.0)?], vec![Level::new(101.0, 4.0)?])?;
    let b1 = OrderBook::new(vec![Level::new(100.5, 6.0)?], vec![Level::new(101.0, 4.0)?])?;
    ofi.update(b0); // None (seeds reference)
    println!("{:?}", ofi.update(b1));
    Ok(())
}
```

Output:

```
Some(6.0)
```

The bid lifts in price with size 6 (`Δᵇ = 6`) while the ask is unchanged
(`Δᵃ = 0`), so `e = 6`.

### Python

```python
import wickra as ta

ofi = ta.OrderFlowImbalance(1)
print(ofi.update([100.0], [5.0], [101.0], [4.0]))   # None
print(ofi.update([100.5], [6.0], [101.0], [4.0]))   # 6.0
```

Output:

```
None
6.0
```

### Node

```javascript
const ta = require('wickra');
const ofi = new ta.OrderFlowImbalance(1);
ofi.update([100], [5], [101], [4]); // null
console.log(ofi.update([100.5], [6], [101], [4]));
```

Output:

```
6
```

## Interpretation

`OrderFlowImbalance` is one of the strongest short-horizon predictors of price
moves in microstructure research: it captures net order pressure at the top of
book directly from quote dynamics, not from trades. A large positive rolling OFI
precedes upward pressure; a large negative one downward. Pair with trade-side
toxicity ([Vpin](/Indicators/Indicator-Vpin)) and the static book imbalance
([OrderBookImbalanceTop1](/Indicators/Indicator-OrderBookImbalanceTop1)).

## Common pitfalls

- **Best-level only.** This reads only the best bid/ask; deep-book changes are
  not captured. Use the depth imbalance indicators for full-book pressure.
- **Snapshot cadence matters.** OFI is defined per snapshot; the value scales
  with how frequently you sample the book.

## References

Cont, Kukanov & Stoikov, "The Price Impact of Order Book Events" (2014).

## See also

- [Indicator-OrderBookImbalanceTop1](/Indicators/Indicator-OrderBookImbalanceTop1) — static best-level imbalance.
- [Indicator-Vpin](/Indicators/Indicator-Vpin) — trade-flow toxicity.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
