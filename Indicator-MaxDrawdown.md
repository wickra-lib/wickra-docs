# Max Drawdown (MDD)

> The deepest peak-to-trough decline within a trailing window.
> Operates on an equity-curve sample (or any non-negative value
> series). Output is the magnitude of the worst drawdown as a
> non-negative fraction (`0.20` = 20% drop from peak). Amortised
> O(1) per update via a monotonically-decreasing deque.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Risk / Performance                                                   |
| Input type          | `f64` — one equity-curve sample per update                           |
| Output type         | `f64`                                                                |
| Output range        | `[0, 1]` (fraction of peak)                                          |
| Default parameters  | `period` required                                                    |
| Warmup period       | `1` (running peak emits from first input)                            |
| Interpretation      | Worst drawdown over the rolling window                                |

## Formula

```
peak_t      = running max of equity over the trailing period bars
drawdown_t  = (equity_t - peak_t) / peak_t                  (negative)
MaxDrawdown = -min(drawdown_t over window)                  (positive magnitude)
```

A monotonically rising equity curve has MDD = 0. Setting `period`
≥ the number of bars you will ever feed makes the metric
effectively *cumulative* — the running peak is never dropped from
the window. See
`crates/wickra-core/src/indicators/max_drawdown.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 0`      | Rolling window length. Use very large value for cumulative MDD. |

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Python / Node: 1-D output,
each value the MDD over the trailing window ending at that bar.

## Warmup

`warmup_period() == 1`. Emits from the first input (MDD = 0).

## Edge cases

- **Monotonically rising input.** MDD = 0 throughout.
- **Recovery to new peak.** Once equity exceeds the prior peak,
  the running peak updates and subsequent drawdowns are measured
  from the new peak.
- **Negative equity.** Possible with leveraged products; this
  indicator assumes positive equity for the fractional drawdown
  to be meaningful.
- **Reset.** Clears the rolling deque.

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
for equity in equity_stream {
    let dd = mdd.update(equity).unwrap();
    if dd > 0.10 { /* warning: > 10% drawdown */ }
}
```

## Interpretation

- **MDD measures pain.** A 20% MDD means the strategy lost 20%
  from its peak before recovering (or before the window slid past
  the drawdown).
- **Combine with Calmar.** Return / MDD = [Calmar](Indicator-CalmarRatio).
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

- [AverageDrawdown](Indicator-AverageDrawdown) — average drawdown
  cousin.
- [DrawdownDuration](Indicator-DrawdownDuration) — time-under-water
  metric.
- [PainIndex](Indicator-PainIndex) — equivalent to AverageDrawdown.
- [UlcerIndex](Indicator-UlcerIndex) — RMS-weighted alternative.
- [CalmarRatio](Indicator-CalmarRatio) — return / MDD ratio.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
