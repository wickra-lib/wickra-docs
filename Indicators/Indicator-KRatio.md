# KRatio

> Kestner's consistency score — the slope of the cumulative-return curve divided by
> the standard error of that slope.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Risk / Performance |
| Input type | `f64` (per-period returns) |
| Output type | `f64` |
| Output range | unbounded (sign follows the equity-curve slope) |
| Default parameters | `(period = 30)` (Python) |
| Warmup period | `period` |
| Interpretation | Higher = steadier upward equity curve. |

## Formula

```
equity_t   = Σ_{i<=t} return_i            (cumulative curve, t = 1..period)
slope, b0  = OLS(equity_t ~ t)
SE(slope)  = sqrt( (Σ residual² / (period − 2)) / Σ(t − t̄)² )
K-Ratio    = slope / SE(slope)
```

The K-Ratio fits a least-squares trend line through the cumulative-return curve and
reports the trend's *t-statistic*. A steep slope with little scatter (a smooth,
straight climb) scores high; the same total return earned in a few lucky jumps
scatters the residuals, inflates the standard error, and scores lower. This is
Kestner's original 1996 form. Later revisions scale by the period count
(`slope / (SE · period)` in 2003, `slope / (SE · √period)` in 2013) — apply that
downstream when comparing across window lengths. A perfectly linear window has zero
residual scatter, so the slope's standard error is zero and the ratio is undefined;
the indicator reports `0.0`. Source: `crates/wickra-core/src/indicators/k_ratio.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `30` (Python) | `>= 3`      | `k_ratio.rs:66` | Window of returns. `< 3` errors with `Error::InvalidPeriod` (the SE divides by `period − 2`). |

The `period` getter returns the window.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/k_ratio.rs`:

```rust
use wickra::{Indicator, KRatio};
// KRatio: Input = f64, Output = f64
const _: fn(&mut KRatio, f64) -> Option<f64> = <KRatio as Indicator>::update;
```

An `f64` return in, an `Option<f64>` out. Python `update(ret)` / `batch(returns)`
(NaN warmup); Node `update(ret)` / `batch(returns[])` (null warmup).

## Warmup

`warmup_period() == period`. The first value lands once `period` returns are seen
(`reference_value` exercises the emission at index `period − 1`).

## Edge cases

- **Reference value.** `[0.01, 0.02, 0.03]` → equity `[0.01, 0.03, 0.06]`,
  slope `0.025`, K-Ratio `5√3 ≈ 8.660254` (`reference_value` pins this).
- **Constant returns.** A perfectly linear curve is degenerate and reports `0.0`
  (`constant_returns_are_degenerate_zero` pins this).
- **Rising curve.** A noisy but upward window reports `> 0` (`rising_curve_is_positive`).
- **Non-finite input.** A NaN/∞ return is skipped (`ignores_non_finite_input`).
- **Reset.** `kr.reset()` clears the window (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, KRatio};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut kr = KRatio::new(3)?;
    let out = kr.batch(&[0.01, 0.02, 0.03]);
    println!("{:?}", out[2]); // Some(8.660254...)
    Ok(())
}
```

Output:

```
Some(8.660254037844387)
```

### Python

```python
import numpy as np
import wickra as ta

kr = ta.KRatio(30)
returns = 0.001 + np.random.randn(60) * 0.01
print(kr.batch(returns)[-1])
```

### Node

```javascript
const ta = require('wickra');
const kr = new ta.KRatio(3);
console.log(kr.batch([0.01, 0.02, 0.03]).at(-1)); // ~8.66
```

### Streaming

```rust
use wickra::{Indicator, KRatio};

let mut kr = KRatio::new(30).unwrap();
for r in daily_returns {
    if let Some(k) = kr.update(r) {
        // larger k -> straighter, steadier equity growth
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Consistency, not magnitude.** Two strategies with the same return rank by
   smoothness — the K-Ratio rewards the one whose curve hugs its trend line.
2. **Drawdown early-warning.** A falling K-Ratio while the equity still rises means
   the climb is getting choppier — often a precursor to a drawdown.
3. **Cross-window comparison.** Because the raw 1996 form grows with the window,
   apply the period scaling before comparing 30-bar and 250-bar K-Ratios.

## Common pitfalls

- **Needs dispersion.** Constant or near-constant returns make the curve linear and
  the ratio degenerate (`0.0`) — feed real, noisy returns.
- **Version confusion.** This is the 1996 `slope / SE` form; cite the variant when
  comparing against other libraries.
- **Sign.** The K-Ratio is negative for a declining equity curve — read the sign,
  not just the magnitude.

## References

Kestner, L. N. (1996), *Getting a Handle on True Performance* — the K-Ratio;
revised in *Quantitative Trading Strategies* (2003) and a 2013 errata.

## See also

- [Indicator-SharpeRatio](/Indicators/Indicator-SharpeRatio) — mean over total volatility.
- [Indicator-LinearRegression](/Indicators/Indicator-LinearRegression) — the underlying OLS trend fit.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
