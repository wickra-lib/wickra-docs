# QuotedSpread

> The top-of-book bid-ask spread expressed in basis points of the mid —
> the standing cost of crossing the spread at the touch.

## Quick reference

| Item                | Value                                                          |
|---------------------|----------------------------------------------------------------|
| Family              | Microstructure                                                 |
| Input type          | `OrderBook` — sorted bid/ask depth snapshot                    |
| Output type         | `f64` (basis points)                                           |
| Output range        | `≥ 0` for an uncrossed book                                    |
| Default parameters  | none                                                           |
| Warmup period       | `1`                                                            |
| Interpretation      | Standing liquidity cost                                        |

## Formula

```
mid          = (bidPrice₁ + askPrice₁) / 2
quotedSpread = (askPrice₁ − bidPrice₁) / mid · 10_000   (bps)
```

Normalising by the mid makes it comparable across instruments. Empty book → `0`.
Stateless, O(1). See `crates/wickra-core/src/indicators/quoted_spread.rs`.

## Parameters

None. Construct with `QuotedSpread::new()`.

## Inputs / Outputs

`Indicator<Input = OrderBook, Output = f64>`. Bindings:
`update(bid_px, bid_sz, ask_px, ask_sz)`; Python / Node `batch` over a list of
snapshots → 1-D array. WASM streaming-only.

## Warmup

`warmup_period() == 1`.

## Edge cases

- **Empty book.** Returns `0`.
- **Uncrossed input.** For a valid (uncrossed) book the result is non-negative.

## Examples

### Rust

```rust
use wickra::{Indicator, Level, OrderBook, QuotedSpread};

let book = OrderBook::new(
    vec![Level::new(100.0, 1.0).unwrap()],
    vec![Level::new(101.0, 1.0).unwrap()],
).unwrap();
// spread 1.0, mid 100.5 -> 1 / 100.5 * 10_000 ≈ 99.5025 bps
assert!((QuotedSpread::new().update(book).unwrap() - 99.502_487_56).abs() < 1e-6);
```

### Python

```python
import wickra as ta
print(ta.QuotedSpread().update([100.0], [1.0], [101.0], [1.0]))  # ≈ 99.5025 bps
```

### Node

```js
const { QuotedSpread } = require('wickra');
console.log(new QuotedSpread().update([100], [1], [101], [1])); // ≈ 99.5025
```

## Interpretation

The quoted spread is the headline liquidity cost — how many basis points a
round-trip at the touch would cost if you crossed both sides right now.

- **Wide.** Thin or nervous market; market makers demand more to quote.
  Spreads blow out around news, at the open and close, and in low-liquidity
  hours.
- **Tight.** Deep, competitive, calm market; the cost of immediacy is low.
  Major FX pairs and large-cap equities sit here in normal regimes.
- **Versus the effective spread.** The quoted spread is what the book
  *advertises*; the [EffectiveSpread](Indicator-EffectiveSpread) is what trades
  *actually* pay. A persistent gap means meaningful price improvement (or
  slippage) inside the quote.

## Common pitfalls

- **It ignores size.** A tight quote for one lot can still be expensive to
  trade *through* — the second level may be far away. Combine with
  [DepthSlope](Indicator-DepthSlope) or
  [OrderBookImbalanceTopN](Indicator-OrderBookImbalanceTopN) to see depth.
- **Basis points hide the absolute cost.** A 5 bps spread on a $5 stock is a
  different ticket than on a $5 000 future; weigh it against what you trade.
- **Crossed or locked books.** A momentarily crossed feed (bid ≥ ask) yields a
  non-positive spread; this indicator clamps an empty book to `0`, but you
  should still sanitise upstream quotes.

## References

- Richard Roll, *A Simple Implicit Measure of the Effective Bid-Ask Spread in
  an Efficient Market*, *Journal of Finance*, 1984.
- Maureen O'Hara, *Market Microstructure Theory*, 1995 — the economics of the
  spread as a liquidity premium.

## See also

- [EffectiveSpread](Indicator-EffectiveSpread) — what trades actually paid
  versus the quote.
- [RealizedSpread](Indicator-RealizedSpread) — the spread the maker keeps after
  price impact.
- [Microprice](Indicator-Microprice) — fair value inside the spread.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
