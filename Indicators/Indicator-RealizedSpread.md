# RealizedSpread

> The share of a trade's effective spread that a liquidity provider
> keeps once the mid has moved over a fixed horizon. Effective spread
> net of price impact — the adverse-selection-adjusted revenue.

## Quick reference

| Item                | Value                                                          |
|---------------------|----------------------------------------------------------------|
| Family              | Microstructure                                                 |
| Input type          | `TradeQuote` — a trade plus the mid prevailing at execution    |
| Output type         | `f64` (basis points)                                           |
| Output range        | unbounded                                                      |
| Default parameters  | `horizon` required (`≥ 1`)                                     |
| Warmup period       | `horizon + 1`                                                  |
| Interpretation      | Liquidity-provision revenue / adverse selection               |

## Formula

```
realizedSpread = 2 · D · (tradePrice − mid_{t+horizon}) / mid_t · 10_000   (bps)
```

`D` is the aggressor sign, `mid_t` the mid at the trade, `mid_{t+horizon}` the
mid `horizon` trade-quotes later. Because `effective = realized + 2 · impact`,
the realized spread is the effective spread with the post-trade price impact
removed. O(1) per update via a small ring buffer. See
`crates/wickra-core/src/indicators/realized_spread.rs`.

## Parameters

| Name      | Type    | Default | Constraint | Description |
|-----------|---------|---------|------------|-------------|
| `horizon` | `usize` | none    | `≥ 1`      | Number of trade-quotes until the future mid that resolves a trade. |

## Inputs / Outputs

`Indicator<Input = TradeQuote, Output = f64>`. Bindings:
`update(price, size, is_buy, mid)`. Each `update` buffers the current trade and
emits the realized spread for the trade made `horizon` updates ago, so the
returned value lags the input by `horizon`. Python / Node `batch` take four
equal-length arrays and return a 1-D array (NaN during warmup). WASM streaming-only.

## Warmup

`warmup_period() == horizon + 1`; `update` returns `None` until the first
trade can be resolved against its future mid.

## Edge cases

- **No mid move.** If the mid is unchanged over the horizon, realized equals
  the [effective spread](/Indicators/Indicator-EffectiveSpread).
- **Adverse selection.** A trade that precedes a move in its own direction
  reads a low or negative realized spread — the quote was picked off.
- **Zero horizon.** Rejected at construction (`horizon ≥ 1`).

## Examples

### Rust

```rust
use wickra::{Indicator, RealizedSpread, Side, Trade, TradeQuote};

let mut rs = RealizedSpread::new(1).unwrap();
let tq = |p, side, mid| TradeQuote::new(Trade::new(p, 1.0, side, 0).unwrap(), mid).unwrap();
assert_eq!(rs.update(tq(100.10, Side::Buy, 100.0)), None); // buffered
// Resolved one trade later against mid 100.20:
assert!((rs.update(tq(99.90, Side::Sell, 100.20)).unwrap() - (-20.0)).abs() < 1e-9);
```

### Python

```python
import wickra as ta

rs = ta.RealizedSpread(1)
rs.update(100.10, 1.0, True, 100.0)        # None, buffered
print(rs.update(99.90, 1.0, False, 100.20))  # -20.0 bps (adverse selection)
```

### Node

```js
const { RealizedSpread } = require('wickra');

const rs = new RealizedSpread(1);
rs.update(100.10, 1, true, 100.0);            // null
console.log(rs.update(99.90, 1, false, 100.20)); // -20 bps
```

## Interpretation

Realized spread approximates the revenue a liquidity provider keeps per trade
once the market has had a horizon to reveal information.

- **High and positive.** The maker captured most of the spread — the trade was
  uninformed (liquidity-driven) and the mid barely moved against the quote.
- **Low or negative.** Adverse selection: the trade carried information, the
  mid moved in the aggressor's favour, and the maker was picked off. Persistent
  negative readings flag toxic flow.
- **Effective = realized + 2 × impact.** The gap between the
  [EffectiveSpread](/Indicators/Indicator-EffectiveSpread) and the realized spread *is*
  twice the price impact — the decomposition Huang & Stoll formalised.

It is the headline metric for grading market-making profitability and for
sizing the adverse-selection cost a venue's flow carries.

## Common pitfalls

- **The output is time-shifted.** A value emitted now describes the trade
  `horizon` updates in the *past*; line it up against the originating trade,
  not the current one, when attributing PnL.
- **Horizon is in trades, not clock time.** `horizon` counts trade-quotes, so
  its wall-clock length stretches and shrinks with activity. Pick it to match
  the information half-life of your venue, not a fixed number of seconds.
- **Needs a clean future mid.** The resolving mid must be the genuine post-trade
  mid; a stale or crossed quote `horizon` steps later poisons the reading.

## References

- Roger D. Huang and Hans R. Stoll, *Dealer versus Auction Markets*, *Journal
  of Financial Economics*, 1996 — the realized-spread / price-impact split.
- Hendrik Bessembinder and Herbert M. Kaufman, *A Comparison of Trade Execution
  Costs for NYSE and NASDAQ-Listed Stocks*, *JFQA*, 1997.
- David Easley, Marcos López de Prado, Maureen O'Hara, *Flow Toxicity and
  Liquidity in a High-Frequency World*, *Review of Financial Studies*, 2012 —
  adverse selection and toxic flow.

## See also

- [EffectiveSpread](/Indicators/Indicator-EffectiveSpread) — the gross per-trade cost this
  nets price impact out of.
- [KylesLambda](/Indicators/Indicator-KylesLambda) — the price-impact slope that fills the
  effective-minus-realized gap.
- [Microprice](/Indicators/Indicator-Microprice) — a fair value that anticipates the move.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
