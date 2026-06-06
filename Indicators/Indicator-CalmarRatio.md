# Calmar Ratio

> Mean per-period return divided by the maximum drawdown of the
> implied equity curve. A drawdown-aware risk-adjusted return —
> answers "how much return per unit of worst loss?". Originally
> defined on 36-month windows for hedge-fund evaluation; Wickra's
> rolling version accepts any window length.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Risk / Performance                                                   |
| Input type          | `f64` — one period return per update                                 |
| Output type         | `f64`                                                                |
| Output range        | unbounded; `0.0` when drawdown is zero                                |
| Default parameters  | `period` required                                                    |
| Warmup period       | `period`                                                             |
| Interpretation      | `> 0.5` good; `> 1.0` excellent on annualised data                   |

## Formula

```
equity_t = ∏(1 + r_i) over the window up to t
mdd      = max peak-to-trough decline of equity over window
Calmar   = mean(returns) / mdd
```

If the drawdown is zero (monotonically non-decreasing equity), the
indicator returns `0.0` rather than `NaN` / `Inf`. The equity curve
is recomputed inside the window each `update`, so `update` is
O(period) — acceptable for typical backtest windows (`period ≤ 252`).
See `crates/wickra-core/src/indicators/calmar_ratio.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 1`      | Rolling window of returns. |

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Python / Node: 1-D output
with `NaN` warmup.

## Warmup

`warmup_period() == period`.

## Edge cases

- **No drawdown.** Returns `0.0` (the ratio is undefined; zero by
  convention).
- **Window length.** Classic Calmar uses 36 months (typically 36
  monthly returns). Rolling 252-bar Calmar on daily returns ≈ a
  1-year Calmar.
- **Reset.** Clears the rolling window.

## Examples

### Rust

```rust
use wickra::{BatchExt, CalmarRatio, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let returns: Vec<f64> = (0..100)
        .map(|i| 0.001 + (f64::from(i) * 0.1).sin() * 0.005)
        .collect();
    let mut cr = CalmarRatio::new(20)?;
    println!("row 50 = {:?}", cr.batch(&returns)[50]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

returns = 0.001 + np.sin(np.linspace(0, 10, 100)) * 0.005
cr = ta.CalmarRatio(20)
print('row 50:', cr.batch(returns)[50])
```

### Node

```javascript
const wickra = require('wickra');
const cr = new wickra.CalmarRatio(20);
const returns = Array.from({ length: 100 }, (_, i) => 0.001 + Math.sin(i * 0.1) * 0.005);
console.log('row 50:', cr.batch(returns)[50]);
```

### Streaming

```rust
use wickra::{CalmarRatio, Indicator};

let mut cr = CalmarRatio::new(252).unwrap();
let return_stream: Vec<f64> = Vec::new(); // your stream of periodic returns
for daily_return in return_stream {
    if let Some(v) = cr.update(daily_return) {
        // v reflects last-252-bars return/MDD ratio
    }
}
```

## Interpretation

- **Calmar > 0.5.** Reasonable on annualised data.
- **Calmar > 1.0.** Excellent — annual return exceeds worst
  drawdown of the window.
- **Calmar > 3.0.** Suspicious in backtests; often indicates
  curve-fitting or a benign sample.
- **Vs Sharpe.** Calmar focuses on worst-case loss rather than
  average volatility. Strategies with thin tails can have high
  Sharpe but low Calmar if they have one bad drawdown.

## Common pitfalls

- **Sample-period dependence.** Calmar is highly sensitive to
  the single worst drawdown in the window — a one-off shock can
  dominate the ratio for many months.
- **Window mismatch.** Classic Calmar uses 36 months; using
  shorter windows produces noisier readings.
- **Cumulative vs rolling.** Wickra is rolling; some references
  use cumulative-from-start. Different shapes; specify which
  you mean.

## References

- Terry W. Young, *Calmar Ratio: A Smoother Tool*, *Futures*,
  October 1991 — original Calmar definition (36-month rolling).

## See also

- [MaxDrawdown](/Indicators/Indicator-MaxDrawdown) — denominator alone.
- [SharpeRatio](/Indicators/Indicator-SharpeRatio) — volatility-based
  alternative.
- [SortinoRatio](/Indicators/Indicator-SortinoRatio) — downside-volatility
  alternative.
- [RecoveryFactor](/Indicators/Indicator-RecoveryFactor) — cumulative cousin.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
