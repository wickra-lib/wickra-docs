# LiquidationFeatures

> A multi-output breakdown of the long- and short-side liquidation notional on
> each tick into net, total and a bounded imbalance — model-ready liquidation
> features for cascade risk.

## Quick reference

| Item                | Value                                                          |
|---------------------|----------------------------------------------------------------|
| Family              | Derivatives                                                    |
| Input type          | `DerivativesTick` — a perp / futures market tick               |
| Output type         | `LiquidationFeaturesOutput` — `{ long, short, net, total, imbalance }` |
| Output range        | `imbalance ∈ [−1, +1]`; the rest `≥ 0` / signed               |
| Default parameters  | none                                                           |
| Warmup period       | `1`                                                            |
| Interpretation      | Liquidation-cascade stress and side                         |

## Formula

```
net       = longLiquidation − shortLiquidation
total     = longLiquidation + shortLiquidation
imbalance = net / total                      (0 when total == 0)
```

Stateless and O(1). See
`crates/wickra-core/src/indicators/liquidation_features.rs`.

## Parameters

None. Construct with `LiquidationFeatures::new()`.

## Inputs / Outputs

`Indicator<Input = DerivativesTick, Output = LiquidationFeaturesOutput>`. A
multi-output indicator: the bindings expose the two fields it reads,
`update(long_liquidation, short_liquidation)`, and return the feature vector:

- **Python** — `update` returns a 5-tuple `(long, short, net, total, imbalance)`
  or `None`; `batch(long_liquidation, short_liquidation)` returns an `(n, 5)`
  array.
- **Node** — `update` returns `{ long, short, net, total, imbalance }`;
  `batch` returns a flat `Float64Array` of length `n · 5` (row-major).
- **WASM** — `update` returns the object with camelCase keys; streaming-only.

## Warmup

`warmup_period() == 1`; emits on the first tick.

## Edge cases

- **No liquidation.** When `total == 0` the imbalance is `0` (no division by
  zero); `net` and `total` are also `0`.
- **One-sided cascade.** An all-long flush reads `imbalance == +1`, an all-short
  squeeze `−1`.

## Examples

### Rust

```rust
use wickra::{DerivativesTick, Indicator, LiquidationFeatures};

fn tick(long_liq: f64, short_liq: f64) -> DerivativesTick {
    DerivativesTick::new(
        0.0, 100.0, 100.0, 100.0, 0.0, 0.0, 0.0, 0.0, 0.0, long_liq, short_liq, 0,
    )
    .unwrap()
}

let mut liq = LiquidationFeatures::new();
let out = liq.update(tick(30.0, 10.0)).unwrap();
assert_eq!((out.net, out.total, out.imbalance), (20.0, 40.0, 0.5));
```

### Python

```python
import wickra as ta

liq = ta.LiquidationFeatures()
print(liq.update(30.0, 10.0))  # (30.0, 10.0, 20.0, 40.0, 0.5)
```

### Node

```js
const { LiquidationFeatures } = require('wickra');

const liq = new LiquidationFeatures();
const out = liq.update(30, 10);
console.log(out.net, out.total, out.imbalance); // 20 40 0.5
```

## Interpretation

Liquidation cascades are a perpetual-specific tail risk: a wave of long
liquidations forces market sells that beget more liquidations. `total` sizes the
stress; `imbalance` (and its sign) says which side is being flushed — positive
for a long cascade (downside), negative for a short squeeze (upside). Spikes in
`total` with a strong `imbalance` mark the violent legs of a move.

## Common pitfalls

- **Per-tick, not cumulative.** Each reading is one tick's liquidation flow;
  aggregate a window yourself for a cascade-intensity measure.
- **Notional units.** Feed long and short liquidations in the same unit
  (notional or contracts) so `net` and `imbalance` are meaningful.

## See also

- [TakerBuySellRatio](Indicator-TakerBuySellRatio) — aggressive flow that often
  accompanies cascades.
- [OpenInterestDelta](Indicator-OpenInterestDelta) — positioning unwind.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
