# MurreyMathLines

> T. H. Murrey's eighths grid over the recent trading range — each line acts as
> support/resistance, with 4/8 the mean pivot and 0/8 & 8/8 the strongest levels.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Pivots & S/R |
| Input type | `Candle` (high / low) |
| Output type | `MurreyMathLinesOutput { mm0_8 … mm8_8 }` |
| Output range | price units; `mm0_8 <= … <= mm8_8` |
| Default parameters | `(period = 64)` (Python) |
| Warmup period | `period` |
| Interpretation | 4/8 = mean; 3/8–5/8 = trading range; 0/8 & 8/8 = extremes. |

## Formula

```
HH = highest high over `period`,  LL = lowest low over `period`
step = (HH − LL) / 8
mm{i}_8 = LL + i · step       for i = 0..8
```

Murrey Math divides the active range into eighths. The **4/8** line is the major
pivot (mean); **0/8** and **8/8** are the ultimate support and resistance;
**3/8**–**5/8** bound the normal trading range; **1/8**/**7/8** are weak
"stall-and-reverse" lines. This implementation uses the price-derived eighths over
a rolling high-low frame — the practical core of the method — rather than Murrey's
full octave-quantised frame sizing. Source:
`crates/wickra-core/src/indicators/murrey_math_lines.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `64` (Python) | `>= 1`      | `murrey_math_lines.rs:84` | High-low frame length. `0` errors with `Error::PeriodZero`. |

The `period` getter returns the frame; `value` returns the current output if
ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/murrey_math_lines.rs`:

```rust
use wickra::{Candle, Indicator, MurreyMathLines, MurreyMathLinesOutput};
// MurreyMathLines: Input = Candle, Output = MurreyMathLinesOutput
const _: fn(&mut MurreyMathLines, Candle) -> Option<MurreyMathLinesOutput> =
    <MurreyMathLines as Indicator>::update;
```

A `Candle` in, an `Option<MurreyMathLinesOutput>` out. The Python binding returns
the nine levels as a tuple from `update` and an `(n, 9)` array from `batch(high,
low)`; Node returns an object with the nine fields and a flat `Float64Array` of
length `n*9`; WASM mirrors the object with camelCase keys.

## Warmup

`warmup_period() == period`. The first value lands once the frame window is full
(`first_emission_at_warmup_period` pins this).

## Edge cases

- **Even spacing.** A `[100, 180]` frame gives `step = 10` with `mm0_8 = 100`,
  `mm4_8 = 140`, `mm8_8 = 180` (`eighths_are_evenly_spaced` pins this).
- **Ordering.** `mm0_8 <= mm4_8 <= mm8_8` always (`levels_are_ordered` pins this).
- **Flat frame.** `HH == LL` collapses every line onto the price
  (`flat_frame_collapses` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `m.reset()` clears the high/low windows and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, MurreyMathLines};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut m = MurreyMathLines::new(2)?;
    let c = Candle::new(140.0, 180.0, 100.0, 140.0, 1_000.0, 0)?;
    let out = m.batch(&[c, c]).last().unwrap().unwrap();
    println!("4/8 mean = {}", out.mm4_8); // 140
    Ok(())
}
```

Output:

```
4/8 mean = 140
```

### Python

```python
import numpy as np
import wickra as ta

m = ta.MurreyMathLines(64)
high = 110 + np.sin(np.arange(120) * 0.3) * 9
low  = 90 + np.cos(np.arange(120) * 0.3) * 9
levels = m.batch(high, low)   # (n, 9)
print(levels[-1])
```

### Node

```javascript
const ta = require('wickra');

const m = new ta.MurreyMathLines(64);
console.log('warmupPeriod:', m.warmupPeriod()); // 64
```

### Streaming

```rust
use wickra::{Candle, Indicator, MurreyMathLines};

let mut m = MurreyMathLines::new(64).unwrap();
let mut last = None;
for i in 0..120 {
    let base = 100.0 + (f64::from(i) * 0.3).sin() * 10.0;
    let c = Candle::new(base, base + 1.0, base - 1.0, base, 1_000.0, 0).unwrap();
    last = m.update(c);
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Mean reversion.** Price tends to revert to the 4/8 line; fades from 0/8 or 8/8
   are the classic Murrey setups.
2. **Trading range.** Action between 3/8 and 5/8 is "in balance"; breaks toward
   1/8/7/8 warn of overextension and reversal.
3. **Frame breaks.** A close beyond 8/8 or 0/8 signals the range frame is shifting —
   the grid will recompute as new extremes enter the window.

## Common pitfalls

- **Simplified framing.** This uses the rolling high-low range, not Murrey's full
  octave quantisation; lines move as the window rolls.
- **Frame length.** Too short a `period` makes the grid jumpy; too long and it lags
  the active range.
- **Nine lines, one screen.** Plot selectively (4/8, 0/8, 8/8) to avoid clutter.

## References

Murrey, T. H. (1995), *The Murrey Math Trading System* — the eighths framework.

## See also

- [Indicator-ClassicPivots](/Indicators/Indicator-ClassicPivots) — pivot R/S ladder.
- [Indicator-Donchian](/Indicators/Indicator-Donchian) — the raw high-low channel.
- [Indicator-CentralPivotRange](/Indicators/Indicator-CentralPivotRange) — pivot central range.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
