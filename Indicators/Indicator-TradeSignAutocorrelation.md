# TradeSignAutocorrelation

> The lag-1 autocorrelation of the trade-aggressor side — how strongly signed
> order flow persists, a footprint of order-splitting and informed execution.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Microstructure |
| Input type | `Trade` (price / size / side) |
| Output type | `f64` |
| Output range | `[−1, +1]` |
| Default parameters | `(period = 20)` (Python) |
| Warmup period | `period` |
| Interpretation | `> 0` flow persists; `< 0` bid-ask bounce; `~0` balanced. |

## Formula

```
s_t = +1 if buy, −1 if sell
ρ1  = mean over the window of ( s_t · s_{t−1} )      ∈ [−1, +1]
```

Trade signs are strongly positively autocorrelated in real markets: large parent
orders are sliced into many same-side child trades, so a buy is usually followed
by a buy. A high reading flags persistent directional pressure (informed /
algorithmic execution); near zero is balanced flow; negative is alternating
(bid-ask bounce). Source:
`crates/wickra-core/src/indicators/trade_sign_autocorrelation.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `20` (Python) | `>= 2`      | `trade_sign_autocorrelation.rs:55` | Rolling window of trades. `< 2` errors with `Error::InvalidPeriod`. |

The `period` getter returns the window; `value` returns the current output if
ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/trade_sign_autocorrelation.rs`:

```rust
use wickra::{Indicator, TradeSignAutocorrelation};
use wickra::Trade;
// TradeSignAutocorrelation: Input = Trade, Output = f64
const _: fn(&mut TradeSignAutocorrelation, Trade) -> Option<f64> =
    <TradeSignAutocorrelation as Indicator>::update;
```

A `Trade` in, an `Option<f64>` out. The Python binding takes `update(price, size,
is_buy)` and `batch(price[], size[], is_buy[])` (three arrays); Node mirrors
`update(price, size, isBuy)` / `batch(...)`. Only the side is used here.

## Warmup

`warmup_period() == period`. The first value lands once the window holds `period`
trade signs (`first_emission_at_warmup_period` pins this).

## Edge cases

- **Persistent flow → +1.** All same-side trades give `+1` (`persistent_flow_is_one`
  pins this).
- **Alternating flow → −1.** Strictly alternating signs give `−1`
  (`alternating_flow_is_minus_one` pins this).
- **Bounded.** The reading stays within `[−1, +1]` (`output_in_range` pins this).
- **Reset.** `t.reset()` clears the sign window and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, TradeSignAutocorrelation};
use wickra::{Side, Trade};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = TradeSignAutocorrelation::new(10)?;
    let trades: Vec<Trade> = (0..20).map(|_| Trade::new(100.0, 1.0, Side::Buy, 0).unwrap()).collect();
    println!("{:?}", t.batch(&trades).last().unwrap()); // Some(1.0)
    Ok(())
}
```

Output:

```
Some(1.0)
```

### Python

```python
import numpy as np
import wickra as ta

t = ta.TradeSignAutocorrelation(20)
price = np.full(40, 100.0); size = np.ones(40)
is_buy = np.array([i % 2 == 0 for i in range(40)])
print(t.batch(price, size, is_buy)[-1])  # -1.0 (alternating)
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.TradeSignAutocorrelation(20);
console.log('warmupPeriod:', t.warmupPeriod()); // 20
```

### Streaming

```rust
use wickra::{Indicator, TradeSignAutocorrelation};
use wickra::Trade;

let mut t = TradeSignAutocorrelation::new(20).unwrap();
let trade_feed: Vec<Trade> = Vec::new(); // your live stream
for trade in trade_feed {
    if let Some(rho) = t.update(trade) {
        // rho high -> persistent directional pressure
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Informed-flow gauge.** A persistently high autocorrelation suggests a large
   directional order is working — fade with caution, follow with confirmation.
2. **Liquidity regime.** Near-zero flow with low autocorrelation is healthy
   two-sided liquidity.
3. **Microstructure noise.** Strongly negative values indicate bid-ask bounce
   dominating — common in quiet, tick-sized markets.

## Common pitfalls

- **Sign classification.** Quality depends on correct aggressor-side tagging
  (Lee-Ready or exchange-provided); mis-signed trades blur the reading.
- **Window vs. event time.** This is in trade (event) time, not clock time; bursty
  periods fill the window faster.
- **Not a price predictor alone.** High persistence says flow is one-sided, not that
  price must continue.

## References

Bouchaud, J.-P., et al. (2004), "Fluctuations and response in financial markets"
(long-range autocorrelation of trade signs); Lillo, F., & Farmer, J. D. (2004).

## See also

- [Indicator-OrderFlowImbalance](/Indicators/Indicator-OrderFlowImbalance) — signed flow imbalance.
- [Indicator-TradeImbalance](/Indicators/Indicator-TradeImbalance) — buy/sell volume imbalance.
- [Indicator-Vpin](/Indicators/Indicator-Vpin) — volume-synchronised informed-trading probability.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
