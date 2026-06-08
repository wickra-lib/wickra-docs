# SterlingRatio

> Return per unit of *typical* pain — mean return over the average drawdown of the
> compounded equity curve.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Risk / Performance |
| Input type | `f64` (per-period returns) |
| Output type | `f64` |
| Output range | unbounded (negative for net-losing windows) |
| Default parameters | `(period = 36)` (Python) |
| Warmup period | `period` |
| Interpretation | Higher = more return per average drawdown. |

## Formula

```
equity_t  = Π_{i<=t} (1 + return_i)          (compounded curve)
peak_t    = max_{s<=t} equity_s
dd_t      = (peak_t − equity_t) / peak_t      (fractional drawdown, >= 0)
Sterling  = mean(returns) / mean(dd_t)
```

The Sterling Ratio divides the average per-period return by the **average
drawdown** along the compounded equity curve. Of Wickra's three drawdown-based
ratios it is the gentlest on outliers: averaging the drawdowns means one deep
crater does not dominate, unlike the [`BurkeRatio`](/Indicators/Indicator-BurkeRatio)
(which sums *squared* drawdowns) or the [`MartinRatio`](/Indicators/Indicator-MartinRatio)
(which uses the root-mean-square *percentage* drawdown). A window that never draws
down has zero average drawdown and reports `0.0`. Source:
`crates/wickra-core/src/indicators/sterling_ratio.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `36` (Python) | `>= 2`      | `sterling_ratio.rs:50` | Window of returns (e.g. 36 months). `< 2` errors with `Error::InvalidPeriod`. |

The `period` getter returns the window.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/sterling_ratio.rs`:

```rust
use wickra::{Indicator, SterlingRatio};
// SterlingRatio: Input = f64, Output = f64
const _: fn(&mut SterlingRatio, f64) -> Option<f64> = <SterlingRatio as Indicator>::update;
```

An `f64` return in, an `Option<f64>` out. Python `update(ret)` / `batch(returns)`
(NaN warmup); Node `update(ret)` / `batch(returns[])` (null warmup).

## Warmup

`warmup_period() == period`. The first value lands once `period` returns are seen
(`reference_value` exercises the emission at index `period − 1`).

## Edge cases

- **Reference value.** `[0.1, −0.1, 0.1]` → drawdowns `[0, 0.1, 0.01]`,
  `(0.1/3) / (0.11/3) = 0.1/0.11` (`reference_value` pins this).
- **No drawdown.** A monotonically rising window reports `0.0`
  (`no_drawdown_is_zero` pins this).
- **Losing window.** A net-losing window gives a negative ratio
  (`losing_window_is_negative` pins this).
- **Non-finite input.** A NaN/∞ return is skipped (`ignores_non_finite_input`).
- **Reset.** `sr.reset()` clears the window (`reset_clears_state` pins this).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, SterlingRatio};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut sr = SterlingRatio::new(3)?;
    let out = sr.batch(&[0.1, -0.1, 0.1]);
    println!("{:?}", out[2]); // Some(0.9090...)
    Ok(())
}
```

Output:

```
Some(0.9090909090909091)
```

### Python

```python
import numpy as np
import wickra as ta

sr = ta.SterlingRatio(36)
returns = np.random.randn(60) * 0.05
print(sr.batch(returns)[-1])
```

### Node

```javascript
const ta = require('wickra');
const sr = new ta.SterlingRatio(3);
console.log(sr.batch([0.1, -0.1, 0.1]).at(-1)); // ~0.909
```

### Streaming

```rust
use wickra::{Indicator, SterlingRatio};

let mut sr = SterlingRatio::new(36).unwrap();
let monthly_returns: Vec<f64> = Vec::new(); // your live stream
for r in monthly_returns {
    if let Some(ratio) = sr.update(r) {
        // higher ratio -> more return per average drawdown
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Smoothness reward.** The Sterling Ratio favours strategies whose equity grinds
   higher with shallow, frequent dips over those with rare but brutal crashes.
2. **The drawdown family.** Read it next to the [`BurkeRatio`](/Indicators/Indicator-BurkeRatio)
   and [`MartinRatio`](/Indicators/Indicator-MartinRatio): a high Sterling but low
   Burke flags that the average drawdown is benign while a few are severe.
3. **Classic definition note.** The original Sterling Ratio used the average of the
   *largest annual* drawdowns; this rolling form averages every per-period drawdown
   in the window — comparable in spirit, simpler to stream.

## Common pitfalls

- **No-drawdown anomaly.** A window that only rises reports `0.0` (undefined), not
  infinity.
- **Frequency.** `mean(returns)` is per-period — annualise consistently if you quote
  an annualised Sterling Ratio.
- **Outlier blindness.** Because it averages drawdowns, a single catastrophic
  drawdown is under-weighted — pair with Burke/Martin to catch tail risk.

## References

Deane Sterling Jones; popularised via Kestner, L. N., *Quantitative Trading
Strategies* (2003) — the Sterling Ratio.

## See also

- [Indicator-BurkeRatio](/Indicators/Indicator-BurkeRatio) — sum of squared drawdowns.
- [Indicator-MartinRatio](/Indicators/Indicator-MartinRatio) — return over the Ulcer Index.
- [Indicator-SharpeRatio](/Indicators/Indicator-SharpeRatio) — mean over total volatility.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
