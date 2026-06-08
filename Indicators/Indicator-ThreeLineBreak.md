# ThreeLineBreak

> The trend direction of a line-break chart — a reversal needs the close to break
> the extreme of the last three lines, filtering out minor pullbacks.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Ichimoku & Charts |
| Input type | `Candle` (close) |
| Output type | `f64` |
| Output range | `{−1, +1}` |
| Default parameters | `(lines = 3)` (Python) |
| Warmup period | `2` (then data-dependent) |
| Interpretation | `+1` up trend line; `−1` down trend line. |

## Formula

```
continue: a new line draws when close exceeds the prior line's end
reverse : the trend flips when close breaks the extreme of the last `lines` lines
output  = current line direction: +1 (up) / −1 (down)
```

A line-break (kakushi) chart ignores time and small moves: it draws a line only on
a new trend extreme and flips only when the close reverses past the high/low of the
last `lines` (classically three) lines. The emitted direction therefore stays put
through minor pullbacks and changes only on a significant reversal. This is the
chart *type* reduced to its trend state — distinct from the candlestick
[`ThreeLineStrike`](/Indicators/Indicator-ThreeLineStrike) and from the alt-chart
Three-Line-Break bar builder. Source:
`crates/wickra-core/src/indicators/three_line_break.rs`.

## Parameters

| Name    | Type    | Default      | Valid range | Source | Description |
|---------|---------|--------------|-------------|--------|-------------|
| `lines` | `usize` | `3` (Python) | `>= 1`      | `three_line_break.rs:49` | Number of lines whose extreme a reversal must break. `0` errors with `Error::PeriodZero`. |

The `lines` getter returns the count; `value` returns the current direction if
ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/three_line_break.rs`:

```rust
use wickra::{Candle, Indicator, ThreeLineBreak};
// ThreeLineBreak: Input = Candle, Output = f64
const _: fn(&mut ThreeLineBreak, Candle) -> Option<f64> = <ThreeLineBreak as Indicator>::update;
```

A `Candle` in, an `Option<f64>` out (`+1`/`−1`). Python `update(candle)` /
`batch(close)`; Node `update(close)` / `batch(close[])`.

## Warmup

`warmup_period() == 2` — the minimum (seed plus one line). Actual first emission is
data-dependent: a trending series emits on the second bar (`uptrend_is_plus_one`
pins index 1 for a monotone rise).

## Edge cases

- **Uptrend → +1.** A monotone rise stays `+1` (`uptrend_is_plus_one` pins this).
- **Downtrend → −1.** A monotone fall stays `−1` (`downtrend_is_minus_one` pins
  this).
- **Small pullback.** A dip that does not break the 3-line low keeps the direction
  (`small_pullback_does_not_reverse` pins this).
- **Reversal.** A close past the 3-line extreme flips the direction
  (`break_of_three_line_extreme_reverses` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `t.reset()` clears the lines, the direction and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, ThreeLineBreak};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = ThreeLineBreak::new(3)?;
    let candles: Vec<Candle> = (0..20)
        .map(|i| { let cl = 100.0 + f64::from(i); Candle::new(cl, cl, cl, cl, 1_000.0, 0).unwrap() })
        .collect();
    println!("{:?}", t.batch(&candles).last().unwrap()); // Some(1.0)
    Ok(())
}
```

Output:

```
Some(1.0)
```

### Python

```python
import numpy as np
import wickra as ta

t = ta.ThreeLineBreak(3)
close = np.arange(20, dtype=float) + 100
print(t.batch(close)[-1])  # 1.0
```

### Node

```javascript
const ta = require('wickra');

const t = new ta.ThreeLineBreak(3);
console.log(t.batch(Array.from({length: 20}, (_, i) => 100 + i)).at(-1)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, ThreeLineBreak};

let mut t = ThreeLineBreak::new(3).unwrap();
let feed: Vec<Candle> = Vec::new(); // your live stream
for candle in feed {
    if let Some(dir) = t.update(candle) {
        // dir flips -> three-line-break reversal
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Trend filter.** Use the direction as a regime gate — trade only with the
   line-break trend.
2. **Reversal timing.** A flip is a high-conviction trend change because it required
   breaking three lines.
3. **Sensitivity.** Use `lines = 2` for a faster flip, larger for a slower, more
   selective one.

## Common pitfalls

- **Close-only.** It ignores intrabar highs/lows; signals depend solely on closes.
- **Lagging flips.** Requiring three lines means reversals confirm late by design.
- **Not the candlestick pattern.** `ThreeLineStrike` is a fixed four-candle pattern —
  unrelated geometry.

## References

Three Line Break is a classic Japanese charting method; see Steve Nison, *Beyond
Candlesticks* (1994).

## See also

- [Indicator-ThreeLineStrike](/Indicators/Indicator-ThreeLineStrike) — the candlestick pattern.
- [Indicator-Renko Bars](/Indicators/Indicator-RenkoBars) — fixed-brick alt chart.
- [Indicator-ZigZag](/Indicators/Indicator-ZigZag) — swing filter.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
