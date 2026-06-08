# UpsidePotentialRatio

> The Sortino purist's ratio — average outperformance above a threshold over the
> downside deviation below it.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Risk / Performance |
| Input type | `f64` (per-period returns) |
| Output type | `f64` |
| Output range | `>= 0`, unbounded |
| Default parameters | `(period = 20, mar = 0.0)` (Python) |
| Warmup period | `period` |
| Interpretation | Higher is better; rewards upside, penalises only shortfall. |

## Formula

```
upside   = mean( max(r − mar, 0) )            over the window
downside = sqrt( mean( min(r − mar, 0)² ) )   over the window
UPR      = upside / downside
```

`mar` is the minimal acceptable return (the hurdle). The numerator averages how far
returns rise *above* the threshold; the denominator is the root-mean-square of how
far they fall *below* it. Where the [`SharpeRatio`](/Indicators/Indicator-SharpeRatio)
penalises all variance symmetrically, the Upside Potential Ratio embraces the
Sortino philosophy in its purest form: only shortfall is risk; upside dispersion is
desirable. A window that never breaches `mar` has zero downside deviation and
reports `0.0`. Source: `crates/wickra-core/src/indicators/upside_potential_ratio.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `20` (Python) | `>= 2`      | `upside_potential_ratio.rs:66` | Window of returns. `< 2` errors with `Error::InvalidPeriod`. |
| `mar`    | `f64`   | `0.0`         | finite      | `upside_potential_ratio.rs:71` | Minimal acceptable return. Non-finite errors with `Error::InvalidParameter`. |

The `period` and `mar` getters return the configuration.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/upside_potential_ratio.rs`:

```rust
use wickra::{Indicator, UpsidePotentialRatio};
// UpsidePotentialRatio: Input = f64, Output = f64
const _: fn(&mut UpsidePotentialRatio, f64) -> Option<f64> =
    <UpsidePotentialRatio as Indicator>::update;
```

An `f64` return in, an `Option<f64>` out. Python `update(ret)` / `batch(returns)`
(NaN warmup); Node `update(ret)` / `batch(returns[])` (null warmup).

## Warmup

`warmup_period() == period`. The first value lands once `period` returns are seen
(`reference_value` exercises the emission at index `period − 1`).

## Edge cases

- **Reference value.** `[0.02, −0.01, 0.03, −0.02]`, `mar = 0` →
  `0.0125 / sqrt(0.000125)` (`reference_value` pins this).
- **No downside.** A window entirely above `mar` reports `0.0`
  (`no_downside_is_zero` pins this).
- **Non-finite input.** A NaN/∞ return is skipped (`ignores_non_finite_input`).
- **Non-finite `mar`.** Construction rejects it (`rejects_non_finite_mar`).
- **Reset.** `upr.reset()` clears the window and running sums (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, UpsidePotentialRatio};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut upr = UpsidePotentialRatio::new(4, 0.0)?;
    let out = upr.batch(&[0.02, -0.01, 0.03, -0.02]);
    println!("{:?}", out[3]); // Some(1.1180...)
    Ok(())
}
```

Output:

```
Some(1.1180339887498947)
```

### Python

```python
import numpy as np
import wickra as ta

upr = ta.UpsidePotentialRatio(20, 0.0)
returns = np.random.randn(60) * 0.02
print(upr.batch(returns)[-1])
```

### Node

```javascript
const ta = require('wickra');
const upr = new ta.UpsidePotentialRatio(4, 0.0);
console.log(upr.batch([0.02, -0.01, 0.03, -0.02]).at(-1)); // ~1.118
```

### Streaming

```rust
use wickra::{Indicator, UpsidePotentialRatio};

let mut upr = UpsidePotentialRatio::new(20, 0.0).unwrap();
let monthly_returns: Vec<f64> = Vec::new(); // your live stream
for r in monthly_returns {
    if let Some(ratio) = upr.update(r) {
        // higher ratio -> more upside per unit of downside risk
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Goal-based investing.** Set `mar` to a liability or target rate; the ratio
   then measures the chance of exceeding the goal relative to the risk of missing it.
2. **Versus Sortino.** The classic Sortino divides *excess mean* by downside
   deviation; UPR divides *upside mean* by it — UPR never lets a string of large
   wins be penalised the way total-volatility ratios do.
3. **Threshold sensitivity.** Raising `mar` shrinks the numerator and grows the
   denominator, so the ratio falls — always report the `mar` used.

## Common pitfalls

- **Frequency mismatch.** `mar` must match the return frequency (daily hurdle for
  daily returns).
- **No-downside anomaly.** A window with no shortfall reports `0.0` (undefined), not
  infinity.
- **Not the Sortino ratio.** Distinct numerator — see `SortinoRatio` if you need
  excess mean over downside deviation.

## References

Sortino, F., van der Meer, R., & Plantinga, A. (1999), *The Dutch Triangle* —
the Upside Potential Ratio.

## See also

- [Indicator-SharpeRatio](/Indicators/Indicator-SharpeRatio) — mean over total volatility.
- [Indicator-GainToPainRatio](/Indicators/Indicator-GainToPainRatio) — net return over total loss.
- [Indicator-MartinRatio](/Indicators/Indicator-MartinRatio) — return over the Ulcer Index.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
