# Recovery Factor

> Cumulative net return divided by maximum drawdown — measured from
> the very first observation, not over a rolling window. Tracks the
> running all-time peak and the deepest drawdown seen so far.
> `Recovery > 1` means the strategy has earned more than it ever
> lost on the way.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Risk / Performance                                                   |
| Input type          | `f64` — one equity-curve sample per update                           |
| Output type         | `f64`                                                                |
| Output range        | unbounded; `0.0` when no drawdown                                     |
| Default parameters  | none — `RecoveryFactor::new()`                                       |
| Warmup period       | `1`                                                                  |
| Interpretation      | Total return divided by worst-ever drawdown                          |

## Formula

```
peak       = max(equity since start)
trough_dd  = max((peak - equity) / peak)
net_return = (equity_last / equity_first) - 1
Recovery   = net_return / trough_dd
```

A pure uptrend has no drawdown and the indicator reports `0.0`
(undefined ratio). Cumulative-from-start rather than rolling-
windowed: user must reset to re-start the count. Each `update` is
O(1). See
`crates/wickra-core/src/indicators/recovery_factor.rs`.

## Parameters

None — `RecoveryFactor::new()` takes no arguments.

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Python: 1-D output (no
warmup `NaN` beyond bar 0). Node: same.

## Warmup

`warmup_period() == 1`.

## Edge cases

- **First bar.** Seeds `first` to the input; output `0.0`.
- **No drawdown.** Output `0.0` (ratio undefined).
- **Cumulative.** No rolling window — `reset()` to restart.
- **Reset.** Clears peak, drawdown, and first-value cache.

## Examples

### Rust

```rust
use wickra::{Indicator, RecoveryFactor};

fn main() {
    let mut r = RecoveryFactor::new();
    for v in [100.0, 110.0, 105.0, 95.0, 88.0, 100.0, 120.0, 130.0] {
        r.update(v);
    }
    println!("recovery = {:?}", r.value());
}
```

### Python

```python
import numpy as np
import wickra as ta

equity = np.array([100, 110, 105, 95, 88, 100, 120, 130], dtype=float)
r = ta.RecoveryFactor()
print(r.batch(equity)[-1])  # > 1.0
```

### Node

```javascript
const wickra = require('wickra');
const r = new wickra.RecoveryFactor();
console.log(r.batch([100, 110, 105, 95, 88, 100, 120, 130]));
```

### Streaming

```rust
use wickra::{Indicator, RecoveryFactor};

let mut r = RecoveryFactor::new();
let equity_stream: Vec<f64> = Vec::new(); // your equity-curve feed
for equity in equity_stream {
    if let Some(v) = r.update(equity) {
        if v > 1.0 { /* strategy has recovered all losses + profit */ }
    }
}
```

## Interpretation

- **Recovery > 1.** Strategy has earned more than its worst
  drawdown — net positive on a risk-adjusted basis.
- **Recovery > 5.** Excellent long-term performance — modest
  drawdowns relative to total gains.
- **Recovery = 0.** Either no net return (flat) or no drawdown
  (pure uptrend). Both edge cases.
- **Vs Calmar.** Calmar uses *mean* return; Recovery uses
  *total* return. Calmar is per-period normalized; Recovery is
  cumulative.

## Common pitfalls

- **Cumulative semantics.** Recovery starts from the first bar
  ever fed. For "since X" analysis, reset at X.
- **Confusing with Calmar.** Calmar = mean return / MDD;
  Recovery = total return / MDD. Both useful, different
  questions.

## References

- Standard portfolio-analytics measure popularised by Robbins-
  Gosshein. Documented in modern backtesting texts.

## See also

- [CalmarRatio](/Indicators/Indicator-CalmarRatio) — rolling cousin.
- [MaxDrawdown](/Indicators/Indicator-MaxDrawdown) — the denominator.
- [DrawdownDuration](/Indicators/Indicator-DrawdownDuration) — time-under-water
  sibling.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
