# FallingThreeMethods

> Five-bar bearish continuation. A long black candle is followed by three
> small white bars that drift up with their bodies inside its range (a brief rest), then
> a second long black candle opens below the last rest bar's close and closes
> below the first, resuming the decline (Nison; TA-Lib `CDLRISEFALL3METHODS`).

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `-1.0` bearish, `0.0` otherwise (never `+1.0`) |
| Output range | `{-1.0, 0.0}` |
| Default parameters | none — `FallingThreeMethods::new()` |
| Warmup period | `5` (first four bars return `None`) |
| Interpretation | Bearish continuation after an in-range rest |

## Formula

```
long body  = |close − open| >= 0.5 · (high − low)
small body = |close − open| <= 0.5 · body1
bar1 black & long
bar2, bar3, bar4 small white bodies, each real body overlapping bar1's
                 high/low range: min(open, close) < high1 and max(open, close) > low1,
                 with rising closes (close3 > close2, close4 > close3)
bar5 black & long, opening below bar4's close (open5 < close4)
                 and closing below bar1's close (close5 < close1)
```

Body thresholds follow the geometric house style rather than TA-Lib's rolling
averages, and no trend filter is applied. Bearish-only (never `+1.0`); the
bullish mirror is
[RisingThreeMethods](/Indicators/Indicator-RisingThreeMethods). Only the real body
of each rest bar is tested, as in TA-Lib: a shadow may poke above bar1's high or
below bar1's low as long as part of the body lies within bar1's high-low range.
Earlier releases required the whole bar, shadows included, to stay inside. See
`crates/wickra-core/src/indicators/falling_three_methods.rs`.

**TA-Lib parity.** On the TA-Lib reference pattern series the `−1` signals
match the bearish (`−100`) signals of `CDLRISEFALL3METHODS` exactly. TA-Lib
sizes long and short bodies against rolling averages of the previous bars
("candle settings"); Wickra sizes them against the pattern's own bars.

## Parameters

None. Constructed with `FallingThreeMethods::new()`.

## Signed ±1 encoding

Single-direction shape: `−1.0` bearish, `0.0` no pattern — one feature-matrix
dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, FallingThreeMethods, Candle};
// FallingThreeMethods: Input = Candle, Output = f64
const _: fn(&mut FallingThreeMethods, Candle) -> Option<f64> = <FallingThreeMethods as Indicator>::update;
```

- **Warmup is `None`.** The first four bars return `None`; from bar 5 on every bar
  returns `-1.0` or `0.0` (no match).
- **Node.** `update(open, high, low, close)` → `number | null`; `batch(open, high,
  low, close)` → `Array<number>` (`NaN` on warmup).
- **Python.** `update(candle)` → `float | None`; `batch(open, high, low, close)` →
  1-D `array.array('d')` (`NaN` on warmup, `0.0` on no-match).

## Warmup

`warmup_period() == 5`. The first four bars return `None` while the five-bar
window fills (`first_four_bars_return_zero`, `accessors_and_metadata`).

## Edge cases

- **Middle bodies must overlap bar1's range.** A resting bar whose whole body
  sits above bar1's high or below bar1's low yields `0.0`
  (`middle_bar_breaks_range_yields_zero`,
  `middle_body_fully_outside_range_yields_zero`); touching the boundary exactly
  counts as outside. A shadow that pokes out while the body overlaps still
  qualifies (`middle_shadow_outside_range_but_body_overlapping_fires`).
- **Fifth bar must make a new low.** A fifth close that does not clear bar1's
  close downward yields `0.0` (`bar5_not_new_low_yields_zero`).
- **First bar must be a long black body.** A flat first bar (zero range) or a
  wide-range bar with a tiny body yields `0.0` (`zero_range_first_bar_yields_zero`,
  `short_first_body_yields_zero`).
- **Rest bars must be small, white and rising.** A middle bar that is black, has a
  body larger than half of bar1's, or closes at or below the previous rest bar's
  close yields `0.0`.
- **Fifth bar must open below bar4's close** and be a long black body
  (`body5 >= 0.5 · range5`); otherwise `0.0`.
- **Reset.** `reset()` clears the four-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, FallingThreeMethods};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = FallingThreeMethods::new();
    println!("{:?}", t.update(Candle::new(15.0, 15.1, 9.9, 10.0, 1.0, 0)?));  // long black
    println!("{:?}", t.update(Candle::new(11.0, 12.1, 10.9, 12.0, 1.0, 1)?)); // small white, in range
    println!("{:?}", t.update(Candle::new(11.5, 12.6, 11.4, 12.5, 1.0, 2)?)); // small white, higher close
    println!("{:?}", t.update(Candle::new(12.0, 13.1, 11.9, 13.0, 1.0, 3)?)); // small white, higher close
    println!("{:?}", t.update(Candle::new(12.5, 12.6, 8.9, 9.0, 1.0, 4)?));   // long black, opens < 13.0, new low
    Ok(())
}
```

Output:

```
None
None
None
None
Some(-1.0)
```

Three small white bars (bodies `1.0` ≤ `0.5 · 5.0`) rest with their bodies inside the first black
candle's range with rising closes, then bar 5 — a long black body opening at
`12.5`, below bar4's close `13.0` — closes at `9.0` below bar1's close `10.0` —
falling three methods. This matches
`falling_three_methods_is_minus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([15.0, 11.0, 11.5, 12.0, 12.5])
h = np.array([15.1, 12.1, 12.6, 13.1, 12.6])
l = np.array([9.9,  10.9, 11.4, 11.9, 8.9])
c = np.array([10.0, 12.0, 12.5, 13.0, 9.0])

print(ta.FallingThreeMethods().batch(o, h, l, c))  # array('d', [nan, nan, nan, nan, -1.0])
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.FallingThreeMethods();
t.update(15, 15.1, 9.9, 10);
t.update(11, 12.1, 10.9, 12);
t.update(11.5, 12.6, 11.4, 12.5);
t.update(12, 13.1, 11.9, 13);
console.log(t.update(12.5, 12.6, 8.9, 9)); // -1
```

### Streaming

```rust
use wickra::{Candle, Indicator, FallingThreeMethods};

let mut t = FallingThreeMethods::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if t.update(bar) == Some(-1.0) { /* downtrend resumes after an in-range rest */ }
}
```

## Interpretation

1. **Healthy pause in a decline.** Three small white bars holding inside a strong black
   candle's range, then a breakdown, is a textbook bearish continuation.
2. **Stay short.** Read it as a chance to remain with the downtrend rather than
   to call a bottom.
3. **Confirm with the trend.** Continuation pattern; use within a downtrend.

## Common pitfalls

- **Resting body escapes the range.** A middle bar whose *body* lies entirely
  beyond bar1's high or low disqualifies the setup; a shadow alone poking out
  does not.
- **No breakdown.** The fifth candle must close below bar1's close.
- **Wrong-coloured or flat rest.** The resting bars must be white with each close
  higher than the last; a black or sideways rest bar disqualifies the setup.
- **Weak fifth bar.** Bar 5 must open below bar4's close and be a long black body,
  not just any down bar.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).
- TA-Lib `CDLRISEFALL3METHODS` — reference implementation of the shape rules.

## See also

- [RisingThreeMethods](/Indicators/Indicator-RisingThreeMethods) — the bullish mirror.
- [DownsideGapThreeMethods](/Indicators/Indicator-DownsideGapThreeMethods) — gap-based
  bearish continuation.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
