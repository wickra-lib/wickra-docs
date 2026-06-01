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

TradeImbalance is the normalised, bounded version of order flow: a rolling read
of who is winning the aggression battle over the last `window` trades. Sustained
readings near `±1` mark one-sided tape; oscillation around `0` is two-way trade.

## Pitfalls

- Short windows are jumpy; long windows lag. Tune to your trade rate.
- Like all flow measures it needs a trustworthy aggressor flag.

## See also

- [SignedVolume](Indicator-SignedVolume), [CumulativeVolumeDelta](Indicator-CumulativeVolumeDelta), [Footprint](Indicator-Footprint)
