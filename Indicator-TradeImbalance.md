# TradeImbalance

> The rolling buy/sell volume imbalance over the last `window` trades.
> `+1` all aggressive buying, `−1` all selling, `0` balanced.

## Quick reference

| Item                | Value                                                          |
|---------------------|----------------------------------------------------------------|
| Family              | Microstructure                                                 |
| Input type          | `Trade` — an executed trade with an aggressor side             |
| Output type         | `f64`                                                          |
| Output range        | `[−1, +1]`                                                     |
| Default parameters  | `window` required (`≥ 1`)                                      |
| Warmup period       | `window`                                                       |
| Interpretation      | Rolling order-flow imbalance                                   |

## Formula

```
buyVol    = Σ size of buyer-initiated trades in the window
sellVol   = Σ size of seller-initiated trades in the window
imbalance = (buyVol − sellVol) / (buyVol + sellVol)
```

Rolling over the trailing `window` trades, maintained in O(1) per trade via a
ring buffer. Empty / zero-volume window → `0`. See
`crates/wickra-core/src/indicators/trade_imbalance.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `window` | `usize` | none    | `≥ 1`      | Number of trailing trades in the rolling window. |

## Inputs / Outputs

`Indicator<Input = Trade, Output = f64>`. Bindings:
`update(price, size, is_buy)`; Python / Node `batch` take three equal-length
arrays → 1-D array (NaN during warmup). WASM streaming-only.

## Warmup

`warmup_period() == window`; `update` returns `None` until the window is full.

## Edge cases

- **Zero-volume window.** Returns `0` rather than `NaN`.
- **Bounded** in `[−1, +1]`.
- **Window of 1.** Degenerates to the sign of each trade.

## Examples

### Rust

```rust
use wickra::{Indicator, Side, Trade, TradeImbalance};

let mut ti = TradeImbalance::new(2).unwrap();
assert_eq!(ti.update(Trade::new(100.0, 3.0, Side::Buy, 0).unwrap()), None);
// Window full: buyVol 3, sellVol 1 -> (3 − 1) / 4 = 0.5
assert_eq!(ti.update(Trade::new(100.0, 1.0, Side::Sell, 1).unwrap()), Some(0.5));
```

### Python

```python
import wickra as ta
ti = ta.TradeImbalance(2)
ti.update(100.0, 3.0, True)            # None (warming up)
print(ti.update(100.0, 1.0, False))    # 0.5
```

### Node

```js
const { TradeImbalance } = require('wickra');
const ti = new TradeImbalance(2);
ti.update(100, 3, true);               // null
console.log(ti.update(100, 1, false)); // 0.5
```

## Interpretation

TradeImbalance is the normalised, bounded read of order flow — who is winning
the aggression battle over the last `window` trades.

- **Near +1.** One-sided buying; almost every trade in the window lifted the
  offer. Sustained readings here mark a buyer-dominated tape.
- **Near −1.** One-sided selling.
- **Around 0.** Two-way trade — buyers and sellers roughly matched.

Because it is bounded in `[−1, +1]` it is directly comparable across instruments
and regimes, unlike the unbounded [CumulativeVolumeDelta](Indicator-CumulativeVolumeDelta).
It pairs naturally with a price filter: strong imbalance *with* price progress
is trend; strong imbalance *without* it is absorption.

## Common pitfalls

- **Window tuning.** Short windows are jumpy and whipsaw; long windows lag the
  turn. Match `window` to your trade rate, not a fixed number of seconds.
- **Aggressor flag required.** Like every flow measure, a trustworthy buy/sell
  label is a precondition — infer it (tick / quote rule) if your feed lacks it.
- **`window = 1` degenerates.** It collapses to the sign of each individual
  trade, losing all of the smoothing the measure exists to provide.

## References

- Tarun Chordia, Richard Roll, Avanidhar Subrahmanyam, *Order Imbalance,
  Liquidity, and Market Returns*, *Journal of Financial Economics*, 2002.
- David Easley, Marcos López de Prado, Maureen O'Hara, *Flow Toxicity and
  Liquidity in a High-Frequency World*, *Review of Financial Studies*, 2012 —
  order-imbalance toxicity (VPIN).

## See also

- [SignedVolume](Indicator-SignedVolume) — the per-trade flow this normalises.
- [CumulativeVolumeDelta](Indicator-CumulativeVolumeDelta) — the unbounded,
  cumulative view of the same flow.
- [Footprint](Indicator-Footprint) — flow imbalance resolved by price level.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
