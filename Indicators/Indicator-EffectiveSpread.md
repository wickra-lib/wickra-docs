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

The effective spread is what the aggressor *actually* paid, measured against
the mid prevailing at the instant of the trade.

- **Positive.** The normal case — the aggressor crossed the spread and paid
  for immediacy. The larger the number, the worse the fill.
- **Near zero or negative.** Price improvement: the fill landed inside the
  quote, or even on the passive side of the mid. Common with
  midpoint-matching venues and hidden liquidity.
- **Versus the quoted spread.** If the average effective spread is below the
  quoted spread, your flow is getting price improvement; if it is above, you
  are walking the book. This ratio is the core of transaction-cost analysis.

Averaged — ideally volume-weighted — over many trades it is the standard
execution-quality metric venues and brokers report.

## Common pitfalls

- **Per-trade, not a rate.** A single reading is one fill's cost. Aggregate it
  yourself — volume-weight a window — for a venue- or strategy-level estimate.
- **Mid quality drives it.** The result is only as good as the `mid` you pass;
  a stale or one-sided mid distorts every reading. Use the mid that prevailed
  *at* execution, not the next tick.
- **Sign depends on the aggressor flag.** The convention charges the aggressor
  (positive = cost); a mislabelled side flips the sign, turning costs into
  apparent improvement.

## References

- Charles M. C. Lee and Mark J. Ready, *Inferring Trade Direction from Intraday
  Data*, *Journal of Finance*, 1991 — trade signing.
- Roger D. Huang and Hans R. Stoll, *Dealer versus Auction Markets*, *Journal
  of Financial Economics*, 1996 — the effective/realized spread decomposition.
- Hendrik Bessembinder, *Issues in Assessing Trade Execution Costs*, *Journal
  of Financial Markets*, 2003.

## See also

- [QuotedSpread](/Indicators/Indicator-QuotedSpread) — the standing spread at the touch.
- [RealizedSpread](/Indicators/Indicator-RealizedSpread) — effective spread net of price
  impact (the maker's take).
- [KylesLambda](/Indicators/Indicator-KylesLambda) — price impact per unit of signed flow.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
