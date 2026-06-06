# Profit Factor

> Sum of positive returns divided by absolute sum of negative
> returns. `PF > 1` means the strategy made more than it lost in
> the window. A staple backtest-report metric — easy to interpret
> and orthogonal to Sharpe / Sortino.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Risk / Performance                                                   |
| Input type          | `f64` — one period return per update                                 |
| Output type         | `f64`                                                                |
| Output range        | `[0, ∞)`; `∞` for all-positive window                                |
| Default parameters  | `period` required                                                    |
| Warmup period       | `period`                                                             |
| Interpretation      | `> 1.5` solid; `> 2` strong; `< 1` losing                            |

## Formula

```
gross_profit = Σ max(0,  r) over window
gross_loss   = Σ max(0, -r) over window
PF           = gross_profit / gross_loss
```

If `gross_loss == 0` and `gross_profit > 0`, output is
`f64::INFINITY`. If both are zero (flat window), output is `0.0`.
See `crates/wickra-core/src/indicators/profit_factor.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 0`      | Rolling window of returns. |

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Standard binding shapes.

## Warmup

`warmup_period() == period`.

## Edge cases

- **All-positive window.** PF = `Inf`.
- **All-negative window.** PF = `0`.
- **Per-trade interpretation.** Treats each input as one
  trade or period; in trade-by-trade mode, feed P&L per trade
  rather than per period.
- **Reset.** Clears the rolling window.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, ProfitFactor};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let returns: Vec<f64> = (0..100)
        .map(|i| (f64::from(i) * 0.2).sin() * 0.01)
        .collect();
    let mut pf = ProfitFactor::new(20)?;
    println!("row 50 = {:?}", pf.batch(&returns)[50]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

returns = np.sin(np.linspace(0, 20, 100)) * 0.01
pf = ta.ProfitFactor(20)
print(pf.batch(returns)[50])
```

### Node

```javascript
const wickra = require('wickra');
const pf = new wickra.ProfitFactor(20);
const returns = Array.from({ length: 100 }, (_, i) => Math.sin(i * 0.2) * 0.01);
console.log(pf.batch(returns)[50]);
```

### Streaming

```rust
use wickra::{Indicator, ProfitFactor};

let mut pf = ProfitFactor::new(100).unwrap();
let trade_stream: Vec<f64> = Vec::new(); // your per-trade P&L feed
for trade_pnl in trade_stream {
    if let Some(v) = pf.update(trade_pnl) {
        // PF > 1 = strategy ahead in window
    }
}
```

## Interpretation

- **PF > 1.5.** Solid edge — gross gains 50%+ above gross losses.
- **PF > 2.** Strong — 2x more gains than losses.
- **PF > 3.** Excellent; rarely sustained.
- **PF < 1.** Losing strategy in window.
- **PF = Inf.** Either a very lucky window or a sample-size
  artifact; treat with skepticism in real-time backtests.

## Common pitfalls

- **Backtesting bias.** Easy to overfit PF on small samples.
  Always validate out-of-sample.
- **Infinity handling.** Downstream code must handle `Inf`. Cap
  display or skip those bars.
- **Vs GainLossRatio.** PF sums; GLR averages. PF cares about
  total dollars; GLR cares about typical trade.

## References

- Standard trading-system metric; documented in Robert Pardo,
  *The Evaluation and Optimization of Trading Strategies* (2008).

## See also

- [GainLossRatio](/Indicators/Indicator-GainLossRatio) — average-based cousin.
- [OmegaRatio](/Indicators/Indicator-OmegaRatio) — threshold-aware
  generalisation.
- [KellyCriterion](/Indicators/Indicator-KellyCriterion) — uses PF inputs
  for sizing.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
