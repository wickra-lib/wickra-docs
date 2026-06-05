# Drawdown Duration

> Time-under-water measure. Counts bars elapsed since the all-time
> peak was last set. Each new peak resets the counter to zero. As
> long as the series stays under water, the duration grows linearly.
> Cumulative-from-start rather than rolling-windowed.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Risk / Performance                                                   |
| Input type          | `f64` — one equity-curve sample per update                           |
| Output type         | `u32` — bars under water                                             |
| Output range        | `[0, ∞)`                                                             |
| Default parameters  | none — `DrawdownDuration::new()`                                     |
| Warmup period       | `1`                                                                  |
| Interpretation      | Time spent recovering from drawdown                                   |

## Formula

```
peak_t      = max(input over [0..=t])              (running all-time max)
duration_t  = bars elapsed since peak_t was set
```

A new peak resets the duration to `0`. See
`crates/wickra-core/src/indicators/drawdown_duration.rs`.

## Parameters

None — `DrawdownDuration::new()` takes no arguments.

## Inputs / Outputs

`Indicator<Input = f64, Output = u32>`. Python:
`DrawdownDuration().batch(equity)` returns a 1-D `np.ndarray` of
`uint32` values (no warmup `NaN`). Node: `update(equity)` returns
`number` (always defined after first bar).

## Warmup

`warmup_period() == 1`. First input sets the initial peak (duration
= 0).

## Edge cases

- **First bar.** Always returns `0` (peak just set).
- **New peak.** Resets to `0`.
- **Cumulative.** No rolling window — the all-time peak is tracked
  across the entire input history since last `reset()`.
- **Reset.** Clears the peak and the bars-counter.

## Examples

### Rust

```rust
use wickra::{DrawdownDuration, Indicator};

fn main() {
    let mut dd = DrawdownDuration::new();
    assert_eq!(dd.update(100.0), Some(0));        // first bar -> new peak
    assert_eq!(dd.update(95.0),  Some(1));        // 1 bar under water
    assert_eq!(dd.update(90.0),  Some(2));        // 2 bars under water
    assert_eq!(dd.update(110.0), Some(0));        // new peak -> reset
}
```

### Python

```python
import numpy as np
import wickra as ta

equity = np.array([100.0, 95.0, 90.0, 110.0, 105.0, 108.0])
dd = ta.DrawdownDuration()
print(dd.batch(equity))  # [0, 1, 2, 0, 1, 2]
```

### Node

```javascript
const wickra = require('wickra');
const dd = new wickra.DrawdownDuration();
console.log(dd.batch([100, 95, 90, 110, 105, 108]));
```

### Streaming

```rust
use wickra::{DrawdownDuration, Indicator};

let mut dd = DrawdownDuration::new();
let equity_stream: Vec<f64> = Vec::new(); // your equity-curve feed
for equity in equity_stream {
    let bars = dd.update(equity).unwrap();
    if bars > 252 { /* one year under water — concerning */ }
}
```

## Interpretation

- **Long durations.** A 504-bar (≈2 years) drawdown duration is
  a serious concern for any strategy — risk of investor
  capitulation, capital reallocation, etc.
- **Resetting.** Each new all-time high resets the clock; the
  duration measures "time since last meaningful win".
- **Pair with depth.** Drawdown duration + MaxDrawdown depth
  together describe the full drawdown experience.

## Common pitfalls

- **Cumulative semantics.** Not rolling — once you're under water
  in a multi-year drawdown, the counter keeps growing. To get
  rolling behaviour, reset on a schedule.
- **Output type.** Python returns `uint32`, Node `number`. Don't
  expect a fraction — this is bar count.

## References

- Standard portfolio analytics measure; documented in any modern
  performance-analytics text (e.g. Lopez de Prado, *Advances in
  Financial Machine Learning*, 2018).

## See also

- [MaxDrawdown](/Indicators/Indicator-MaxDrawdown) — drawdown depth.
- [AverageDrawdown](/Indicators/Indicator-AverageDrawdown) — drawdown depth
  average.
- [UlcerIndex](/Indicators/Indicator-UlcerIndex) — depth × duration weighted.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
