# Value at Risk (VaR)

> Rolling historical Value-at-Risk. Reports the empirical
> lower-tail quantile of the return distribution at the configured
> confidence level. The 95% VaR answers "what's the worst loss we
> expect on a typical day, 95% of the time?". Output is the
> magnitude of the loss (sign-flipped to be non-negative).

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Risk / Performance                                                   |
| Input type          | `f64` — one period return per update                                 |
| Output type         | `f64` — magnitude of lower-tail quantile                             |
| Output range        | `[0, ∞)`                                                             |
| Default parameters  | `period`, `confidence` both required                                 |
| Warmup period       | `period`                                                             |
| Interpretation      | `0.025` (95%, daily returns) = "5% chance of >2.5% daily loss"        |

## Formula

```
q       = (1 - confidence)
VaR_t   = -percentile(returns over window, q · 100)   if it is negative
VaR_t   = 0                                            otherwise
```

`percentile` uses linear interpolation between the two closest
order statistics ("type 7" in R / NumPy default). If the q-quantile
is non-negative (all-gain window), the indicator returns `0.0` —
there is no loss to report. Each `update` is O(period · log period)
due to the window sort. See
`crates/wickra-core/src/indicators/value_at_risk.rs`.

## Parameters

| Name         | Type    | Default | Constraint            | Description |
|--------------|---------|---------|-----------------------|-------------|
| `period`     | `usize` | none    | `> 0`                 | Rolling window length. |
| `confidence` | `f64`   | none    | finite, `(0, 1)`      | Confidence level (e.g. `0.95` for 95% VaR). |

`ValueAtRisk::new` returns `Error::InvalidPeriod` for out-of-range
parameters.

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Python: `(n,)` array,
`NaN`-filled warmup. Node: same shape.

## Warmup

`warmup_period() == period`.

## Edge cases

- **All-positive window.** VaR = 0.
- **`confidence` close to 1.** Tail is very small — small windows
  produce coarse VaR estimates (the lower-tail quantile is
  literally a single point).
- **Reset.** Clears the rolling window.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, ValueAtRisk};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let returns: Vec<f64> = (0..200)
        .map(|i| (f64::from(i) * 0.1).sin() * 0.02)
        .collect();
    let mut var = ValueAtRisk::new(100, 0.95)?;
    println!("row 150 = {:?}", var.batch(&returns)[150]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

returns = np.sin(np.linspace(0, 20, 200)) * 0.02
var = ta.ValueAtRisk(100, 0.95)
print(var.batch(returns)[150])
```

### Node

```javascript
const wickra = require('wickra');
const var_ = new wickra.ValueAtRisk(100, 0.95);
const returns = Array.from({ length: 200 }, (_, i) => Math.sin(i * 0.1) * 0.02);
console.log(var_.batch(returns)[150]);
```

### Streaming

```rust
use wickra::{Indicator, ValueAtRisk};

let mut var = ValueAtRisk::new(252, 0.99).unwrap();  // 1-year 99% VaR
for daily_return in return_stream {
    if let Some(v) = var.update(daily_return) {
        // v = magnitude of 1-day 99% VaR
    }
}
```

## Interpretation

- **Lower-tail quantile.** A 95% VaR of `0.025` on daily returns
  means: 5% of the time, the daily loss is expected to exceed
  2.5%. Or equivalently: 95% confidence that you won't lose
  more than 2.5% in a day.
- **Historical method only.** Wickra uses empirical (historical)
  VaR — not parametric (variance-covariance) or Monte Carlo.
  No distributional assumption.
- **Pair with CVaR.** VaR tells you where the tail starts; CVaR
  ([ConditionalValueAtRisk](Indicator-ConditionalValueAtRisk))
  tells you what happens beyond it.

## Common pitfalls

- **Treating VaR as a worst-case loss.** It's a quantile — by
  definition, losses exceeding VaR occur `(1 − confidence) · 100%`
  of the time. Use CVaR for expected tail loss.
- **Window too short.** A 20-bar 99% VaR window has only the
  single worst bar shaping the quantile. Use ≥ 100 bars for
  meaningful estimates.
- **VaR additivity.** VaR is not sub-additive — adding two
  positions' VaRs can exceed the portfolio VaR. CVaR is.

## References

- Philippe Jorion, *Value at Risk* (3rd ed., 2007) — canonical
  reference.
- Basel committee on banking supervision documents popularised
  10-day 99% VaR as a regulatory measure.

## See also

- [ConditionalValueAtRisk](Indicator-ConditionalValueAtRisk) —
  expected loss in the tail.
- [MaxDrawdown](Indicator-MaxDrawdown) — alternative loss measure.
- [SharpeRatio](Indicator-SharpeRatio) — symmetric-volatility
  risk measure.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
