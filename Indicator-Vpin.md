# Vpin

> Volume-Synchronised Probability of Informed Trading — order-flow toxicity from
> volume-bucketed buy/sell imbalance (Easley, López de Prado & O'Hara, 2012).

## Quick reference

| Field | Value |
|-------|-------|
| Family | Microstructure |
| Input type | `Trade` |
| Output type | `f64` |
| Output range | `[0, 1]` |
| Default parameters | `bucket_volume` (`> 0`) and `num_buckets` (`>= 1`) are required |
| Warmup period | `num_buckets` (nominal; data-dependent) |
| Interpretation | Near `1` = one-sided, likely-informed (toxic) flow; near `0` = balanced. |

## Formula

Trades are bucketed into equal-volume buckets of size `bucket_volume`. For each
completed bucket the order-flow imbalance is `|Vᴮ − Vˢ|` (buy minus sell volume);
VPIN averages it over the last `num_buckets` buckets, normalised by the bucket
size:

```
VPIN = ( Σ |Vᴮ_τ − Vˢ_τ| ) / (num_buckets · bucket_volume)
```

The aggressor `Side` of each trade classifies its volume directly. A single
trade may span several buckets; its volume is split across boundaries. Values
near `1` signal a strongly one-sided flow (a toxic regime).

Source: `crates/wickra-core/src/indicators/vpin.rs`.

## Parameters

| Name            | Type    | Default | Valid range | Source | Description |
|-----------------|---------|---------|-------------|--------|-------------|
| `bucket_volume` | `f64`   | none    | finite `> 0` | `vpin.rs:62` | Volume per bucket. Non-finite / `<= 0` errors with `Error::InvalidParameter`. |
| `num_buckets`   | `usize` | none    | `>= 1`      | `vpin.rs:62` | Number of buckets averaged. `0` errors with `Error::PeriodZero`. |

(The Python class is `wickra.Vpin(bucket_volume, num_buckets)`.)

## Inputs / Outputs

From `crates/wickra-core/src/indicators/vpin.rs`:

```rust
use wickra::{Indicator, Trade, Vpin};
// Vpin: Input = Trade, Output = f64
const _: fn(&mut Vpin, Trade) -> Option<f64> = <Vpin as Indicator>::update;
```

Node `update(price, size, isBuy)` and `batch(price[], size[], isBuy[])`; Python
`update(price, size, is_buy)` and `batch(price, size, is_buy)` → 1-D `ndarray`.

## Warmup

Readiness is volume-driven, so `warmup_period() == num_buckets` is a *nominal*
minimum (one trade per bucket); `is_ready()` reflects the true bucket count. The
unit test `accessors_and_metadata` pins `warmup_period() == 50` for
`num_buckets = 50`.

## Edge cases

- **One-sided flow.** Pure-buy buckets give `|Vᴮ − Vˢ| = bucket_volume` → VPIN
  `1`; pinned by `one_sided_flow_is_one`.
- **Balanced flow.** Equal buy/sell volume per bucket gives VPIN `0`; pinned by
  `balanced_flow_is_zero`.
- **Bucket splitting.** A single large trade fills multiple buckets; pinned by
  `large_trade_spans_multiple_buckets`.
- **Zero-size trade.** A no-op; pinned by `zero_size_trade_is_noop`.
- **Bounds.** Output is always in `[0, 1]`; pinned by `output_within_bounds`.

## Examples

### Rust

```rust
use wickra::{Indicator, Side, Trade, Vpin};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut vpin = Vpin::new(10.0, 2)?;
    let mut last = None;
    for _ in 0..4 {
        last = vpin.update(Trade::new(100.0, 5.0, Side::Buy, 0)?);
    }
    println!("{:?}", last);
    Ok(())
}
```

Output:

```
Some(1.0)
```

### Python

```python
import wickra as ta

vpin = ta.Vpin(10.0, 2)
last = None
for _ in range(4):
    last = vpin.update(100.0, 5.0, True)  # buys
print(last)
```

Output:

```
1.0
```

### Node

```javascript
const ta = require('wickra');
const vpin = new ta.Vpin(10, 2);
let last;
for (let i = 0; i < 4; i++) last = vpin.update(100, 5, true);
console.log(last);
```

Output:

```
1
```

## Interpretation

VPIN measures order-flow *toxicity*: persistently one-sided volume (high VPIN)
is the signature of informed traders running over liquidity, and tends to precede
adverse selection and volatility spikes. Choose `bucket_volume` near a typical
trade-cluster size and `num_buckets` to set the smoothing horizon. Pair with
[OrderFlowImbalance](Indicator-OrderFlowImbalance) (quote-side pressure) and
[AmihudIlliquidity](Indicator-AmihudIlliquidity) (price impact).

## Common pitfalls

- **Aggressor side required.** Each trade carries its `Side`; pass `is_buy`
  correctly (buyer-initiated = `true`). If your feed lacks side, classify it
  (e.g. tick rule) before feeding.
- **Volume, not count.** Buckets close on cumulative *volume*, not trade count;
  `warmup_period()` is therefore only a nominal lower bound.

## References

Easley, López de Prado & O'Hara, "Flow Toxicity and Liquidity in a High-Frequency
World" (2012).

## See also

- [Indicator-OrderFlowImbalance](Indicator-OrderFlowImbalance) — quote-side pressure.
- [Indicator-TradeImbalance](Indicator-TradeImbalance) — signed-volume imbalance.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
