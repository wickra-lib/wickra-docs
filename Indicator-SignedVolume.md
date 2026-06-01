# SignedVolume

> A trade's size signed by its aggressor: `+size` for a buy, `−size`
> for a sell. The atom of order-flow analysis.

## Quick reference

| Item                | Value                                                          |
|---------------------|----------------------------------------------------------------|
| Family              | Microstructure                                                 |
| Input type          | `Trade` — an executed trade with an aggressor side             |
| Output type         | `f64`                                                          |
| Output range        | unbounded; sign follows the aggressor                          |
| Default parameters  | none                                                           |
| Warmup period       | `1`                                                            |
| Interpretation      | Per-trade order flow                                           |

## Formula

```
signedVolume = size · (+1 if buy, −1 if sell)
```

Stateless, O(1). See `crates/wickra-core/src/indicators/signed_volume.rs`.

## Parameters

None. Construct with `SignedVolume::new()`.

## Inputs / Outputs

`Indicator<Input = Trade, Output = f64>`. Bindings:
`update(price, size, is_buy)` (`is_buy = true` for a buyer-initiated trade).
Python / Node `batch` take three equal-length arrays `(price, size, is_buy)` →
1-D array. WASM streaming-only.

## Warmup

`warmup_period() == 1`.

## Edge cases

- **Zero size.** Emits `0`.
- The price is carried for validation only; the output depends on size and side.

## Examples

### Rust

```rust
use wickra::{Indicator, SignedVolume, Side, Trade};

let mut sv = SignedVolume::new();
assert_eq!(sv.update(Trade::new(100.0, 2.0, Side::Buy, 0).unwrap()), Some(2.0));
assert_eq!(sv.update(Trade::new(100.0, 3.0, Side::Sell, 1).unwrap()), Some(-3.0));
```

### Python

```python
import wickra as ta
print(ta.SignedVolume().update(100.0, 2.0, True))   # 2.0
print(ta.SignedVolume().update(100.0, 3.0, False))  # -3.0
```

### Node

```js
const { SignedVolume } = require('wickra');
console.log(new SignedVolume().update(100, 2, true)); // 2
```

## Interpretation

Signed volume is the atom of order-flow analysis — it turns a raw trade tape
into a stream of net aggression.

- **Positive.** A buyer-initiated trade lifted the offer; demand paid up.
- **Negative.** A seller-initiated trade hit the bid; supply pressed down.
- **Magnitude.** The size of the aggression, not just its direction — a large
  signed print is a more meaningful imprint than a small one.

On its own it is the per-trade building block: summing it gives
[CumulativeVolumeDelta](Indicator-CumulativeVolumeDelta); windowing and
normalising it gives [TradeImbalance](Indicator-TradeImbalance); bucketing it by
price gives the [Footprint](Indicator-Footprint).

## Common pitfalls

- **Aggressor flag is everything.** The sign is only as reliable as the buy/sell
  label. If your feed lacks one, infer it (tick rule / quote rule) before
  feeding trades in — a wrong flag silently inverts every downstream flow
  measure.
- **One print is noise.** A single signed trade rarely means anything; the
  signal lives in the *aggregate* (CVD, imbalance), not the individual atom.
- **Zero size emits `0`.** Defensive against degenerate prints, but it means an
  all-zero stream is indistinguishable from balanced flow.

## References

- Charles M. C. Lee and Mark J. Ready, *Inferring Trade Direction from Intraday
  Data*, *Journal of Finance*, 1991 — the tick and quote rules for signing.
- Joel Hasbrouck, *Empirical Market Microstructure*, 2007 — signed order flow
  as the driver of price discovery.

## See also

- [CumulativeVolumeDelta](Indicator-CumulativeVolumeDelta) — the running sum of
  signed volume.
- [TradeImbalance](Indicator-TradeImbalance) — its bounded, windowed
  normalisation.
- [Footprint](Indicator-Footprint) — signed volume resolved by price level.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
