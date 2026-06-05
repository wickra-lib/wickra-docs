# RollMeasure

> The effective bid-ask spread implied by the negative first-order serial
> covariance of trade-price changes (Roll, 1984).

## Quick reference

| Field | Value |
|-------|-------|
| Family | Microstructure |
| Input type | `Trade` (price is used) |
| Output type | `f64` |
| Output range | `>= 0` |
| Default parameters | `period` is required (`>= 3`) |
| Warmup period | `period + 1` |
| Interpretation | Larger = wider implied spread; `0` on a trending / frictionless tape. |

## Formula

```
Δpₜ    = priceₜ − priceₜ₋₁
γ      = sample lag-1 autocovariance of Δp over the last `period` changes
spread = 2 · √(−γ)   if γ < 0,   else 0
```

Roll's insight: in a frictionless market price changes are serially
uncorrelated, but the *bid-ask bounce* — trades alternating between buying at the
ask and selling at the bid — induces a **negative** autocovariance whose
magnitude pins the spread. The measure recovers an effective spread from trade
prices alone, with no quote data. When the serial covariance is non-negative the
model implies no spread and the indicator returns `0`.

Source: `crates/wickra-core/src/indicators/roll_measure.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= 3`      | `roll_measure.rs:56` | Window of price changes. `< 3` errors with `Error::InvalidPeriod`. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/roll_measure.rs`:

```rust
use wickra::{Indicator, RollMeasure, Trade};
// RollMeasure: Input = Trade, Output = f64
const _: fn(&mut RollMeasure, Trade) -> Option<f64> = <RollMeasure as Indicator>::update;
```

Node `update(price, size, isBuy)` and `batch(price[], size[], isBuy[])`; Python
`update(price, size, is_buy)` and `batch(price, size, is_buy)` → 1-D `ndarray`.
(Size and side are accepted for a uniform trade API but only the price is used.)

## Warmup

`warmup_period() == period + 1`: one trade seeds the previous price, then
`period` changes fill the window. The unit test `accessors_and_metadata` pins
`warmup_period() == 21` for `period = 20`.

## Edge cases

- **Bid-ask bounce.** Prices bouncing `100/101` give `Δp` alternating `+1/−1`,
  autocovariance `−1`, so spread `2`; pinned by `bid_ask_bounce_implies_spread`.
- **Trending prices.** Monotone prices give constant `Δp` (non-negative
  covariance) → spread `0`; pinned by `trending_prices_imply_no_spread`.
- **Non-negativity.** Output is `>= 0`; pinned by `output_is_non_negative`.
- **Reset.** `reset()` clears the price reference and the change window.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, RollMeasure, Side, Trade};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut roll = RollMeasure::new(6)?;
    let prices: Vec<Trade> = (0..20)
        .map(|i| Trade::new(if i % 2 == 0 { 100.0 } else { 101.0 }, 1.0, Side::Buy, 0).unwrap())
        .collect();
    println!("{:?}", roll.batch(&prices).into_iter().flatten().last());
    Ok(())
}
```

Output:

```
Some(2.0)
```

### Python

```python
import wickra as ta

roll = ta.RollMeasure(6)
last = None
for i in range(20):
    last = roll.update(100.0 if i % 2 == 0 else 101.0, 1.0, True)
print(last)
```

Output:

```
2.0
```

### Node

```javascript
const ta = require('wickra');
const roll = new ta.RollMeasure(6);
let last = null;
for (let i = 0; i < 20; i++) last = roll.update(i % 2 === 0 ? 100 : 101, 1, true);
console.log(last);
```

Output:

```
2
```

## Interpretation

`RollMeasure` recovers a transaction-cost proxy from trade prices when you have
no quotes: a wider implied spread means higher round-trip cost and a bouncier
tape. It is `0` for trending or frictionless series (no bid-ask bounce to detect).
Use it alongside quote-based spreads ([QuotedSpread](/Indicators/Indicator-QuotedSpread),
[EffectiveSpread](/Indicators/Indicator-EffectiveSpread)) when only the tape is available, and
with [AmihudIlliquidity](/Indicators/Indicator-AmihudIlliquidity) for the price-impact side.

## Common pitfalls

- **Zero is informative.** A `0` reading is not a failure: it means the recent
  serial covariance is non-negative (trending tape), so Roll's model implies no
  spread.
- **Needs a bouncing tape.** On strongly trending data the measure under-reports
  the true spread — that is a known limitation of the estimator, not a bug.

## References

Roll, "A Simple Implicit Measure of the Effective Bid-Ask Spread in an Efficient
Market" (1984).

## See also

- [Indicator-QuotedSpread](/Indicators/Indicator-QuotedSpread) — quote-based spread.
- [Indicator-EffectiveSpread](/Indicators/Indicator-EffectiveSpread) — trade-vs-mid spread.
- [Indicator-AmihudIlliquidity](/Indicators/Indicator-AmihudIlliquidity) — price-impact liquidity.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
