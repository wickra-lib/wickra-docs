# Gain / Loss Ratio

> Average winning return divided by average losing return (in
> magnitude). Answers "for the typical winning bar, how big is the
> win compared to the typical losing bar?". Average-based cousin
> of [ProfitFactor](Indicator-ProfitFactor) which sums rather than
> averages.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Risk / Performance                                                   |
| Input type          | `f64` — one period return per update                                 |
| Output type         | `f64`                                                                |
| Output range        | `[0, ∞)`; `∞` for all-positive window                                |
| Default parameters  | `period` required                                                    |
| Warmup period       | `period`                                                             |
| Interpretation      | `> 1.5` typical win > 1.5× typical loss                              |

## Formula

```
avg_win  = mean(r for r in window if r > 0)
avg_loss = mean(-r for r in window if r < 0)
GLR      = avg_win / avg_loss
```

If no losers: `f64::INFINITY`. If no winners and no losers: `0.0`.
See `crates/wickra-core/src/indicators/gain_loss_ratio.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 0`      | Rolling window. |

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Standard binding shapes.

## Warmup

`warmup_period() == period`.

## Edge cases

- **No losers.** Output = `Inf`.
- **No winners.** Output = `0`.
- **Vs ProfitFactor.** GLR averages typical sizes; PF sums total
  amounts. Same data, different perspective:
  - High GLR with low PF = few large wins, many small losses
  - Low GLR with high PF = many small wins, few large losses
- **Reset.** Clears the rolling window.

## Examples

### Rust

```rust
use wickra::{BatchExt, GainLossRatio, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let returns: Vec<f64> = (0..100)
        .map(|i| (f64::from(i) * 0.2).sin() * 0.01)
        .collect();
    let mut g = GainLossRatio::new(20)?;
    println!("row 50 = {:?}", g.batch(&returns)[50]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

returns = np.sin(np.linspace(0, 20, 100)) * 0.01
g = ta.GainLossRatio(20)
print(g.batch(returns)[50])
```

### Node

```javascript
const wickra = require('wickra');
const g = new wickra.GainLossRatio(20);
const returns = Array.from({ length: 100 }, (_, i) => Math.sin(i * 0.2) * 0.01);
console.log(g.batch(returns)[50]);
```

### Streaming

```rust
use wickra::{GainLossRatio, Indicator};

let mut g = GainLossRatio::new(100).unwrap();
let trade_stream: Vec<f64> = Vec::new(); // your per-trade P&L feed
for trade_pnl in trade_stream {
    if let Some(v) = g.update(trade_pnl) {
        // Typical win/loss size ratio
    }
}
```

## Interpretation

- **GLR > 1.5.** Wins are 1.5× larger than losses on average — a
  positive-expectancy strategy if hit rate is at least 40%.
- **Pair with win rate.** Expectancy = `win_rate · GLR -
  (1 - win_rate)`. A 50% win rate with GLR 2.0 gives expectancy
  `0.5·2 - 0.5 = 0.5` (positive).
- **Trend-following profile.** Trend strategies typically have
  GLR > 2 with hit rates 30-40% (many small losses, a few
  large wins).
- **Mean-reversion profile.** MR strategies typically have GLR < 1
  with hit rates 60-70% (many small wins, occasional large losses).

## Common pitfalls

- **GLR alone is incomplete.** Pair with hit rate / win-rate
  for full picture.
- **Infinity handling.** Same as ProfitFactor — cap display or
  skip when `Inf`.

## References

- Standard performance-analytics measure; documented in any
  modern backtesting text (Pardo 2008, Lopez de Prado 2018).

## See also

- [ProfitFactor](Indicator-ProfitFactor) — sum-based cousin.
- [KellyCriterion](Indicator-KellyCriterion) — uses GLR
  components for sizing.
- [OmegaRatio](Indicator-OmegaRatio) — threshold-aware variant.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
