# Sortino Ratio

> Sharpe-style risk-adjusted return that punishes only **downside**
> volatility — returns below a minimum acceptable return (MAR). The
> numerator is excess return over the MAR; the denominator is the
> downside deviation. Avoids penalising upside volatility, which
> Sharpe treats symmetrically with downside.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Risk / Performance                                                   |
| Input type          | `f64` — one period return per update                                 |
| Output type         | `f64`                                                                |
| Output range        | unbounded                                                            |
| Default parameters  | `period`, `mar` both required                                        |
| Warmup period       | `period`                                                             |
| Interpretation      | Generally higher than Sharpe; threshold-dependent                     |

## Formula

```
downside_dev = sqrt( mean( min(0, r - mar)² over period ) )
Sortino      = (mean(r) - mar) / downside_dev
```

Downside variance uses the population formula (`n` in the
denominator) since the negative-shortfall samples are treated as the
full population. See
`crates/wickra-core/src/indicators/sortino_ratio.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 1`      | Rolling window of returns. |
| `mar`    | `f64`   | none    | finite     | Minimum Acceptable Return (e.g. `0.0` for "any positive"). |

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Python: `(n,)` array with
`NaN` warmup prefix. Node: same.

## Warmup

`warmup_period() == period`.

## Edge cases

- **No downside.** If every return ≥ MAR, downside deviation is
  `0`; indicator returns `0.0` rather than `NaN`.
- **Vs Sharpe.** Sortino is typically *higher* than Sharpe on the
  same data because it ignores upside volatility.
- **MAR choice.** Common choices: `0.0` (any negative return is
  downside) or the per-period risk-free rate.
- **Reset.** Clears the rolling window.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, SortinoRatio};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let returns: Vec<f64> = (0..100)
        .map(|i| (f64::from(i) * 0.1).sin() * 0.01)
        .collect();
    let mut sr = SortinoRatio::new(20, 0.0)?;
    println!("row 50 = {:?}", sr.batch(&returns)[50]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

returns = np.sin(np.linspace(0, 10, 100)) * 0.01
sr = ta.SortinoRatio(20, 0.0)
print('row 50:', sr.batch(returns)[50])
```

### Node

```javascript
const wickra = require('wickra');
const sr = new wickra.SortinoRatio(20, 0.0);
const returns = Array.from({ length: 100 }, (_, i) => Math.sin(i * 0.1) * 0.01);
console.log('row 50:', sr.batch(returns)[50]);
```

### Streaming

```rust
use wickra::{Indicator, SortinoRatio};

let mut sr = SortinoRatio::new(252, 0.0).unwrap();
for daily_return in return_stream {
    if let Some(v) = sr.update(daily_return) {
        // ...
    }
}
```

## Interpretation

- **Sortino > Sharpe usually.** Same return stream typically
  produces a higher Sortino than Sharpe because upside volatility
  doesn't penalise it.
- **Use when upside variability is good.** Trend-following
  strategies often have asymmetric return distributions —
  Sortino captures their risk-adjusted edge more faithfully than
  Sharpe.
- **MAR as goal.** Setting `mar` to a positive target (e.g. the
  hurdle rate or expected inflation) gives "Sortino over
  threshold" interpretation.

## Common pitfalls

- **Comparing to Sharpe without acknowledging the bias.** Sortino
  is structurally higher; comparing absolute values across
  metrics is meaningless.
- **MAR = mean(returns).** This pathological choice makes the
  numerator zero. Use a fixed MAR.

## References

- Frank A. Sortino & Lee N. Price, *Performance Measurement in a
  Downside Risk Framework*, *Journal of Investing*, 1994.

## See also

- [SharpeRatio](Indicator-SharpeRatio) — symmetric volatility
  baseline.
- [OmegaRatio](Indicator-OmegaRatio) — partial-moment alternative.
- [PainIndex](Indicator-PainIndex) — drawdown-based risk.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
