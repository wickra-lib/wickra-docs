# TailRatio

> The fatness of the right tail against the left — the 95th percentile of returns
> over the absolute 5th percentile.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Risk / Performance |
| Input type | `f64` (per-period returns) |
| Output type | `f64` |
| Output range | `>= 0`, unbounded (`> 1` = fatter upside, `< 1` = fatter downside) |
| Default parameters | `(period = 252)` (Python) |
| Warmup period | `period` |
| Interpretation | `> 1` upside surprises dominate; `< 1` crashes dominate. |

## Formula

```
TailRatio = P95(returns) / |P5(returns)|        over the window
```

`P95` and `P5` are the 95th and 5th percentiles of the trailing window, computed
by linear interpolation over the sorted returns (the default NumPy rule). The Tail
Ratio is a *distribution-shape* statistic: it asks whether the best 5% of outcomes
are larger in magnitude than the worst 5%. Unlike the average-based
[`SharpeRatio`](/Indicators/Indicator-SharpeRatio), two series with identical mean
and variance can have very different tail ratios. A window whose 5th percentile is
exactly zero has no measurable left tail and reports `0.0`. Source:
`crates/wickra-core/src/indicators/tail_ratio.rs`.

## Parameters

| Name     | Type    | Default        | Valid range | Source | Description |
|----------|---------|----------------|-------------|--------|-------------|
| `period` | `usize` | `252` (Python) | `>= 2`      | `tail_ratio.rs:60` | Window of returns. `< 2` errors with `Error::InvalidPeriod` (percentiles need two points to interpolate). |

The `period` getter returns the window.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/tail_ratio.rs`:

```rust
use wickra::{Indicator, TailRatio};
// TailRatio: Input = f64, Output = f64
const _: fn(&mut TailRatio, f64) -> Option<f64> = <TailRatio as Indicator>::update;
```

An `f64` return in, an `Option<f64>` out. Python `update(ret)` / `batch(returns)`
(NaN warmup); Node `update(ret)` / `batch(returns[])` (null warmup).

## Warmup

`warmup_period() == period`. The first value lands once `period` returns are seen;
the test `reference_value` exercises the first emission at index `period − 1`.

## Edge cases

- **Reference value.** Sorted window `[-0.04, -0.02, 0, 0.02, 0.04]` →
  `P95 = 0.036`, `|P5| = 0.036` → ratio `1.0` (`reference_value` pins this).
- **Fatter right tail.** A window with one large gain reports `> 1`
  (`fatter_right_tail_exceeds_one` pins this).
- **Flat window.** An all-zero window has no left tail and reports `0.0`
  (`flat_window_is_zero` pins this).
- **Non-finite input.** A NaN/∞ return is skipped, not buffered
  (`ignores_non_finite_input` pins this).
- **Reset.** `tr.reset()` clears the window (`reset_clears_state` pins this).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, TailRatio};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut tr = TailRatio::new(5)?;
    let out = tr.batch(&[-0.04, -0.02, 0.0, 0.02, 0.04]);
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

tr = ta.TailRatio(252)
returns = np.random.randn(500) * 0.01
print(tr.batch(returns)[-1])
```

### Node

```javascript
const ta = require('wickra');
const tr = new ta.TailRatio(5);
console.log(tr.batch([-0.04, -0.02, 0.0, 0.02, 0.04]).at(-1)); // 1
```

### Streaming

```rust
use wickra::{Indicator, TailRatio};

let mut tr = TailRatio::new(252).unwrap();
for r in daily_returns {
    if let Some(ratio) = tr.update(r) {
        // ratio < 1 -> the left tail is fatter than the right
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Crash asymmetry.** A ratio well below `1.0` warns that losing days are larger
   than winning days even if the mean is positive — a hallmark of strategies that
   sell volatility.
2. **Strategy comparison.** Among equal-Sharpe strategies, prefer the one with the
   higher tail ratio: its outliers favour you.
3. **Pair with the body.** Read alongside [`SharpeRatio`](/Indicators/Indicator-SharpeRatio)
   (the centre of the distribution) and [`JarqueBera`](/Indicators/Indicator-JarqueBera)
   (overall non-normality).

## Common pitfalls

- **Window size.** With short windows the 5% and 95% points sit near the extremes
  and the ratio is noisy — use months of data, not days.
- **Zero left tail anomaly.** A loss-free window reports `0.0` (undefined), not
  infinity — do not read that as the worst possible case.
- **Not a Sharpe substitute.** It ignores the centre of the distribution entirely.

## References

Common in quantitative performance reporting (e.g. the `empyrical` / `pyfolio`
tail-ratio definition). Percentile interpolation follows the linear ("inclusive")
method used by NumPy `percentile`.

## See also

- [Indicator-CommonSenseRatio](/Indicators/Indicator-CommonSenseRatio) — profit factor × tail ratio.
- [Indicator-SharpeRatio](/Indicators/Indicator-SharpeRatio) — mean over total volatility.
- [Indicator-JarqueBera](/Indicators/Indicator-JarqueBera) — distribution non-normality.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
