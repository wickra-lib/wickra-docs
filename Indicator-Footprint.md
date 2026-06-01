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

A footprint exposes the intrabar auction: which prices traded the most volume
(the point of control), and whether buyers or sellers were the aggressors at
each level. Imbalances between a bucket's bid and ask volume flag absorption and
exhaustion that the bar's open/high/low/close cannot show. Reset per bar to get
the classic bid/ask footprint chart.

## Pitfalls

- Choose `tick_size` to match the instrument's real tick; too fine fragments
  volume across buckets, too coarse blurs the profile.
- Remember to `reset()` per bar — otherwise the profile is cumulative over the
  whole session.

## See also

- [SignedVolume](Indicator-SignedVolume) — per-trade signed size.
- [CumulativeVolumeDelta](Indicator-CumulativeVolumeDelta) — running net flow.
- [TradeImbalance](Indicator-TradeImbalance) — rolling buy/sell imbalance.
