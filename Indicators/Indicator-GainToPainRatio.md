# GainToPainRatio

> Jack Schwager's return-per-unit-of-downside — the sum of all returns over the sum
> of the absolute losses.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Risk / Performance |
| Input type | `f64` (per-period returns) |
| Output type | `f64` |
| Output range | unbounded (negative for net-losing windows) |
| Default parameters | `(period = 12)` (Python) |
| Warmup period | `period` |
| Interpretation | `> 1` good, `> 2` excellent (monthly returns). |

## Formula

```
GPR = Σ returns / Σ |negative returns|        over the window
```

Where [`GainLossRatio`](/Indicators/Indicator-GainLossRatio) compares *average* win
to loss and [`ProfitFactor`](/Indicators/Indicator-ProfitFactor) gross profit to
gross loss, the Gain-to-Pain Ratio puts the **net** result over the total pain
endured. Schwager treats `> 1` as good and `> 2` as excellent for monthly returns.
A flat or loss-free window has no measurable pain and reports `0`. Source:
`crates/wickra-core/src/indicators/gain_to_pain_ratio.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `12` (Python) | `>= 1`      | `gain_to_pain_ratio.rs:48` | Window of returns (e.g. 12 months). `0` errors with `Error::PeriodZero`. |

The `period` getter returns the window.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/gain_to_pain_ratio.rs`:

```rust
use wickra::{Indicator, GainToPainRatio};
// GainToPainRatio: Input = f64, Output = f64
const _: fn(&mut GainToPainRatio, f64) -> Option<f64> = <GainToPainRatio as Indicator>::update;
```

An `f64` return in, an `Option<f64>` out. Python `update(ret)` / `batch(returns)`
(NaN warmup); Node `update(ret)` / `batch(returns[])`.

## Warmup

`warmup_period() == period`. The first value lands once `period` returns are seen
(`first_emission_at_warmup_period` pins this).

## Edge cases

- **Reference value.** `+0.04, −0.02` → `0.02 / 0.02 = 1.0` (`reference_value` pins
  this).
- **Net-losing → negative.** A losing window gives a negative ratio
  (`net_losing_window_is_negative` pins this).
- **No pain → 0.** A loss-free window reports `0` (`no_pain_is_zero` pins this).
- **Non-finite input.** A NaN/∞ return is ignored (`ignores_non_finite` pins this).
- **Reset.** `g.reset()` clears the window and the running sums
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, GainToPainRatio};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut g = GainToPainRatio::new(2)?;
    println!("{:?}", g.batch(&[0.04, -0.02]).last().unwrap()); // Some(1.0)
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

g = ta.GainToPainRatio(12)
returns = np.random.randn(60) * 0.02
print(g.batch(returns)[-1])
```

### Node

```javascript
const ta = require('wickra');
const g = new ta.GainToPainRatio(12);
console.log(g.batch([0.04, -0.02]).at(-1)); // 1
```

### Streaming

```rust
use wickra::{Indicator, GainToPainRatio};

let mut g = GainToPainRatio::new(12).unwrap();
let monthly_returns: Vec<f64> = Vec::new(); // your live stream
for r in monthly_returns {
    if let Some(gpr) = g.update(r) {
        // gpr > 2 -> excellent return-per-pain
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Quality screen.** Rank strategies by GPR — it rewards smooth equity curves
   over lumpy ones with the same total return.
2. **Period matters.** Schwager's thresholds (`>1`, `>2`) are calibrated to monthly
   data; recalibrate for other frequencies.
3. **Net, not average.** Because it uses net return over total loss, a few large
   wins offset many small losses — read alongside the tail ratio.

## Common pitfalls

- **Loss-free anomaly.** A window with no losses reports `0` (undefined), not
  infinity — do not read that as bad.
- **Frequency.** Annualise or recalibrate thresholds for daily/weekly returns.
- **Not gain/loss average.** Distinct from `GainLossRatio` and `ProfitFactor`.

## References

Schwager, J. D. (2012), *Market Wizards* series / *Hedge Fund Market Wizards* — the
Gain-to-Pain Ratio.

## See also

- [Indicator-GainLossRatio](/Indicators/Indicator-GainLossRatio) — average win/loss.
- [Indicator-ProfitFactor](/Indicators/Indicator-ProfitFactor) — gross profit/loss.
- [Indicator-CommonSenseRatio](/Indicators/Indicator-CommonSenseRatio) — gain/pain × tails.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
