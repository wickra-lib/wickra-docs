# TD Risk Level

> Tom DeMark's protective-stop levels derived from setup extremes.
> Computes a quantitative stop level for trades taken on the back
> of a completed setup, using the bar that made the most-extreme
> price during the setup run and that bar's true range. Buy risk
> sits one true-range below the lowest low of the buy setup; sell
> risk one true-range above the highest high of the sell setup.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | DeMark                                                               |
| Input type          | `Candle`                                                             |
| Output type         | `TdRiskLevelOutput { buy_risk, sell_risk }`                          |
| Output range        | unbounded (price-units), or `NaN`                                    |
| Default parameters  | `lookback = 4`, `target = 9` (same as TdSetup)                       |
| Warmup period       | `lookback + 1`                                                       |
| Interpretation      | Quantitative stop level for setup-driven entries                      |

## Formula

```
For a completed buy setup:
    low_extreme_bar = bar with the lowest low among the setup's 9 bars
    tr_extreme     = true_range of that bar
                   = max(high - low,
                         |high - prev_close|,
                         |low - prev_close|)
    buy_risk = low_extreme_bar.low - tr_extreme

For a completed sell setup (mirror):
    high_extreme_bar = bar with the highest high among the setup's 9 bars
    tr_extreme       = true_range of that bar
    sell_risk = high_extreme_bar.high + tr_extreme
```

Either field is `f64::NAN` until the first setup in that direction
completes. Once set, the level stays until the next setup in that
direction completes. See
`crates/wickra-core/src/indicators/td_risk_level.rs`.

## Parameters

| Name       | Type    | Default | Constraint | Description |
|------------|---------|---------|------------|-------------|
| `lookback` | `usize` | `4`     | `> 0`      | Setup-phase close-vs-close lookback. |
| `target`   | `usize` | `9`     | `> 0`      | Setup completion target. |

`TdRiskLevel::new` returns `Error::PeriodZero` for zero arguments.

## Inputs / Outputs

`Indicator<Input = Candle, Output = TdRiskLevelOutput>` with two
fields (`buy_risk`, `sell_risk`).

- **Python.** `(n, 2)` `float64` array, columns
  `[buy_risk, sell_risk]` with `NaN`-filled warmup.
- **Node.** Flat `number[]` of length `n * 2`, interleaved.

## Warmup

`warmup_period() == lookback + 1`. Until at least one setup
completes in each direction, the corresponding field is `NaN`.

## Edge cases

- **No setup completed yet.** Both fields are `NaN`.
- **True range using previous close.** The implementation
  correctly uses the *prior* bar's close, not the extreme bar's
  own close, in the true-range calculation — matching DeMark's
  published methodology.
- **NaN comparison.** Downstream code must explicitly check
  `is_nan()` before using the level.
- **Reset.** Clears all internal state.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, TdRiskLevel};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..30).map(|i| {
        let c = 100.0 - f64::from(i) * 0.5;
        Candle::new(c, c + 0.3, c - 0.3, c, 1.0, i as i64).unwrap()
    }).collect();
    let mut tr = TdRiskLevel::new(4, 9)?;
    if let Some(o) = tr.batch(&candles)[25] {
        println!("buy stop  = {}  (NaN if no buy setup yet)", o.buy_risk);
        println!("sell stop = {}", o.sell_risk);
    }
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

close = 100 - np.arange(30, dtype=float) * 0.5
tr = ta.TdRiskLevel(4, 9)
print('row 25:', tr.batch(close + 0.3, close - 0.3, close)[25])
```

### Node

```javascript
const wickra = require('wickra');
const tr = new wickra.TdRiskLevel(4, 9);
const close = Array.from({ length: 30 }, (_, i) => 100 - i * 0.5);
const flat = tr.batch(close.map(c => c + 0.3), close.map(c => c - 0.3), close);
console.log('row 25 buy stop:', flat[25 * 2]);
```

### Streaming

```rust
use wickra::{Candle, Indicator, TdRiskLevel};

let mut tr = TdRiskLevel::new(4, 9).unwrap();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if let Some(o) = tr.update(bar) {
        // If you're long on a buy setup, exit when close drops below buy_risk
        if !o.buy_risk.is_nan() && bar.close < o.buy_risk {
            // stop out
        }
    }
}
```

## Interpretation

- **Protective stop.** TD Risk Level is DeMark's *recommended
  stop* for trades taken on a completed setup. The
  one-true-range buffer below the setup's lowest low (for longs)
  acknowledges that the actual extreme may need room to breathe.
- **Less aggressive than TDST.** Compared to
  [TdLines](Indicator-TdLines)' TDST levels (which mark
  thesis-invalidation), TD Risk Level is a hard exit stop. TDST
  is a "the bullish setup is wrong" signal; TD Risk Level is a
  "get out at this price".
- **Pairs with Sequential entries.** Use as stop on Countdown-13
  entries; if the move resumes through the level, the exhaustion
  thesis was wrong.

## Common pitfalls

- **Forgetting `NaN`.** Same as TdLines — fields are `NaN` until
  the first setup in that direction completes.
- **Confusing with TDST.** TDST is the thesis-invalidation level
  (highest high of buy setup); Risk Level is the protective stop
  (low − TR of the extreme bar). Different levels with different
  trade meaning.
- **Wrong direction usage.** `buy_risk` comes from *buy* setups
  (the lowest low + buffer); `sell_risk` from sell setups. Don't
  swap.

## References

- Tom DeMark, *DeMark Indicators* (with Jason Perl, 2008) —
  protective-stop methodology.

## See also

- [TdSetup](Indicator-TdSetup) — the setup phase Risk Level is
  derived from.
- [TdSequential](Indicator-TdSequential) — pairs with Risk Level
  for completed entries.
- [TdLines](Indicator-TdLines) — alternative invalidation level
  (TDST).
- [Atr](Indicator-Atr) — the volatility unit used in the
  true-range buffer.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
