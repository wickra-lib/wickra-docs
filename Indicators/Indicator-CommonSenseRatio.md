# CommonSenseRatio

> One number that must win on both fronts — the profit factor (the body) multiplied
> by the tail ratio (the extremes).

## Quick reference

| Field | Value |
|-------|-------|
| Family | Risk / Performance |
| Input type | `f64` (per-period returns) |
| Output type | `f64` |
| Output range | `>= 0`, unbounded (`> 1` sound, `< 1` flawed) |
| Default parameters | `(period = 252)` (Python) |
| Warmup period | `period` |
| Interpretation | `> 1` good on body *and* tails; `< 1` one of them is failing. |

## Formula

```
ProfitFactor = Σ gains / Σ |losses|              over the window
TailRatio    = P95(returns) / |P5(returns)|      over the window
CSR          = ProfitFactor · TailRatio
```

The Common Sense Ratio multiplies the [`ProfitFactor`](/Indicators/Indicator-ProfitFactor)
(how much you make per unit lost on the *average* bar) by the
[`TailRatio`](/Indicators/Indicator-TailRatio) (whether the largest gains beat the
largest losses). The product only sits comfortably above `1.0` when a strategy wins
on both: a healthy profit factor can still hide catastrophic left-tail risk, and a
fat right tail means nothing if the body bleeds. A window with no losses or no left
tail reports `0.0` rather than dividing by zero. Source:
`crates/wickra-core/src/indicators/common_sense_ratio.rs`.

## Parameters

| Name     | Type    | Default        | Valid range | Source | Description |
|----------|---------|----------------|-------------|--------|-------------|
| `period` | `usize` | `252` (Python) | `>= 2`      | `common_sense_ratio.rs:60` | Window of returns. `< 2` errors with `Error::InvalidPeriod`. |

The `period` getter returns the window.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/common_sense_ratio.rs`:

```rust
use wickra::{Indicator, CommonSenseRatio};
// CommonSenseRatio: Input = f64, Output = f64
const _: fn(&mut CommonSenseRatio, f64) -> Option<f64> =
    <CommonSenseRatio as Indicator>::update;
```

An `f64` return in, an `Option<f64>` out. Python `update(ret)` / `batch(returns)`
(NaN warmup); Node `update(ret)` / `batch(returns[])` (null warmup).

## Warmup

`warmup_period() == period`. The first value lands once `period` returns are seen
(`reference_value` exercises the emission at index `period − 1`).

## Edge cases

- **Reference value.** `[-0.04, -0.02, 0, 0.02, 0.04]` → profit factor `1.0` ×
  tail ratio `1.0` = `1.0` (`reference_value` pins this).
- **No losses.** A loss-free window reports `0.0` (`no_losses_is_zero` pins this).
- **Flat window.** An all-zero window trips the losses guard and reports `0.0`
  (`flat_window_is_zero` pins this).
- **Non-finite input.** A NaN/∞ return is skipped (`ignores_non_finite_input`).
- **Reset.** `csr.reset()` clears the window (`reset_clears_state` pins this).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, CommonSenseRatio};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut csr = CommonSenseRatio::new(5)?;
    let out = csr.batch(&[-0.04, -0.02, 0.0, 0.02, 0.04]);
    println!("{:?}", out[4]); // Some(1.0)
    Ok(())
}
```

Output:

```
Some(1.0)
```

### Python

```python
import numpy as np
import wickra as ta

csr = ta.CommonSenseRatio(252)
returns = np.random.randn(500) * 0.01
print(csr.batch(returns)[-1])
```

### Node

```javascript
const ta = require('wickra');
const csr = new ta.CommonSenseRatio(5);
console.log(csr.batch([-0.04, -0.02, 0.0, 0.02, 0.04]).at(-1)); // 1
```

### Streaming

```rust
use wickra::{Indicator, CommonSenseRatio};

let mut csr = CommonSenseRatio::new(252).unwrap();
let daily_returns: Vec<f64> = Vec::new(); // your live stream
for r in daily_returns {
    if let Some(ratio) = csr.update(r) {
        // ratio > 1 -> sound on both body and tails
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Hidden-risk detector.** A strategy with a strong profit factor but a CSR below
   `1.0` is being dragged down by its tails — the average bar lies about the risk.
2. **One-number screen.** Robert Carver popularised the CSR as a quick robustness
   check: anything below `1.0` is fragile regardless of headline returns.
3. **Decompose on a fail.** When the CSR is poor, read its two factors separately to
   learn whether the body ([`ProfitFactor`](/Indicators/Indicator-ProfitFactor)) or
   the tails ([`TailRatio`](/Indicators/Indicator-TailRatio)) is to blame.

## Common pitfalls

- **Window length.** Tail percentiles need many observations — use a year of daily
  data, not a handful of bars.
- **Zero anomaly.** No losses or no left tail reports `0.0` (undefined), not
  infinity.
- **Multiplicative, not additive.** A near-zero factor collapses the whole ratio —
  that is by design.

## References

Schwager, J. D., and popularised by Carver, R. (2015), *Systematic Trading* — the
Common Sense Ratio.

## See also

- [Indicator-ProfitFactor](/Indicators/Indicator-ProfitFactor) — the body factor.
- [Indicator-TailRatio](/Indicators/Indicator-TailRatio) — the tail factor.
- [Indicator-GainToPainRatio](/Indicators/Indicator-GainToPainRatio) — net return over total loss.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
