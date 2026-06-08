# PivotReversal

> A breakout signal off the most recent confirmed swing pivots — `+1` when price
> closes back above a swing high, `−1` when it closes below a swing low.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Pivots & S/R |
| Input type | `Candle` (high / low / close) |
| Output type | `f64` |
| Output range | `{−1, 0, +1}` |
| Default parameters | `(left = 2, right = 2)` (Python) |
| Warmup period | `left + right + 1` |
| Interpretation | `+1` bullish reversal break; `−1` bearish reversal break. |

## Formula

```
pivot high: bar whose high is strictly above the `left` bars before and the
            `right` bars after it (confirmed `right` bars late)
pivot low : the mirror on lows
signal = +1 when close crosses above the last confirmed pivot high
signal = −1 when close crosses below the last confirmed pivot low
signal =  0 otherwise
```

Where [`WilliamsFractals`](/Indicators/Indicator-WilliamsFractals) merely marks the
swing points, Pivot Reversal turns each confirmed pivot into a breakout trigger: a
close back above a swing high is a bullish reversal, a close below a swing low a
bearish one. Signals fire only on the **crossing** bar. Source:
`crates/wickra-core/src/indicators/pivot_reversal.rs`.

## Parameters

| Name    | Type    | Default      | Valid range | Source | Description |
|---------|---------|--------------|-------------|--------|-------------|
| `left`  | `usize` | `2` (Python) | `>= 1`      | `pivot_reversal.rs:62` | Bars required before the pivot. |
| `right` | `usize` | `2` (Python) | `>= 1`      | `pivot_reversal.rs:62` | Bars required after the pivot (the confirmation lag). `0` for either errors with `Error::PeriodZero`. |

`params()` returns `(left, right)`; `pivot_high()`/`pivot_low()` expose the latest
confirmed levels; `value` returns the current signal if ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/pivot_reversal.rs`:

```rust
use wickra::{Candle, Indicator, PivotReversal};
// PivotReversal: Input = Candle, Output = f64
const _: fn(&mut PivotReversal, Candle) -> Option<f64> = <PivotReversal as Indicator>::update;
```

A `Candle` in, an `Option<f64>` out (`+1`/`0`/`−1`). The Python binding takes a
candle for `update` and three numpy columns `(high, low, close)` for `batch`; Node
takes `update(high, low, close)` and `batch(high[], low[], close[])` (NaN warmup).

## Warmup

`warmup_period() == left + right + 1`. A pivot needs neighbours on both sides
(`first_emission_at_warmup_period` pins this for `(1, 1)` → `3`).

## Edge cases

- **Confirms a pivot high.** A local high is recorded once its `right` bars arrive
  (`confirms_pivot_high` pins this).
- **Confirms a pivot low.** The mirror (`confirms_pivot_low` pins this).
- **Breakout up → +1.** A close crossing above the confirmed pivot high fires `+1`
  (`breakout_above_pivot_high_signals_plus_one` pins this).
- **Breakdown → −1.** A close below the confirmed pivot low fires `−1`
  (`breakdown_below_pivot_low_signals_minus_one` pins this).
- **No break → 0.** Otherwise the signal is `0` (`no_break_is_zero` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `p.reset()` clears the window, the pivots and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, PivotReversal};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut p = PivotReversal::new(1, 1)?;
    let c = |h: f64, l: f64, cl: f64| Candle::new(cl, h, l, cl, 1_000.0, 0).unwrap();
    let candles = [c(10.0,9.0,9.5), c(12.0,11.0,11.5), c(10.0,9.0,9.5), c(11.0,9.0,9.0), c(14.0,12.5,13.0)];
    println!("{:?}", p.batch(&candles).last().unwrap()); // Some(1.0)
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

p = ta.PivotReversal(2, 2)
high  = np.array([...]); low = np.array([...]); close = np.array([...])
sig = p.batch(high, low, close)  # +1 / 0 / -1
```

### Node

```javascript
const ta = require('wickra');

const p = new ta.PivotReversal(2, 2);
console.log('warmupPeriod:', p.warmupPeriod()); // 5
```

### Streaming

```rust
use wickra::{Candle, Indicator, PivotReversal};

let mut p = PivotReversal::new(2, 2).unwrap();
for candle in feed {
    match p.update(candle) {
        Some(1.0)  => println!("bullish reversal breakout"),
        Some(-1.0) => println!("bearish reversal breakdown"),
        _ => {}
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Reversal entries.** Use `+1`/`−1` as stop-and-reverse triggers; the confirmed
   pivot doubles as the protective stop.
2. **Strength via `right`.** Larger `right` confirms pivots later but filters noise;
   smaller `right` is faster but choppier.
3. **Context filter.** Combine with a trend or volume gate so you take reversals
   only where they matter.

## Common pitfalls

- **Confirmation lag.** A pivot is only known `right` bars after it forms — signals
  are inherently delayed by that much.
- **Not fractal marking.** This fires on the *breakout*, not when the pivot prints;
  for the raw swing points use [`WilliamsFractals`](/Indicators/Indicator-WilliamsFractals).
- **One-shot.** The signal fires only on the crossing bar, not while price stays
  beyond the level.

## References

The Pivot Reversal strategy is a built-in template in TradingView's Pine strategy
library; the swing-pivot definition follows Bill Williams' fractal geometry
(Williams, B., 1995).

## See also

- [Indicator-WilliamsFractals](/Indicators/Indicator-WilliamsFractals) — raw swing-point marks.
- [Indicator-ZigZag](/Indicators/Indicator-ZigZag) — connected swing pivots.
- [Indicator-Donchian](/Indicators/Indicator-Donchian) — channel breakout levels.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
