# TakerBuySellRatio

> Aggressive (taker) buy volume divided by taker sell volume — the
> perpetual-feed analogue of trade imbalance, read straight off the venue's
> taker-volume fields.

## Quick reference

| Item                | Value                                                          |
|---------------------|----------------------------------------------------------------|
| Family              | Derivatives                                                    |
| Input type          | `DerivativesTick` — a perp / futures market tick               |
| Output type         | `f64` (ratio)                                                 |
| Output range        | `>= 0`; `0` when there is no taker sell volume                |
| Default parameters  | none                                                           |
| Warmup period       | `1`                                                            |
| Interpretation      | Aggressive order-flow balance                               |

## Formula

```
takerBuySellRatio = takerBuyVolume / takerSellVolume   (0 when sell == 0)
```

Stateless and O(1). See
`crates/wickra-core/src/indicators/taker_buy_sell_ratio.rs`.

## Parameters

None. Construct with `TakerBuySellRatio::new()`.

## Inputs / Outputs

`Indicator<Input = DerivativesTick, Output = f64>`. The bindings expose the two
fields this indicator reads: `update(taker_buy_volume, taker_sell_volume)`.
Python / Node `batch` accept two equal-length arrays
`(taker_buy_volume, taker_sell_volume)` and return a 1-D array; WASM is
streaming-only.

## Warmup

`warmup_period() == 1`; emits on the first tick.

## Edge cases

- **No taker sells.** When `taker_sell_volume == 0` the ratio is undefined and
  the indicator reports `0.0`.
- **Per-interval volume.** Feed the taker volumes the venue aggregated for the
  interval; the ratio inherits that bucketing.

## Examples

### Rust

```rust
use wickra::{DerivativesTick, Indicator, TakerBuySellRatio};

fn tick(buy: f64, sell: f64) -> DerivativesTick {
    DerivativesTick::new(0.0, 100.0, 100.0, 100.0, 0.0, 0.0, 0.0, buy, sell, 0.0, 0.0, 0)
        .unwrap()
}

let mut tbs = TakerBuySellRatio::new();
assert_eq!(tbs.update(tick(60.0, 40.0)), Some(1.5));
```

### Python

```python
import wickra as ta

tbs = ta.TakerBuySellRatio()
print(tbs.update(60.0, 40.0))  # 1.5
```

### Node

```js
const { TakerBuySellRatio } = require('wickra');

const tbs = new TakerBuySellRatio();
console.log(tbs.update(60, 40)); // 1.5
```

## Interpretation

Taker volume is the flow that crossed the spread — the aggressive side that
moves price. A ratio above `1` means buyers are lifting offers faster than
sellers are hitting bids; below `1` the reverse. Sustained imbalance confirms
the direction of an aggressive move; a flip can precede a turn.

## Common pitfalls

- **Aggressor, not resting.** This measures takers, not the standing book; pair
  it with order-book imbalance for both sides of the picture.
- **Zero reads as `0`.** No taker sells returns `0.0` by convention, not `∞`.

## See also

- [TradeImbalance](Indicator-TradeImbalance) — the trade-tape equivalent.
- [LongShortRatio](Indicator-LongShortRatio) — positioning analogue.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
