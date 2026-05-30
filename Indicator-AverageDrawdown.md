# Average Drawdown

> Mean drawdown over the rolling window — the typical drawdown
> depth during the period. Scans the trailing window, tracks the
> running peak inside the window, and reports the mean of all
> bar-by-bar drawdowns. Equivalent to the **Pain Index** (see
> [PainIndex](Indicator-PainIndex)).

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Risk / Performance                                                   |
| Input type          | `f64` — one equity-curve sample per update                           |
| Output type         | `f64`                                                                |
| Output range        | `[0, 1]` (fraction of peak)                                          |
| Default parameters  | `period` required                                                    |
| Warmup period       | `period`                                                             |
| Interpretation      | Average drawdown depth over window — "typical pain"                   |

## Formula

```
peak_t   = running max over window up to t
dd_t     = (peak_t - equity_t) / peak_t       (0 if no drawdown)
AvgDD    = mean(dd_t over window)
```

See `crates/wickra-core/src/indicators/average_drawdown.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 0`      | Rolling window length. |

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`.

## Warmup

`warmup_period() == period`.

## Edge cases

- **Same metric as PainIndex.** This indicator and PainIndex emit
  identical values — they exist as separate types for naming
  convenience.
- **Monotonically rising equity.** AvgDD = 0 throughout.
- **Reset.** Clears the rolling window.

## Examples

### Rust

```rust
use wickra::{AverageDrawdown, BatchExt, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let equity = vec![100.0, 110.0, 100.0, 95.0, 88.0, 90.0, 92.0, 95.0, 100.0, 105.0];
    let mut adv = AverageDrawdown::new(10)?;
    println!("{:?}", adv.batch(&equity).last());
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

equity = np.array([100, 110, 100, 95, 88, 90, 92, 95, 100, 105], dtype=float)
adv = ta.AverageDrawdown(10)
print(adv.batch(equity)[-1])
```

### Node

```javascript
const wickra = require('wickra');
const adv = new wickra.AverageDrawdown(10);
console.log(adv.batch([100, 110, 100, 95, 88, 90, 92, 95, 100, 105]));
```

### Streaming

```rust
use wickra::{AverageDrawdown, Indicator};

let mut adv = AverageDrawdown::new(252).unwrap();
for equity in equity_stream {
    if let Some(v) = adv.update(equity) {
        // v is the typical drawdown depth over last year
    }
}
```

## Interpretation

- **Typical pain.** Where MaxDrawdown reports worst case, AvgDD
  reports the typical experience. A strategy can have low MaxDD
  but high AvgDD if it spends a lot of time under water.
- **Vs UlcerIndex.** UlcerIndex squares drawdowns before
  averaging — punishes deep drawdowns disproportionately.
  AvgDD = PainIndex weights all drawdowns equally.
- **Reporting.** Often paired with MaxDD: "worst 20% / typical
  5%" tells a more complete risk story than either alone.

## Common pitfalls

- **Confusing with MaxDrawdown.** Average ≠ maximum. Two strategies
  with the same MaxDD can have very different AvgDDs.
- **Period choice.** Same as MaxDrawdown — short windows forget
  past drawdowns.

## References

- Same as [PainIndex](Indicator-PainIndex) — Thomas Becker's pain
  measure.

## See also

- [PainIndex](Indicator-PainIndex) — same metric, alternative name.
- [MaxDrawdown](Indicator-MaxDrawdown) — worst case.
- [UlcerIndex](Indicator-UlcerIndex) — RMS variant.
- [DrawdownDuration](Indicator-DrawdownDuration) — time-under-water.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
