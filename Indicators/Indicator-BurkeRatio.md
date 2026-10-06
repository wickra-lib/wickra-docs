# BurkeRatio

> Return per unit of *severe* pain — mean return over the Euclidean norm of the
> equity curve's drawdown-episode depths.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Risk / Performance |
| Input type | `f64` (per-period returns) |
| Output type | `f64` |
| Output range | unbounded (negative for net-losing windows) |
| Default parameters | `(period = 12)` (Python) |
| Warmup period | `period` |
| Interpretation | Higher = more return per deep drawdown; outlier-sensitive. |

## Formula

```
equity_t = Π_{i<=t} (1 + return_i)          (compounded curve)
peak_t   = max_{s<=t} equity_s
episode  = a stretch below the running peak, closed by a full recovery
D_j      = (peak_j − trough_j) / peak_j      (depth of episode j)
Burke    = mean(returns) / sqrt( Σ_j D_j² )
```

The Burke Ratio (Gibbons Burke, 1994) divides the average per-period return by the
**square root of the *sum* of squared drawdown-episode depths**. An episode opens
when equity falls below the running peak and closes when equity regains that peak;
its depth is the trough measured against that peak, and an episode still open at
the window's right edge is booked at its current trough. Each episode counts once,
not every bar under water. Squaring punishes deep drawdowns far more than shallow
ones, and summing (not averaging) makes the denominator grow with both depth and
the *number* of episodes — but not with how many bars an episode lasts. That makes
Burke the most outlier-sensitive of Wickra's three drawdown ratios: where the
[`SterlingRatio`](/Indicators/Indicator-SterlingRatio) averages episode depths and
shrugs off a lone crater, Burke lets that crater dominate. The
[`MartinRatio`](/Indicators/Indicator-MartinRatio) sits between, using a root-*mean*
square of percentage drawdowns. A window that never draws down has a zero
denominator and reports `0.0`. Source:
`crates/wickra-core/src/indicators/burke_ratio.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `12` (Python) | `>= 2`      | `burke_ratio.rs:55` | Window of returns. `< 2` errors with `Error::InvalidPeriod`. |

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

- **Reference value.** `[0.1, −0.1, 0.1]` → equity `1.1, 0.99, 1.089`; one
  episode from the `1.1` peak down to `0.99`, still open at the window edge:
  depth `0.1`, so `Σ D² = 0.01` and Burke `= (0.1/3) / sqrt(0.01) = 1/3`
  (`reference_value` pins this).
- **Open episode.** An episode that has not recovered by the window's last bar
  is booked at its trough so far, not dropped.
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
    println!("{:?}", out[2]); // Some(0.3333...)
    Ok(())
}
```

Output:

```
Some(0.3333333333333334)
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
console.log(br.batch([0.1, -0.1, 0.1]).at(-1)); // ~0.3333
```

### Streaming

```rust
use wickra::{Indicator, BurkeRatio};

let mut br = BurkeRatio::new(36).unwrap();
let monthly_returns: Vec<f64> = Vec::new(); // your live stream
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
   drawdown episodes, so a choppy curve with many separate dips scores lower even at
   equal depth. A single long episode counts once, however many bars it lasts.

## Common pitfalls

- **No-drawdown anomaly.** A window that only rises reports `0.0` (undefined), not
  infinity.
- **Window dependence.** The summed denominator grows with the number of episodes
  a window can hold — compare Burke ratios only at equal `period`.
- **Episodes, not bars.** Time under water is not penalised: a long, shallow
  episode weighs the same as a one-bar dip of equal depth.
- **Frequency.** `mean(returns)` is per-period; annualise consistently when quoting.

## References

Burke, G. (1994), *A Sharper Sharpe Ratio*, Futures Magazine — the Burke Ratio.

## See also

- [Indicator-SterlingRatio](/Indicators/Indicator-SterlingRatio) — average drawdown-episode depth.
- [Indicator-MartinRatio](/Indicators/Indicator-MartinRatio) — return over the Ulcer Index.
- [Indicator-SharpeRatio](/Indicators/Indicator-SharpeRatio) — mean over total volatility.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
