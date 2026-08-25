# Sharpe Ratio

> The canonical risk-adjusted return metric. Mean excess return
> (over a risk-free rate) divided by the standard deviation of
> returns. Wickra's rolling Sharpe runs over the trailing `period`
> period-returns and uses sample standard deviation (`n − 1`
> denominator). Each update is O(1) via Welford-style running
> sums.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Risk / Performance                                                   |
| Input type          | `f64` — one period return per update                                 |
| Output type         | `f64`                                                                |
| Output range        | unbounded                                                            |
| Default parameters  | `period`, `risk_free_per_period` both required                       |
| Warmup period       | `period`                                                             |
| Interpretation      | `> 1` good, `> 2` great, `> 3` exceptional (period-frequency aware)  |

## Formula

```
Sharpe = (mean(returns) − risk_free_per_period) / stddev(returns)
```

`stddev` is the sample standard deviation with `n − 1` in the
denominator. Wickra does not annualise — feed already-annualised
returns and supply an annual risk-free rate if you want an
annualised Sharpe. See
`crates/wickra-core/src/indicators/sharpe_ratio.rs`.

## Parameters

| Name                   | Type    | Default | Constraint | Description |
|------------------------|---------|---------|------------|-------------|
| `period`               | `usize` | none    | `> 1`      | Rolling window of period returns. |
| `risk_free_per_period` | `f64`   | none    | finite     | Per-period risk-free rate (e.g. `0.0` for excess-of-zero). |

`SharpeRatio::new` returns `Error::InvalidPeriod` for `period < 2`.

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Python:
`SharpeRatio(period, rf).batch(returns)` returns an `array.array('d')`
with `NaN` for the warmup prefix. Node: same shape;
`update(return)` returns `number | null`.

## Warmup

`warmup_period() == period`. First emission lands at input
`period`.

## Edge cases

- **Zero variance.** A flat window has zero standard deviation;
  the indicator returns `0.0` rather than `NaN`.
- **Negative mean return.** Sharpe goes negative; this is correct
  and meaningful.
- **Frequency awareness.** Sharpe value depends on return
  frequency. Daily Sharpe ≠ Annual Sharpe. Multiply by
  `sqrt(periods_per_year)` for annualisation.
- **Reset.** Clears the rolling window and running sums.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, SharpeRatio};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let returns: Vec<f64> = (0..100)
        .map(|i| 0.001 + (f64::from(i) * 0.1).sin() * 0.01)
        .collect();
    let mut sr = SharpeRatio::new(20, 0.0)?;
    println!("row 50 = {:?}", sr.batch(&returns)[50]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

returns = 0.001 + np.sin(np.linspace(0, 10, 100)) * 0.01
sr = ta.SharpeRatio(20, 0.0)
out = sr.batch(returns)
print('row 50:', out[50])
```

### Node

```javascript
const wickra = require('wickra');
const sr = new wickra.SharpeRatio(20, 0.0);
const returns = Array.from({ length: 100 }, (_, i) => 0.001 + Math.sin(i * 0.1) * 0.01);
console.log('row 50:', sr.batch(returns)[50]);
```

### Streaming

```rust
use wickra::{Indicator, SharpeRatio};

let mut sr = SharpeRatio::new(252, 0.04 / 252.0).unwrap();  // daily, 4% annual RF
let return_stream: Vec<f64> = Vec::new(); // your stream of periodic returns
for daily_return in return_stream {
    if let Some(v) = sr.update(daily_return) {
        // v is daily Sharpe; multiply by sqrt(252) for annualised
    }
}
```

## Interpretation

- **Sharpe > 1.** Good — meaningful risk-adjusted return.
- **Sharpe > 2.** Great — comparable to top hedge funds.
- **Sharpe > 3.** Exceptional, likely involves either an
  illiquidity premium or curve-fitting in a backtest.
- **Negative Sharpe.** Strategy lost money or underperformed
  risk-free.
- **Frequency note.** Sharpe is frequency-dependent. Daily
  Sharpe is `1/√252` of annualised Sharpe for IID returns.

## Common pitfalls

- **Annualising sample bias.** Multiplying daily Sharpe by
  `√252` assumes IID; serial-correlated returns underweight the
  annualisation factor.
- **Mismatched risk-free rate.** Use a per-period RF matching the
  return frequency. Daily returns paired with annual RF gives
  garbage.
- **Comparing across regimes.** A trending market produces high
  Sharpe even for mediocre strategies. Out-of-sample backtests
  are essential.

## References

- William F. Sharpe, *Mutual Fund Performance*, *Journal of
  Business*, 1966 — original Sharpe Ratio derivation.
- William F. Sharpe, *The Sharpe Ratio*, *Journal of Portfolio
  Management*, 1994 — refined modern treatment.

## See also

- [SortinoRatio](/Indicators/Indicator-SortinoRatio) — downside-only
  volatility variant.
- [CalmarRatio](/Indicators/Indicator-CalmarRatio) — return-over-max-drawdown
  alternative.
- [InformationRatio](/Indicators/Indicator-InformationRatio) —
  benchmark-relative Sharpe.
- [TreynorRatio](/Indicators/Indicator-TreynorRatio) — beta-relative Sharpe.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
