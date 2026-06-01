# EffectiveSpread

> The realised round-trip cost of a single trade, measured as twice
> the signed distance of its price from the prevailing mid, in basis
> points. The execution-quality counterpart to the quoted spread.

## Quick reference

| Item                | Value                                                          |
|---------------------|----------------------------------------------------------------|
| Family              | Microstructure                                                 |
| Input type          | `TradeQuote` — a trade plus the mid prevailing at execution    |
| Output type         | `f64` (basis points)                                           |
| Output range        | unbounded; positive when the aggressor pays                    |
| Default parameters  | none                                                           |
| Warmup period       | `1`                                                            |
| Interpretation      | Execution cost / spread capture                                |

## Formula

```
effectiveSpread = 2 · D · (tradePrice − mid) / mid · 10_000   (bps)
```

`D` is the aggressor sign (`+1` buy, `−1` sell). The factor of two scales the
one-sided deviation to a full round-trip, so a marketable order filled exactly
at the touch of a book whose quoted spread is `S` pays an effective spread of
`S`. Stateless and O(1). See `crates/wickra-core/src/indicators/effective_spread.rs`.

## Parameters

None. Construct with `EffectiveSpread::new()`.

## Inputs / Outputs

`Indicator<Input = TradeQuote, Output = f64>`. The bindings take a trade plus
its mid as four scalars: `update(price, size, is_buy, mid)`. Python / Node
`batch` accept four equal-length arrays `(price, size, is_buy, mid)` and return
a 1-D array of basis points. WASM is streaming-only.

## Warmup

`warmup_period() == 1`; emits on the first trade-quote.

## Edge cases

- **Price improvement.** A buy filled *below* the mid (or a sell above it)
  reads negative — the aggressor was paid rather than charged.
- **Trade at the mid.** Reads exactly `0`.
- **Mid validity.** The mid must be finite and strictly positive; the
  constructor of `TradeQuote` enforces it, and the bindings raise on a
  non-positive mid.

## Examples

### Rust

```rust
use wickra::{EffectiveSpread, Indicator, Side, Trade, TradeQuote};

let mut es = EffectiveSpread::new();
let trade = Trade::new(100.05, 1.0, Side::Buy, 0).unwrap();
let quote = TradeQuote::new(trade, 100.0).unwrap();
assert!((es.update(quote).unwrap() - 10.0).abs() < 1e-9); // 10 bps
```

### Python

```python
import wickra as ta

es = ta.EffectiveSpread()
print(es.update(100.05, 1.0, True, 100.0))  # 10.0 bps
```

### Node

```js
const { EffectiveSpread } = require('wickra');

const es = new EffectiveSpread();
console.log(es.update(100.05, 1, true, 100.0)); // 10 bps
```

## Interpretation

The effective spread is what the aggressor *actually* paid, against the mid at
the moment of the trade. Compared to the [QuotedSpread](Indicator-QuotedSpread),
it reveals price improvement (fills inside the quote) and slippage (fills that
walked the book). Averaged over many trades it is the standard transaction-cost
metric for execution-quality analysis.

## Pitfalls

- It is a per-trade quantity, not a rolling average — aggregate it yourself
  (e.g. volume-weight a window of readings) for a cost estimate.
- The sign convention treats the aggressor's cost as positive; a mislabelled
  aggressor flag flips the sign.

## See also

- [QuotedSpread](Indicator-QuotedSpread) — the spread at the touch.
- [RealizedSpread](Indicator-RealizedSpread) — effective spread net of price impact.
- [KylesLambda](Indicator-KylesLambda) — price impact per unit of signed flow.
