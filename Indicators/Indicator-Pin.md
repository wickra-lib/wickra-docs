# Pin

> The Probability of Informed Trading (EKOP) — estimated from the buy/sell
> imbalance over a rolling window of trades.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Microstructure |
| Input type | `Trade` (price / size / side) |
| Output type | `f64` |
| Output range | `[0, 1]` |
| Default parameters | `(window = 20)` (Python) |
| Warmup period | `window` |
| Interpretation | High = one-sided/informed flow; low = balanced/uninformed. |

## Formula

```
over the last `window` trades: B = buys, S = sells   (B + S = window)
PIN ≈ |B − S| / (B + S)        ∈ [0, 1]
```

The EKOP model splits flow into uninformed (balanced) and informed (one-directional
on private information) components; `PIN = αμ / (αμ + 2ε)` is the probability a
trade is information-motivated. Over a single window the informed flow appears as
the net imbalance `|B − S|` and the uninformed flow as the balanced remainder,
giving this moment estimator. Source:
`crates/wickra-core/src/indicators/pin.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `window` | `usize` | `20` (Python) | `>= 1`      | `pin.rs:58` | Rolling window of trades. `0` errors with `Error::PeriodZero`. |

The `window` getter returns the window; `value` returns the current output if
ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/pin.rs`:

```rust
use wickra::{Indicator, Pin};
use wickra::Trade;
// Pin: Input = Trade, Output = f64
const _: fn(&mut Pin, Trade) -> Option<f64> = <Pin as Indicator>::update;
```

A `Trade` in, an `Option<f64>` out. The Python binding takes `update(price, size,
is_buy)` and `batch(price[], size[], is_buy[])`; Node mirrors `update(price, size,
isBuy)` / `batch(...)`. Only the side is used.

## Warmup

`warmup_period() == window`. The first value lands once the window holds `window`
trades (`first_emission_at_warmup_period` pins this).

## Edge cases

- **One-sided flow → 1.** All trades the same side gives `PIN = 1`
  (`one_sided_flow_is_one` pins this).
- **Balanced flow → 0.** Equal buys and sells gives `PIN = 0`
  (`balanced_flow_is_zero` pins this).
- **Bounded.** The reading stays in `[0, 1]` (`output_in_range` pins this).
- **Reset.** `p.reset()` clears the side window, the buy count and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, Pin};
use wickra::{Side, Trade};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut p = Pin::new(10)?;
    let trades: Vec<Trade> = (0..20).map(|_| Trade::new(100.0, 1.0, Side::Buy, 0).unwrap()).collect();
    println!("{:?}", p.batch(&trades).last().unwrap()); // Some(1.0)
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

p = ta.Pin(20)
price = np.full(40, 100.0); size = np.ones(40)
is_buy = np.array([i % 2 == 0 for i in range(40)])
print(p.batch(price, size, is_buy)[-1])  # 0.0 (balanced)
```

### Node

```javascript
const ta = require('wickra');
const p = new ta.Pin(20);
console.log('warmupPeriod:', p.warmupPeriod()); // 20
```

### Streaming

```rust
use wickra::{Indicator, Pin};
use wickra::Trade;

let mut p = Pin::new(20).unwrap();
let trade_feed: Vec<Trade> = Vec::new(); // your live stream
for trade in trade_feed {
    if let Some(pin) = p.update(trade) {
        // pin high -> elevated probability of informed trading
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Adverse-selection gauge.** A rising PIN warns liquidity providers of higher
   adverse-selection risk — widen quotes or pull size.
2. **Pre-event detection.** PIN tends to rise ahead of information events as
   informed traders position.
3. **Cross-section.** Compare PIN across instruments to rank information asymmetry.

## Common pitfalls

- **Single-window estimate.** This is the moment approximation, not the multi-period
  MLE of the full EKOP model.
- **Not VPIN.** [`Vpin`](/Indicators/Indicator-Vpin) buckets by volume and uses bulk
  classification; PIN here counts tagged trades in event time.
- **Sign quality.** Mis-tagged aggressor sides bias the estimate.

## References

Easley, D., Kiefer, N. M., O'Hara, M., & Paperman, J. B. (1996), "Liquidity,
Information, and Infrequently Traded Stocks", *Journal of Finance*.

## See also

- [Indicator-Vpin](/Indicators/Indicator-Vpin) — the volume-synchronised variant.
- [Indicator-TradeSignAutocorrelation](/Indicators/Indicator-TradeSignAutocorrelation) — flow persistence.
- [Indicator-OrderFlowImbalance](/Indicators/Indicator-OrderFlowImbalance) — signed flow.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
