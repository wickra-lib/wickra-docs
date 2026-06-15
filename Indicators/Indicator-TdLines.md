# TD Lines (TDST)

> TD Setup Trend support / resistance levels. Once a TD Setup
> completes in either direction, DeMark defines two horizontal trend
> levels derived from the nine bars of that setup: TDST resistance =
> the highest high of a completed buy setup; TDST support = the
> lowest low of a completed sell setup. A break of these levels
> invalidates the corresponding setup's reversal thesis.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | DeMark                                                               |
| Input type          | `Candle`                                                             |
| Output type         | `TdLinesOutput { resistance, support }` (both `f64`, `NaN` initially)|
| Output range        | unbounded (price-units), or `NaN`                                    |
| Default parameters  | `lookback = 4`, `target = 9` (same as TdSetup)                       |
| Warmup period       | `lookback + 1`                                                       |
| Interpretation      | Break invalidates the corresponding setup's reversal thesis          |

## Formula

```
TDST_resistance = max(high) over the 9 bars of the most recently
                  completed buy setup

TDST_support    = min(low) over the 9 bars of the most recently
                  completed sell setup
```

Until a setup completes in a given direction, the corresponding
level is `f64::NAN` (no level defined). Once a level is set it
stays at its value until the next completed setup in that direction
updates it. See `crates/wickra-core/src/indicators/td_lines.rs`.

## Parameters

| Name       | Type    | Default | Constraint | Description |
|------------|---------|---------|------------|-------------|
| `lookback` | `usize` | `4`     | `> 0`      | Setup-phase close-vs-close lookback. |
| `target`   | `usize` | `9`     | `> 0`      | Setup completion target. |

`TdLines::new` returns `Error::PeriodZero` for zero arguments.

## Inputs / Outputs

`Indicator<Input = Candle, Output = TdLinesOutput>` with fields:

| Field        | Description |
|--------------|-------------|
| `resistance` | TDST resistance from the most recent completed buy setup. `NaN` if none yet. |
| `support`    | TDST support from the most recent completed sell setup. `NaN` if none yet. |

Python: `(n, 2)` array, columns `[resistance, support]` with
`NaN`-filled warmup. Node: flat `number[]` interleaved.

## Warmup

`warmup_period() == lookback + 1`. The setup runs from bar
`lookback + 1`; TDST emits only on bars where at least one setup has
completed — initial output is `(NaN, NaN)`.

## Edge cases

- **No setup completed yet.** Both fields are `NaN`.
- **Both setups completed.** Both fields hold the most recent
  level for their direction.
- **NaN comparison.** Downstream code must explicitly check
  `is_nan()` before comparing — `x > NaN` is always false in
  IEEE 754.
- **Setup running stats.** The implementation tracks the running
  max-high (for buy setup) and min-low (for sell setup) during the
  active streak so the level can be emitted immediately on setup
  completion.
- **Reset.** Clears all internal state.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, TdLines};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prices: Vec<f64> = (0..30).map(|i| 100.0 - f64::from(i) * 0.5).collect();
    let candles: Vec<Candle> = prices.iter().enumerate()
        .map(|(i, &c)| Candle::new(c, c + 0.5, c - 0.5, c, 1.0, i as i64).unwrap())
        .collect();
    let mut tl = TdLines::new(4, 9)?;
    if let Some(o) = tl.batch(&candles)[25] {
        println!("resistance = {} (NaN if no buy setup yet)", o.resistance);
        println!("support    = {}", o.support);
    }
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

close = 100 - np.arange(30, dtype=float) * 0.5
tl = ta.TDLines(4, 9)
out = tl.batch(close + 0.5, close - 0.5, close)
print('row 25:', out[25])  # [resistance, support]
```

### Node

```javascript
const wickra = require('wickra');
const tl = new wickra.TDLines(4, 9);
const close = Array.from({ length: 30 }, (_, i) => 100 - i * 0.5);
const flat = tl.batch(close.map(c => c + 0.5), close.map(c => c - 0.5), close);
console.log('row 25 resistance:', flat[25 * 2]);
console.log('row 25 support   :', flat[25 * 2 + 1]);
```

### Streaming

```rust
use wickra::{Candle, Indicator, TdLines};

let mut tl = TdLines::classic();
let candle_stream: Vec<Candle> = Vec::new(); // your live OHLCV feed
for bar in candle_stream {
    if let Some(o) = tl.update(bar) {
        if !o.resistance.is_nan() && bar.close > o.resistance {
            // Buy setup invalidated — bullish breakout above TDST
        }
        if !o.support.is_nan() && bar.close < o.support {
            // Sell setup invalidated — bearish breakdown below TDST
        }
    }
}
```

## Interpretation

- **Setup invalidation levels.** TDST resistance is where a
  completed buy setup's reversal thesis fails — a break above
  signals the bears have lost. TDST support is the mirror for sell
  setups.
- **Pairs with Sequential / Combo.** A buy Countdown 13 or Combo
  13 should be invalidated if price subsequently closes above
  TDST resistance — that's how DeMark traders handle stops.
- **Trend confirmation.** Persistent moves *through* TDST (not
  retesting it) suggest the setup's exhaustion thesis was wrong
  and the original trend was stronger than detected.

## Common pitfalls

- **Forgetting `NaN`.** Output fields are `NaN` until the first
  setup in that direction completes. Comparisons silently fail in
  most languages — gate explicitly.
- **Wrong direction usage.** `resistance` comes from *buy* setups
  (the highest high during the buy streak); `support` from *sell*
  setups. Don't swap.
- **Using TDST as primary entry signal.** It's an invalidation
  level, not a setup. Generate entries from Setup/Countdown; use
  TDST for stop / target placement.

## References

- Tom DeMark, *DeMark Indicators* (with Jason Perl, 2008) —
  formal TDST treatment.

## See also

- [TdSetup](/Indicators/Indicator-TdSetup) — the setup phase TDST is derived
  from.
- [TdSequential](/Indicators/Indicator-TdSequential) — TDST is used as
  invalidation for completed Sequentials.
- [TdRiskLevel](/Indicators/Indicator-TdRiskLevel) — alternative stop
  formulation.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
