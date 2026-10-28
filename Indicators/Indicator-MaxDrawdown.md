# Max Drawdown (MDD)

> The deepest peak-to-trough decline within a trailing window.
> Operates on an equity-curve sample (or any non-negative value
> series). Output is the magnitude of the worst drawdown as a
> non-negative fraction (`0.20` = 20% drop from peak). Amortised
> O(1) per update.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Risk / Performance                                                   |
| Input type          | `f64` — one equity-curve sample per update                           |
| Output type         | `f64`                                                                |
| Output range        | `[0, 1]` (fraction of peak) for non-negative equity                  |
| Default parameters  | `period` required                                                    |
| Warmup period       | `period` (first value once the window is full)                       |
| Interpretation      | Worst drawdown over the rolling window                                |

## Formula

```
peak_t      = running max of equity from the oldest bar in the window up to t
drawdown_t  = (equity_t - peak_t) / peak_t                  (negative)
MaxDrawdown = -min(drawdown_t over window)                  (positive magnitude)
```

Only a positive peak counts; while the running peak is zero or
negative, a bar adds no drawdown. A monotonically rising equity
curve has MDD = 0. Setting `period` ≥ the number of bars you will
ever feed makes the metric effectively *cumulative* — the running
peak is never dropped from the window. See
`crates/wickra-core/src/indicators/max_drawdown.rs`.

**Cost.** Each update is amortised O(1), whatever the `period`.
The running peaks split the window into segments, a peak followed
by the bars below it, and a segment's deepest drawdown is
`(peak - low) / peak`. The window is held as two halves: the older
one is rebuilt from the newer one every `period` updates, storing
for each bar the peak and worst drawdown from it to the end of the
half, and the newer one keeps its own running peaks with the low of
each segment. The result is bit for bit what rescanning the window
gives (unit tests `matches_rescan_bit_for_bit` and
`matches_rescan_on_long_series`).

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 0`      | Rolling window length. Use very large value for cumulative MDD. |

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Python / Node: 1-D output,
each value the MDD over the trailing window ending at that bar.

## Warmup

`warmup_period() == period`. The first value comes with the
`period`-th input, once the window is full; before that `update`
returns `None` (Python `None`, Node `null`, `NaN` in `batch`). Unit
tests `accessors_and_metadata` and `reference_drawdown`.

## Edge cases

- **Monotonically rising input.** MDD = 0 throughout (test
  `pure_uptrend_yields_zero`).
- **Flat input.** MDD = 0 (test `constant_series_yields_zero`).
- **Recovery to new peak.** Once equity exceeds the prior peak,
  the running peak updates and subsequent drawdowns are measured
  from the new peak.
- **Non-positive peak.** While the running peak is zero or
  negative no drawdown is measured, so an all-zero window gives 0
  (test `non_positive_peak_yields_zero`). A dip below zero after a
  positive peak gives a value above 1.
- **Non-finite input.** `NaN` and `±∞` return `None` and leave the
  window untouched (test `ignores_non_finite_input`).
- **Reset.** Clears the window; the next value comes after another
  `period` inputs (test `reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, MaxDrawdown};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let equity = vec![100.0, 110.0, 100.0, 95.0, 88.0, 90.0, 92.0, 95.0, 100.0, 105.0, 106.0];
    let mut mdd = MaxDrawdown::new(10)?;
    let out = mdd.batch(&equity);
    println!("MDD at last bar: {:?}", out.last());  // ~0.20 (110 -> 88)
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

equity = np.array([100, 110, 100, 95, 88, 90, 92, 95, 100, 105, 106], dtype=float)
mdd = ta.MaxDrawdown(10)
print(mdd.batch(equity))
```

### Node

```javascript
const wickra = require('wickra');
const mdd = new wickra.MaxDrawdown(10);
console.log(mdd.batch([100, 110, 100, 95, 88, 90, 92, 95, 100, 105, 106]));
```

### Streaming

```rust
use wickra::{Indicator, MaxDrawdown};

let mut mdd = MaxDrawdown::new(252).unwrap();
let equity_stream: Vec<f64> = Vec::new(); // your equity-curve feed
for equity in equity_stream {
    // `None` until 252 values have arrived.
    if let Some(dd) = mdd.update(equity) {
        if dd > 0.10 { /* warning: > 10% drawdown */ }
    }
}
```

## Interpretation

- **MDD measures pain.** A 20% MDD means the strategy lost 20%
  from its peak before recovering (or before the window slid past
  the drawdown).
- **Combine with Calmar.** Return / MDD = [Calmar](/Indicators/Indicator-CalmarRatio).
- **Window choice.** Use `period = 252` for "trailing one-year
  MDD" on daily returns; a much larger period for cumulative
  history.

## Common pitfalls

- **Misinterpreting magnitude.** Output is positive (e.g.
  `0.15` = 15% drop). Don't confuse with a signed drawdown
  series.
- **Period too short.** A `period = 20` MDD only "remembers" the
  last 20 bars; a deeper drawdown earlier disappears from the
  window. Use longer windows for risk reporting.
- **Cumulative confusion.** If you want all-time MDD, pick a
  `period` larger than your total sample length — the running
  peak never gets dropped.

## References

- Standard portfolio-management measure; documented in
  Magdon-Ismail & Atiya, *Maximum Drawdown*, *Risk Magazine*,
  October 2004 — formal statistical treatment.

## See also

- [AverageDrawdown](/Indicators/Indicator-AverageDrawdown) — average drawdown
  cousin.
- [DrawdownDuration](/Indicators/Indicator-DrawdownDuration) — time-under-water
  metric.
- [PainIndex](/Indicators/Indicator-PainIndex) — equivalent to AverageDrawdown.
- [UlcerIndex](/Indicators/Indicator-UlcerIndex) — RMS-weighted alternative.
- [CalmarRatio](/Indicators/Indicator-CalmarRatio) — return / MDD ratio.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
