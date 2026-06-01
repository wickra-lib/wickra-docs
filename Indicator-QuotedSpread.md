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

The quoted spread is the headline liquidity cost: how many basis points a
round-trip at the touch would cost if you crossed both sides. It widens in
stress and tightens in calm, deep markets. Compare it to the
[EffectiveSpread](Indicator-EffectiveSpread) to measure realised execution
quality versus the standing quote.

## Pitfalls

- It ignores size — a tight but tiny quote can still be expensive to trade
  through. Combine with [DepthSlope](Indicator-DepthSlope) / imbalance.

## See also

- [EffectiveSpread](Indicator-EffectiveSpread), [Microprice](Indicator-Microprice)
