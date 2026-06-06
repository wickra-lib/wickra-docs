# KylesLambda

> The rolling OLS slope of mid-price changes on signed trade volume —
> Kyle's λ, the canonical measure of price impact and market depth.
> Big λ means a thin book that moves per unit traded; small λ a deep one.

## Quick reference

| Item                | Value                                                          |
|---------------------|----------------------------------------------------------------|
| Family              | Microstructure                                                 |
| Input type          | `TradeQuote` — a trade plus the mid prevailing at execution    |
| Output type         | `f64` (price move per unit signed volume)                      |
| Output range        | unbounded; usually `≥ 0`                                       |
| Default parameters  | `window` required (`≥ 2`)                                      |
| Warmup period       | `window + 1`                                                   |
| Interpretation      | Price impact / market depth                                    |

## Formula

```
q      = size · D                       (signed volume, D = aggressor sign)
Δmid   = midₜ − midₜ₋₁
cov    = (1/n) · Σ q·Δmid − q̄·Δ̄mid
var    = (1/n) · Σ q²      − q̄²
λ      = cov / var
```

The rolling OLS slope of `Δmid` regressed on `q` over the trailing `window`
paired observations. Four running sums keep each update O(1). See
`crates/wickra-core/src/indicators/kyles_lambda.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `window` | `usize` | none    | `≥ 2`      | Rolling number of `(Δmid, signed-volume)` pairs. |

## Inputs / Outputs

`Indicator<Input = TradeQuote, Output = f64>`. Bindings:
`update(price, size, is_buy, mid)`. Python / Node `batch` take four equal-length
arrays and return a 1-D array (NaN during warmup). WASM streaming-only.

## Warmup

`warmup_period() == window + 1`: one trade-quote seeds the previous mid, then
`window` paired observations fill the regression.

## Edge cases

- **Constant signed volume.** Zero variance in the regressor; λ is undefined and
  the indicator returns `0` rather than `NaN`.
- **Negative λ.** Possible but unusual; signals mid moves opposite to flow over
  the window (mean-reverting microstructure or mislabelled aggressor).
- **Window below 2.** Rejected at construction.

## Examples

### Rust

```rust
use wickra::{Indicator, KylesLambda, Side, Trade, TradeQuote};

// A book that moves 0.5 per unit of signed volume gives λ = 0.5.
let mut lambda = KylesLambda::new(8).unwrap();
let mut mid = 100.0;
let mut last = None;
for i in 0..20 {
    let side = if i % 2 == 0 { Side::Buy } else { Side::Sell };
    let size = 1.0 + f64::from(i % 3);
    mid += 0.5 * size * side.sign();
    let trade = Trade::new(mid, size, side, 0).unwrap();
    last = lambda.update(TradeQuote::new(trade, mid).unwrap());
}
assert!((last.unwrap() - 0.5).abs() < 1e-9);
```

### Python

```python
import wickra as ta

kl = ta.KylesLambda(50)
# feed (price, size, is_buy, mid) per trade; reads price impact per unit flow
```

### Node

```js
const { KylesLambda } = require('wickra');
const kl = new KylesLambda(50);
// kl.update(price, size, isBuy, mid)
```

## Interpretation

Kyle's λ is the slope of the price-impact line — how far the mid moves per unit
of net order flow. It is the canonical inverse of market depth.

- **Large λ.** A thin, fragile book: a small signed order shifts the mid a lot.
  Trading into it is expensive and impact-dominated.
- **Small λ.** A deep, resilient book: it absorbs size with little mid
  movement. The cheap regime for execution.
- **Rising intraday.** Liquidity is evaporating — λ climbs ahead of scheduled
  events and in stress, then recovers afterwards. Watching its trajectory is a
  practical liquidity-risk gauge.

λ is the empirical analogue of the depth parameter in Kyle's insider-trading
model; Amihud's illiquidity ratio is the daily, low-frequency cousin.

## Common pitfalls

- **Not scale-free.** λ has units of price per unit volume, so its magnitude
  depends on tick size and contract size. Compare it only across comparable
  instruments and size conventions — never as a bare cross-asset number.
- **Window tuning.** Too short and the regression is noisy; too long and it
  blurs regime changes. Match the window to your trade rate, not a fixed clock.
- **Signed-flow quality.** λ regresses Δmid on *signed* volume; a mislabelled
  aggressor flag corrupts the regressor and can even flip λ negative. Sign
  trades reliably (tick/quote rule) before feeding them in.

## References

- Albert S. Kyle, *Continuous Auctions and Insider Trading*, *Econometrica*,
  1985 — the original λ as the price-impact / depth parameter.
- Yakov Amihud, *Illiquidity and Stock Returns*, *Journal of Financial
  Markets*, 2002 — the daily illiquidity ratio, a low-frequency λ.
- Joel Hasbrouck, *Empirical Market Microstructure*, 2007 — estimating price
  impact from trade-and-quote data.

## See also

- [RealizedSpread](/Indicators/Indicator-RealizedSpread) — effective spread minus the
  impact λ measures.
- [DepthSlope](/Indicators/Indicator-DepthSlope) — depth read from the resting book instead
  of from executed flow.
- [Microprice](/Indicators/Indicator-Microprice) — fair value tilted by book imbalance.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
