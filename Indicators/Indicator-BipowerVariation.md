# BipowerVariation

> Realized Bipower Variation — a jump-robust estimator of integrated variance
> built from products of *adjacent* absolute log returns instead of squares.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Volatility & Bands |
| Input type | `f64` (single close) |
| Output type | `f64` |
| Output range | `[0, ∞)` (variance scale) |
| Default parameters | `(period = 20)` (Python) |
| Warmup period | `period + 1` |
| Interpretation | Jump-robust integrated variance; compare with realized variance to isolate jumps. |

## Formula

```
r_t = ln(price_t / price_{t−1})
BV  = (π / 2) · Σ |r_t| · |r_{t−1}|   over the window
```

Bipower variation (Barndorff-Nielsen & Shephard 2004) estimates the same
integrated variance as [`RealizedVolatility`](/Indicators/Indicator-RealizedVolatility)'s
`Σ r²`, but multiplies *neighbouring* absolute returns rather than squaring one.
A jump inflates exactly one return; because that return enters a product with its
ordinary neighbour instead of being squared, its contribution stays bounded — so
`BV` is **robust to jumps** while realized variance is not. The constant
`π / 2 = μ₁⁻²` (with `μ₁ = E|Z| = √(2/π)` for a standard normal) debiases the
product of two half-normal magnitudes back to a variance scale. A window of
`period` returns supplies `period − 1` adjacent products. Source:
`crates/wickra-core/src/indicators/bipower_variation.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `20` (Python) | `>= 2`      | `bipower_variation.rs:66` | Number of log returns in the window. `0` errors with `Error::PeriodZero`; `1` with `Error::InvalidPeriod` (an adjacent product needs two returns). |

The `period` getter returns the configured window length.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/bipower_variation.rs`:

```rust
use wickra::{Indicator, BipowerVariation};
// BipowerVariation: Input = f64, Output = f64
const _: fn(&mut BipowerVariation, f64) -> Option<f64> = <BipowerVariation as Indicator>::update;
```

A single `f64` close in, an `Option<f64>` out. Python maps this to
`float | None` / `array.array('d')` (NaN warmup); Node to `number | null` /
`Array<number>` (NaN warmup).

## Warmup

`warmup_period() == period + 1`. The first log return needs a previous price,
and the window must then hold `period` returns — so the first non-`None` output
lands on input `period + 1` (`first_emission_at_warmup_period` pins this).

## Edge cases

- **Single product (`period = 2`).** Two returns give one adjacent product:
  `BV = (π/2)·|r₁|·|r₂|` (`known_value` pins this).
- **Rolling drop.** As the window slides, the oldest adjacent product is removed
  from the running sum (`rolling_window_drops_oldest_product` pins this).
- **Constant / geometric series.** A flat series has all returns `0`, so every
  product — and `BV` — is `0.0` (`constant_series_yields_zero` pins this).
- **Non-positive prices.** A log return is undefined when a price is `<= 0`; such
  ticks are **skipped**, state is left untouched, and the next valid tick
  re-anchors (`skips_non_positive_prices`).
- **Non-negative.** Products of magnitudes are non-negative, so `BV >= 0`
  (`output_is_non_negative` pins this).
- **NaN / infinity inputs.** Non-finite inputs are silently dropped
  (`ignores_non_finite_input`).
- **Reset.** `bv.reset()` clears the previous price, the window and the running
  sum (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, BipowerVariation};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut bv = BipowerVariation::new(2)?;
    let out = bv.batch(&[100.0, 110.0, 99.0]);
    println!("warmup_period = {}", bv.warmup_period());
    println!("{out:?}");
    Ok(())
}
```

Output:

```
warmup_period = 3
[None, None, Some(0.015773826273535296)]
```

`(π/2)·|ln(1.1)|·|ln(0.9)| = 1.5708 · 0.09531 · 0.10536 = 0.015774`.

### Python

```python
import numpy as np
import wickra as ta

bv = ta.BipowerVariation(2)
print(bv.batch(np.array([100.0, 110.0, 99.0])))
print(ta.BipowerVariation(10).batch(np.full(40, 100.0))[-1])  # flat -> 0
```

Output:

```
[       nan        nan 0.01577383]
0.0
```

### Node

```javascript
const ta = require('wickra');

const bv = new ta.BipowerVariation(2);
console.log('warmupPeriod:', bv.warmupPeriod());
console.log(bv.batch([100.0, 110.0, 99.0]));
// -> [NaN, NaN, 0.015773826273535296]
```

### Streaming

```rust
use wickra::{Indicator, BipowerVariation};

let mut bv = BipowerVariation::new(20).unwrap();
let mut last = None;
for i in 0..60 {
    last = bv.update(100.0 + (f64::from(i) * 0.3).sin() * 5.0);
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

Bipower variation is the standard tool for **jump detection** in high-frequency
econometrics. Its power comes from the contrast with realized variance:

1. **Jump test.** Realized variance `RV` captures *all* variation (continuous +
   jumps); `BV` captures only the continuous part. The difference `RV − BV`
   estimates the jump contribution — a large gap flags a jump day.
2. **Robust volatility.** Where realized variance is distorted by a single
   outlier print, `√BV` gives a cleaner volatility estimate of the diffusive
   component.
3. **Realized-volatility decomposition.** Combine with
   [`RealizedVolatility`](/Indicators/Indicator-RealizedVolatility) and
   [`JumpIndicator`](/Indicators/Indicator-JumpIndicator) to separate smooth
   moves from discrete jumps.

The output is on the **variance** scale — take its square root for a volatility,
and multiply by `√trading_periods` to annualise.

## Common pitfalls

- **It is a variance, not a volatility.** Unlike
  [`RealizedVolatility`](/Indicators/Indicator-RealizedVolatility) the output is
  not square-rooted. Take `√BV` for a comparable volatility.
- **Bars must be evenly spaced.** Like all realized measures, the jump-robustness
  argument assumes regularly sampled returns; mixing timeframes breaks it.
- **Small samples are biased.** With few returns the staggered estimator is noisy;
  use a window long enough for the `RV − BV` comparison to be meaningful.

## References

Barndorff-Nielsen, O. E., & Shephard, N. (2004), "Power and Bipower Variation
with Stochastic Volatility and Jumps," *Journal of Financial Econometrics* 2(1),
1–37.

## See also

- [Indicator-RealizedVolatility](/Indicators/Indicator-RealizedVolatility) — the non-robust `Σ r²` counterpart.
- [Indicator-JumpIndicator](/Indicators/Indicator-JumpIndicator) — discrete jump flag from trailing volatility.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
