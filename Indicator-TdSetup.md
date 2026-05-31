# TD Setup

> The first half of DeMark's TD Sequential. Counts consecutive bars
> whose close is less-than (buy setup) or greater-than (sell setup)
> the close `lookback` bars earlier. A completed buy setup is a
> streak of 9 (classic target); a completed sell setup is the
> mirror. Emits a signed run length — positive for buy, negative for
> sell — making it easy to read both directions from one scalar.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | DeMark                                                               |
| Input type          | `Candle` (uses `close`)                                              |
| Output type         | `f64` — signed running count                                         |
| Output range        | `[-target, +target]` (capped at completion)                          |
| Default parameters  | `lookback = 4`, `target = 9`                                         |
| Warmup period       | `lookback + 1`                                                       |
| Interpretation      | `+9` = completed buy setup; `−9` = completed sell setup              |

## Formula

```
buy_setup: count consecutive bars with close[i] <  close[i - lookback]
sell_setup: count consecutive bars with close[i] >  close[i - lookback]

Streaks reset to zero as soon as the condition fails, or on
equality (close[i] == close[i - lookback]).

Output:
  + buy_count   if buy_count > 0
  - sell_count  if sell_count > 0
  0             otherwise

The count saturates at `target` once the setup completes; subsequent
bars satisfying the condition continue to report `target` until the
streak breaks.
```

See `crates/wickra-core/src/indicators/td_setup.rs`.

## Parameters

| Name       | Type    | Default | Constraint | Description |
|------------|---------|---------|------------|-------------|
| `lookback` | `usize` | `4`     | `> 0`      | Bars back the close is compared against. DeMark's canonical value. |
| `target`   | `usize` | `9`     | `> 0`      | The "completed" setup count (DeMark's canonical `9`). |

`TdSetup::new(lookback, target)` returns `Error::PeriodZero` for any
zero argument. `TdSetup::classic()` returns the `(4, 9)` factory.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. The signed value lets a
single scalar carry both directions. Python:
`TdSetup(lookback, target).batch(close)` returns a 1-D `np.ndarray`
with `NaN` for the warmup prefix. Node: same shape; `update(candle)`
returns `number | null`.

## Warmup

`warmup_period() == lookback + 1`. The close buffer needs `lookback`
bars; the first comparison happens on bar `lookback + 1`.

## Edge cases

- **Equal closes.** Both buy and sell streaks reset to zero on
  equality with the lookback close (`close[i] == close[i -
  lookback]`).
- **Only one streak active per bar.** Buy and sell conditions are
  mutually exclusive — at most one is non-zero.
- **Saturation at `target`.** Once a streak reaches `target` it
  stays at `target` until the condition breaks.
- **Reset.** `reset()` clears the close buffer and both streak
  counts.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, TdSetup};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let closes: Vec<f64> = (1..=20).map(f64::from).collect();
    let candles: Vec<Candle> = closes
        .iter()
        .enumerate()
        .map(|(i, &c)| Candle::new(c, c + 0.5, c - 0.5, c, 1.0, i as i64).unwrap())
        .collect();
    let mut td = TdSetup::classic();
    let out = td.batch(&candles);
    println!("row 19 = {:?}", out[19]); // monotone ramp → sell streak grows
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

# Down trend → buy setup count grows
close = 100 - np.arange(15, dtype=float)
td = ta.TdSetup(4, 9)
out = td.batch(close + 0.5, close - 0.5, close)  # h, l, c
print('warmup:', td.warmup_period())  # 5
print('last:', out[-1])  # should be 9 (capped buy setup)
```

### Node

```javascript
const wickra = require('wickra');
const td = new wickra.TdSetup(4, 9);
const close = Array.from({ length: 15 }, (_, i) => 100 - i);
// h, l, c arrays
const out = td.batch(close.map(c => c + 0.5), close.map(c => c - 0.5), close);
console.log('last:', out[out.length - 1]);
```

### Streaming

```rust
use wickra::{Candle, Indicator, TdSetup};

let mut td = TdSetup::classic();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if let Some(v) = td.update(bar) {
        if v == 9.0 { /* completed buy setup */ }
        if v == -9.0 { /* completed sell setup */ }
    }
}
```

## Interpretation

- **Setup 9.** DeMark's "first warning" of momentum exhaustion.
  Setup 9 alone is tradable as a short-term reversal — though not
  with the conviction of a full TD Sequential (Setup 9 + Countdown
  13).
- **Setup perfection.** DeMark's "perfected setup" requires the
  high (or low) of bars 8 or 9 to compare correctly against
  earlier bars in the run. Wickra emits the raw count; perfection
  must be checked externally.
- **Pairs with TdLines.** A completed setup defines TDST support
  / resistance (see [TdLines](Indicator-TdLines)) — break of that
  level invalidates the setup's reversal thesis.

## Common pitfalls

- **Treating Setup 5 as actionable.** DeMark's signals require the
  full `target` count. Mid-setup counts are informational.
- **Resetting on session boundaries.** TD Setup is bar-stream
  agnostic — do *not* reset on session boundaries; the rolling
  close window naturally handles overnight gaps.
- **Mixing lookback values.** Setting `lookback = 2` is a
  non-DeMark variation; the canonical methodology requires `4`.

## References

- Tom DeMark, *The New Science of Technical Analysis* (1994) —
  original TD Setup formulation.
- Tom DeMark, *DeMark Indicators* (2008, with Jason Perl) —
  refined parameter guidance.

## See also

- [TdSequential](Indicator-TdSequential) — pairs Setup with
  Countdown.
- [TdCountdown](Indicator-TdCountdown) — standalone Countdown.
- [TdLines](Indicator-TdLines) — TDST support / resistance.
- [TdRiskLevel](Indicator-TdRiskLevel) — protective-stop levels.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
