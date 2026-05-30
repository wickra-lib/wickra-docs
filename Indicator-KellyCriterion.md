# Kelly Criterion

> Optimal-bet-size fraction over the trailing window. Estimates the
> capital fraction to allocate using the even-money Kelly formula
> generalised by the payoff ratio. Wickra reports raw Kelly —
> most practitioners use a half-Kelly or quarter-Kelly multiplier
> in practice to reduce variance.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Risk / Performance                                                   |
| Input type          | `f64` — one period return (or trade P&L) per update                  |
| Output type         | `f64`                                                                |
| Output range        | unbounded; typically `(0, 1)` for profitable strategies              |
| Default parameters  | `period` required                                                    |
| Warmup period       | `period`                                                             |
| Interpretation      | Recommended capital fraction to bet                                   |

## Formula

```
win_rate     = P(r > 0) over window
avg_win      = mean(r for r > 0)
avg_loss     = mean(-r for r < 0)
payoff_ratio = avg_win / avg_loss
Kelly        = win_rate - (1 - win_rate) / payoff_ratio
```

Edge cases:

- **No winners and no losers** → `0.0` (no information).
- **No losers** (`payoff_ratio = ∞`) → Kelly collapses to the
  win rate.
- **No winners but losers present** → Kelly negative — bet
  nothing (or short).

See `crates/wickra-core/src/indicators/kelly_criterion.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 0`      | Rolling window of returns / trade P&Ls. |

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Standard binding shapes.

## Warmup

`warmup_period() == period`.

## Edge cases

- **Negative Kelly.** Strategy has negative edge in window —
  reduce or invert exposure.
- **Window length.** Short windows (`period = 20`) give noisy
  Kelly; recommend ≥ 100 trades / bars.
- **Reset.** Clears the rolling window.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, KellyCriterion};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let returns: Vec<f64> = (0..100)
        .map(|i| (f64::from(i) * 0.2).sin() * 0.01 + 0.002)
        .collect();
    let mut k = KellyCriterion::new(50)?;
    println!("row 80 Kelly = {:?}", k.batch(&returns)[80]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

returns = np.sin(np.linspace(0, 20, 100)) * 0.01 + 0.002
k = ta.KellyCriterion(50)
print('row 80:', k.batch(returns)[80])
```

### Node

```javascript
const wickra = require('wickra');
const k = new wickra.KellyCriterion(50);
const returns = Array.from({ length: 100 }, (_, i) => Math.sin(i * 0.2) * 0.01 + 0.002);
console.log('row 80:', k.batch(returns)[80]);
```

### Streaming

```rust
use wickra::{Indicator, KellyCriterion};

let mut k = KellyCriterion::new(100).unwrap();
for trade_pnl in trade_stream {
    if let Some(v) = k.update(trade_pnl) {
        let half_kelly = v * 0.5;  // conservative sizing
        // size next bet at half_kelly · capital
    }
}
```

## Interpretation

- **Full Kelly.** Maximises long-run geometric growth — but high
  variance. Few practitioners actually trade full Kelly.
- **Half-Kelly.** Halves variance at modest cost to growth —
  common practitioner choice.
- **Quarter-Kelly.** Very conservative; typical for institutional
  capital with low drawdown tolerance.
- **Negative Kelly.** Strategy has lost its edge; reduce or stop.

## Common pitfalls

- **Trading full Kelly on noisy estimates.** Kelly is highly
  sensitive to win-rate / payoff estimates; over-betting on
  shaky estimates blows up.
- **Confusing Kelly with optimal sizing.** Kelly maximises
  *geometric* growth, not utility. Risk-averse investors should
  size below Kelly.
- **Window choice.** Backtest Kelly with realistic windows.
  Looking back over the entire backtest sample gives an
  optimistic estimate.

## References

- John L. Kelly Jr., *A New Interpretation of Information Rate*,
  *Bell System Technical Journal*, 1956 — original formulation.
- Edward Thorp, *The Kelly Criterion in Blackjack, Sports
  Betting, and the Stock Market*, *International Symposium on
  Sports Statistics*, 2006 — practitioner overview.

## See also

- [ProfitFactor](Indicator-ProfitFactor) — building block.
- [GainLossRatio](Indicator-GainLossRatio) — payoff-ratio cousin.
- [SharpeRatio](Indicator-SharpeRatio) — alternative
  size-optimisation reference.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
