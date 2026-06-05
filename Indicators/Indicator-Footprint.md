# Footprint

> The buy/sell volume profile of a bar, bucketed by price. Decomposes
> where inside a bar volume printed and which side was the aggressor
> there — the detail a single OHLCV bar hides.

## Quick reference

| Item                | Value                                                          |
|---------------------|----------------------------------------------------------------|
| Family              | Microstructure                                                 |
| Input type          | `Trade` — an executed trade with an aggressor side             |
| Output type         | `FootprintOutput` — variable-length list of price buckets      |
| Output range        | per-bucket volumes `≥ 0`                                       |
| Default parameters  | `tick_size` required (finite, `> 0`)                           |
| Warmup period       | `1`                                                            |
| Interpretation      | Intrabar volume profile / order-flow clusters                  |

## Formula

```
bucket  = round(price / tick_size)
ask_vol[bucket] += size   for a buy   (lifts the ask)
bid_vol[bucket] += size   for a sell  (hits the bid)
```

Each `update` returns the full footprint accumulated **since the last
`reset`** — one row per touched price bucket, sorted ascending by price. Call
`reset()` at each bar / session boundary. See
`crates/wickra-core/src/indicators/footprint.rs`.

## Parameters

| Name        | Type  | Default | Constraint     | Description |
|-------------|-------|---------|----------------|-------------|
| `tick_size` | `f64` | none    | finite, `> 0`  | Width of each price bucket. |

## Inputs / Outputs

`Indicator<Input = Trade, Output = FootprintOutput>`, where `FootprintOutput`
holds `levels: Vec<FootprintLevel { price, bid_vol, ask_vol }>`. This is a
multi-output, **variable-length** indicator, so each binding returns a per-bar
profile rather than one scalar:

- **Python** — `update(price, size, is_buy)` returns a `(k, 3)` NumPy array with
  columns `[price, bid_vol, ask_vol]`; `batch(price[], size[], is_buy[])`
  returns a list of such arrays, one per trade.
- **Node** — `update` returns an array of `{ price, bidVol, askVol }` rows;
  `batch` returns an array of such arrays.
- **WASM** — `update` returns an array of `{ price, bidVol, askVol }` objects
  (streaming-only).

## Warmup

`warmup_period() == 1`; every `update` emits the current footprint.

## Edge cases

- **Sub-tick prices.** Trades within the same `tick_size` band share one bucket.
- **Accumulation.** The footprint grows until `reset()`; without resets it spans
  the whole stream.
- **Bad tick size.** A non-finite or non-positive `tick_size` is rejected at
  construction.

## Examples

### Rust

```rust
use wickra::{Footprint, Indicator, Side, Trade};

let mut fp = Footprint::new(1.0).unwrap();
fp.update(Trade::new(100.2, 2.0, Side::Buy, 0).unwrap());
let out = fp.update(Trade::new(100.7, 3.0, Side::Sell, 1).unwrap()).unwrap();
assert_eq!(out.levels.len(), 2);          // buckets 100 and 101
assert_eq!(out.levels[0].ask_vol, 2.0);   // bucket 100: buy 2
assert_eq!(out.levels[1].bid_vol, 3.0);   // bucket 101: sell 3
```

### Python

```python
import wickra as ta

fp = ta.Footprint(1.0)
fp.update(100.2, 2.0, True)
out = fp.update(100.7, 3.0, False)   # (2, 3) array: [price, bid_vol, ask_vol]
print(out)
```

### Node

```js
const { Footprint } = require('wickra');

const fp = new Footprint(1.0);
fp.update(100.2, 2, true);
console.log(fp.update(100.7, 3, false)); // [{price:100,bidVol:0,askVol:2}, {price:101,bidVol:3,askVol:0}]
```

## Interpretation

A footprint exposes the intrabar auction — the buy/sell volume printed at every
price inside a bar, the detail a single OHLCV candle collapses away.

- **Point of control.** The bucket with the most total volume is where the bar
  spent its conviction; it often acts as intrabar support/resistance.
- **Bid/ask imbalance per level.** When a bucket's ask (buy) volume dwarfs its
  bid (sell) volume, buyers were the aggressors *there*. A stack of
  buy-dominant buckets that fails to push price higher is absorption; the same
  on the lows is exhaustion — turns the open/high/low/close cannot reveal.
- **Shape.** A balanced, bell-shaped profile is a fair two-way auction; a thin,
  one-sided profile is a trend bar that ran with little opposition.

Reset per bar to get the classic bid/ask footprint chart; let it run for a
session-long volume-by-price profile.

## Common pitfalls

- **Tick-size choice.** Match `tick_size` to the instrument's real tick. Too
  fine fragments volume across empty buckets; too coarse blurs the profile into
  a few fat bars and hides the point of control.
- **Forgetting to `reset()`.** Without a per-bar reset the footprint accumulates
  over the whole stream — useful as a session profile, misleading if you wanted
  one bar.
- **Aggressor flag required.** The bid/ask split is only meaningful if trades
  carry a reliable aggressor side; infer it (tick / quote rule) if your feed
  does not provide one.

## References

- J. Peter Steidlmayer and Steven B. Hawkins, *Steidlmayer on Markets: Trading
  with Market Profile*, 2003 — the price-by-volume auction lineage footprint
  charts extend.
- Footprint (bid/ask volume) charts are an order-flow charting convention
  popularised by trading platforms (e.g. MarketDelta, Bookmap) rather than a
  single academic result; the implementation here follows the standard
  bid-on-sell / ask-on-buy bucketing.

## See also

- [SignedVolume](/Indicators/Indicator-SignedVolume) — the per-trade signed size each bucket
  accumulates.
- [CumulativeVolumeDelta](/Indicators/Indicator-CumulativeVolumeDelta) — the same flow as a
  single running line.
- [TradeImbalance](/Indicators/Indicator-TradeImbalance) — rolling buy/sell imbalance,
  without the price dimension.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
