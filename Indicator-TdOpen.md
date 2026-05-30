# TD Open

> Tom DeMark's gap-reversal signal. Flags bars whose open prints
> *outside* the prior bar's range but whose subsequent action
> recovers back inside it — a classic gap-and-fade reversal
> pattern. Useful for catching exhaustion gaps where the gap-open
> turns out to be a fade rather than a continuation.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | DeMark                                                               |
| Input type          | `Candle` (uses `open`, `high`, `low`)                                |
| Output type         | `f64` — `+1.0` buy, `-1.0` sell, `0.0` no signal                     |
| Output range        | `{-1.0, 0.0, +1.0}`                                                  |
| Default parameters  | none — `TdOpen::new()`                                               |
| Warmup period       | `2`                                                                  |
| Interpretation      | Gap-and-fade reversal pattern detector                                |

## Formula

```
buy_signal  (+1.0):
    open[i] <  low[i - 1]               (gap-down open)
    high[i] >  low[i - 1]                (high recovers above the prior low)

sell_signal (-1.0):
    open[i] >  high[i - 1]               (gap-up open)
    low[i]  <  high[i - 1]                (low fades back under the prior high)

else: 0.0
```

The one-bar lookback means the indicator emits its first value on
the second input candle. See
`crates/wickra-core/src/indicators/td_open.rs`.

## Parameters

None — `TdOpen::new()` takes no arguments.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python:
`TdOpen().batch(open, high, low)` returns a 1-D `np.ndarray`
(first bar is `NaN`). Node: same shape; `update(candle)`
returns `number | null`.

## Warmup

`warmup_period() == 2`.

## Edge cases

- **No gap.** If `open` prints inside the prior range, no signal.
  Most bars on liquid instruments emit `0.0`.
- **Gap continues.** If `open < prev_low` AND `high <= prev_low`
  (gap didn't recover), no signal — the gap was a true breakout,
  not a fade.
- **Reset.** Clears the previous-bar cache.

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, TdOpen};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Bar 1: range [98, 102]
    let c1 = Candle::new(100.0, 102.0, 98.0, 100.0, 1.0, 0)?;
    // Bar 2: gap-down open at 96, recovers above prev low 98
    let c2 = Candle::new(96.0, 99.0, 95.0, 97.0, 1.0, 1)?;
    let mut td = TdOpen::new();
    let _ = td.update(c1);
    let v = td.update(c2);
    println!("signal = {v:?}");  // expect +1.0
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

o = np.array([100.0, 96.0])
h = np.array([102.0, 99.0])
l = np.array([ 98.0, 95.0])

td = ta.TdOpen()
print(td.batch(o, h, l))
```

### Node

```javascript
const wickra = require('wickra');
const td = new wickra.TdOpen();
console.log(td.batch([100, 96], [102, 99], [98, 95]));
```

### Streaming

```rust
use wickra::{Candle, Indicator, TdOpen};

let mut td = TdOpen::new();
for bar in candle_stream {
    if let Some(v) = td.update(bar) {
        if v > 0.0 { /* gap-down → fade up (buy) */ }
        if v < 0.0 { /* gap-up → fade down (sell) */ }
    }
}
```

## Interpretation

- **Gap-and-fade.** TD Open identifies the classic
  exhaustion-gap pattern: an emotional open in one direction
  that immediately reverses into the prior range. Often signals
  failed news-driven moves.
- **Day-trade timing.** Particularly useful for first-hour
  intraday systems on equity index futures — gap-fade signals
  fire often near the open and have measurable edge in
  range-bound regimes.
- **Pair with trend filter.** Gap-fades work best in range-bound
  markets; gap-continuations dominate in trending markets. Layer
  with a trend regime filter (e.g.
  [EmpiricalModeDecomposition](Indicator-EmpiricalModeDecomposition)
  near-zero or low ADX) to gate signals.

## Common pitfalls

- **Trading every signal blindly.** Single-bar gap signals have
  many false positives. Use as setup, not as full entry.
- **Mixing intraday and EOD.** A gap on minute bars is just
  noise; a gap between sessions is meaningful. Run TD Open on
  session-aggregated bars only.
- **Ignoring confirmation.** DeMark recommends waiting for the
  bar to close before acting on the signal — using intra-bar
  data introduces look-ahead bias.

## References

- Tom DeMark, *The New Science of Technical Analysis* (1994) —
  TD Open.

## See also

- [TdDifferential](Indicator-TdDifferential) — 2-bar reversal
  pattern sibling.
- [TdRangeProjection](Indicator-TdRangeProjection) — next-bar
  range projection.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
