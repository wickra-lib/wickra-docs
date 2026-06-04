# AmihudIlliquidity

> The average absolute log return per unit of traded value over the last
> `period` trades — the classic price-impact liquidity proxy (Amihud, 2002).

## Quick reference

| Field | Value |
|-------|-------|
| Family | Microstructure |
| Input type | `Trade` |
| Output type | `f64` |
| Output range | `>= 0` |
| Default parameters | `period` is required |
| Warmup period | `period + 1` |
| Interpretation | High = illiquid (small volume moves price a lot); low = deep / liquid. |

## Formula

```
rₜ      = ln(priceₜ / priceₜ₋₁)
ILLIQₜ  = |rₜ| / (priceₜ · sizeₜ)        (return per unit of traded value)
Amihud  = mean of ILLIQ over the last `period` trades
```

Amihud's measure captures how much the price moves for a given amount of traded
value: a **high** reading means small volume already shifts the price a lot (an
illiquid, easily-moved market), a **low** reading means it takes large volume to
move the price (a deep, liquid market).

Source: `crates/wickra-core/src/indicators/amihud_illiquidity.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= 1`      | `amihud_illiquidity.rs:50` | Window of trades. `0` errors with `Error::PeriodZero`. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/amihud_illiquidity.rs`:

```rust
use wickra::{AmihudIlliquidity, Indicator, Trade};
// AmihudIlliquidity: Input = Trade, Output = f64
const _: fn(&mut AmihudIlliquidity, Trade) -> Option<f64> =
    <AmihudIlliquidity as Indicator>::update;
```

Node `update(price, size, isBuy)` and `batch(price[], size[], isBuy[])`; Python
`update(price, size, is_buy)` and `batch(price, size, is_buy)` → 1-D `ndarray`.
(The aggressor side is accepted for a uniform trade API but does not affect the
value.)

## Warmup

`warmup_period() == period + 1`: one trade seeds the previous-price reference,
then `period` ratios fill the window. The unit test `accessors_and_metadata`
pins `warmup_period() == 21` for `period = 20`.

## Edge cases

- **Reference value.** For a `100 → 101` move on size 10:
  `|ln(101/100)| / (101 · 10)`; pinned by `known_value`.
- **Liquidity monotonicity.** The same price move on smaller volume gives a larger
  reading; pinned by `higher_for_thinner_volume`.
- **Flat price.** Zero return → zero illiquidity; pinned by `flat_price_is_zero`.
- **Zero-size trades.** Skipped (no traded value); the reference price is kept;
  pinned by `skips_zero_size_trades`.
- **Non-negativity.** Output is `>= 0`; pinned by `output_is_non_negative`.

## Examples

### Rust

```rust
use wickra::{AmihudIlliquidity, Indicator, Side, Trade};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut a = AmihudIlliquidity::new(1)?;
    a.update(Trade::new(100.0, 10.0, Side::Buy, 0)?); // None (seeds reference)
    println!("{:?}", a.update(Trade::new(101.0, 10.0, Side::Buy, 0)?));
    Ok(())
}
```

Output:

```
Some(0.000009851812725909002)
```

`|ln(101/100)| / (101 · 10) ≈ 9.85e-6`.

### Python

```python
import wickra as ta

a = ta.AmihudIlliquidity(1)
print(a.update(100.0, 10.0, True))   # None
print(a.update(101.0, 10.0, True))   # ~9.85e-6
```

Output:

```
None
9.851812725909002e-06
```

### Node

```javascript
const ta = require('wickra');
const a = new ta.AmihudIlliquidity(1);
a.update(100, 10, true); // null
console.log(a.update(101, 10, true));
```

Output:

```
0.000009851812725909002
```

## Interpretation

`AmihudIlliquidity` is the workhorse cross-sectional liquidity proxy: it rises
when price impact per traded value rises (thin, easily-moved markets) and falls
in deep markets. Use it to rank instruments by liquidity or to gate position size
(scale down as illiquidity climbs). Complements the spread-based measures
([RollMeasure](Indicator-RollMeasure), [QuotedSpread](Indicator-QuotedSpread)) and
flow toxicity ([Vpin](Indicator-Vpin)).

## Common pitfalls

- **Scale.** Raw Amihud values are tiny (return over dollar-volume); researchers
  often report `ILLIQ × 1e6`. Scale yourself for readability.
- **Per-trade vs daily.** The classic Amihud measure aggregates daily; this is a
  per-trade streaming version — compare like with like.

## References

Amihud, "Illiquidity and Stock Returns: Cross-Section and Time-Series Effects"
(2002).

## See also

- [Indicator-RollMeasure](Indicator-RollMeasure) — spread from price-change covariance.
- [Indicator-Vpin](Indicator-Vpin) — flow toxicity.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
