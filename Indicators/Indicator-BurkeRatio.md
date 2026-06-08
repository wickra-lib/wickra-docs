# BurkeRatio

> Return per unit of *severe* pain — mean return over the Euclidean norm of the
> equity-curve drawdowns.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Risk / Performance |
| Input type | `f64` (per-period returns) |
| Output type | `f64` |
| Output range | unbounded (negative for net-losing windows) |
| Default parameters | `(period = 36)` (Python) |
| Warmup period | `period` |
| Interpretation | Higher = more return per deep drawdown; outlier-sensitive. |

## Formula

```
equity_t = Π_{i<=t} (1 + return_i)          (compounded curve)
peak_t   = max_{s<=t} equity_s
dd_t     = (peak_t − equity_t) / peak_t      (fractional drawdown, >= 0)
Burke    = mean(returns) / sqrt( Σ dd_t² )
```

The Burke Ratio divides the average per-period return by the **square root of the
*sum* of squared drawdowns**. Squaring punishes deep drawdowns far more than shallow
ones, and summing (not averaging) makes the denominator grow with both depth and
count. That makes Burke the most outlier-sensitive of Wickra's three drawdown
ratios: where the [`SterlingRatio`](/Indicators/Indicator-SterlingRatio) averages
raw drawdowns and shrugs off a lone crater, Burke lets that crater dominate. The
[`MartinRatio`](/Indicators/Indicator-MartinRatio) sits between, using a root-*mean*
square of percentage drawdowns. A window that never draws down has a zero
denominator and reports `0.0`. Source:
`crates/wickra-core/src/indicators/burke_ratio.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `36` (Python) | `>= 2`      | `burke_ratio.rs:50` | Window of returns. `< 2` errors with `Error::InvalidPeriod`. |

The `period` getter returns the window.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/burke_ratio.rs`:

```rust
use wickra::{Indicator, BurkeRatio};
// BurkeRatio: Input = f64, Output = f64
const _: fn(&mut BurkeRatio, f64) -> Option<f64> = <BurkeRatio as Indicator>::update;
```

An `f64` return in, an `Option<f64>` out. Python `update(ret)` / `batch(returns)`
(NaN warmup); Node `update(ret)` / `batch(returns[])` (null warmup).

## Warmup

`warmup_period() == period`. The first value lands once `period` returns are seen
(`reference_value` exercises the emission at index `period − 1`).

## Edge cases

- **Reference value.** `[0.1, −0.1, 0.1]` → `Σ dd² = 0.0101`,
  `(0.1/3) / sqrt(0.0101)` (`reference_value` pins this).
- **No drawdown.** A monotonically rising window reports `0.0`
  (`no_drawdown_is_zero` pins this).
- **Losing window.** A net-losing window gives a negative ratio
  (`losing_window_is_negative` pins this).
- **Non-finite input.** A NaN/∞ return is skipped (`ignores_non_finite_input`).
- **Reset.** `br.reset()` clears the window (`reset_clears_state` pins this).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, BurkeRatio};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut br = BurkeRatio::new(3)?;
    let out = br.batch(&[0.1, -0.1, 0.1]);
    println!("{:?}", out[2]); // Some(0.3316...)
    Ok(())
}
```

Output:

```
Some(0.33167653417401506)
```

### Python

```python
import numpy as np
import wickra as ta

br = ta.BurkeRatio(36)
returns = np.random.randn(60) * 0.05
print(br.batch(returns)[-1])
```

### Node

```javascript
const ta = require('wickra');
const br = new ta.BurkeRatio(3);
console.log(br.batch([0.1, -0.1, 0.1]).at(-1)); // ~0.332
```

### Streaming

```rust
use wickra::{Indicator, BurkeRatio};

let mut br = BurkeRatio::new(36).unwrap();
for r in monthly_returns {
    if let Some(ratio) = br.update(r) {
        // a falling Burke flags a deep drawdown forming
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Tail-risk emphasis.** Because it squares drawdowns, Burke drops sharply when a
   single deep drawdown appears — use it when survival, not smoothness, is the goal.
2. **Triangulate the family.** A high [`SterlingRatio`](/Indicators/Indicator-SterlingRatio)
   alongside a low Burke means most drawdowns are mild but at least one is severe.
3. **Count matters.** The summed (not averaged) denominator grows with the number of
   drawdowns, so a choppy curve scores lower even at equal depth.

## Common pitfalls

- **No-drawdown anomaly.** A window that only rises reports `0.0` (undefined), not
  infinity.
- **Window dependence.** The summed denominator scales with window length —
  compare Burke ratios only at equal `period`.
- **Frequency.** `mean(returns)` is per-period; annualise consistently when quoting.

## References

Burke, G. (1994), *A Sharper Sharpe Ratio*, Futures Magazine — the Burke Ratio.

## See also

- [Indicator-SterlingRatio](/Indicators/Indicator-SterlingRatio) — average drawdown.
- [Indicator-MartinRatio](/Indicators/Indicator-MartinRatio) — return over the Ulcer Index.
- [Indicator-SharpeRatio](/Indicators/Indicator-SharpeRatio) — mean over total volatility.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
