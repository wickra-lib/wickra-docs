# RisingThreeMethods

> Five-bar bullish continuation. A long white candle is followed by three
> small black bars that drift back with their bodies inside its range (a brief rest),
> then a second long white candle opens above the last rest bar's close and
> closes above the first, resuming the advance (Nison; TA-Lib
> `CDLRISEFALL3METHODS`).

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` bullish, `0.0` otherwise (never `-1.0`) |
| Output range | `{0.0, +1.0}` |
| Default parameters | none — `RisingThreeMethods::new()` |
| Warmup period | `5` (first four bars return `None`) |
| Interpretation | Bullish continuation after an in-range rest |

## Formula

```
long body  = |close − open| >= 0.5 · (high − low)
small body = |close − open| <= 0.5 · body1
bar1 white & long
bar2, bar3, bar4 small black bodies, each real body overlapping bar1's
                 high/low range: min(open, close) < high1 and max(open, close) > low1,
                 with falling closes (close3 < close2, close4 < close3)
bar5 white & long, opening above bar4's close (open5 > close4)
                 and closing above bar1's close (close5 > close1)
```

Body thresholds follow the geometric house style rather than TA-Lib's rolling
averages, and no trend filter is applied. Bullish-only (never `−1.0`); the
bearish mirror is
[FallingThreeMethods](/Indicators/Indicator-FallingThreeMethods). The three resting bars
hold *inside* bar1's range (unlike [MatHold](/Indicators/Indicator-MatHold), where they gap
up and hold). Only the real body is tested, as in TA-Lib: a rest bar's shadow
may poke above bar1's high or below bar1's low as long as part of its body
lies within bar1's high-low range. Earlier releases required the whole bar,
shadows included, to stay inside. See
`crates/wickra-core/src/indicators/rising_three_methods.rs`.

**TA-Lib parity.** On the TA-Lib reference pattern series the `+1` signals
match the bullish (`+100`) signals of `CDLRISEFALL3METHODS` exactly. TA-Lib
sizes long and short bodies against rolling averages of the previous bars
("candle settings"); Wickra sizes them against the pattern's own bars.

## Parameters

None. Constructed with `RisingThreeMethods::new()`.

## Signed ±1 encoding

Single-direction shape: `+1.0` bullish, `0.0` no pattern — one feature-matrix
dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, RisingThreeMethods, Candle};
// RisingThreeMethods: Input = Candle, Output = f64
const _: fn(&mut RisingThreeMethods, Candle) -> Option<f64> = <RisingThreeMethods as Indicator>::update;
```

- **Warmup is `None`.** The first four bars return `None`; from bar 5 on every bar
  returns `+1.0` or `0.0` (no match).
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
  (`min(open, close) == high1`) counts as outside. A shadow that pokes out while
  the body overlaps still qualifies
  (`middle_shadow_outside_range_but_body_overlapping_fires`).
- **Fifth bar must make a new high.** A fifth close that does not clear bar1's
  close yields `0.0` (`bar5_not_new_high_yields_zero`).
- **First bar must be a long white body.** A flat first bar (zero range) or a
  wide-range bar with a tiny body yields `0.0` (`zero_range_first_bar_yields_zero`,
  `short_first_body_yields_zero`).
- **Rest bars must be small, black and falling.** A middle bar that is white, has
  a body larger than half of bar1's, or closes at or above the previous rest bar's
  close yields `0.0`.
- **Fifth bar must open above bar4's close** and be a long white body
  (`body5 >= 0.5 · range5`); otherwise `0.0`.
- **Reset.** `reset()` clears the four-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, RisingThreeMethods};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = RisingThreeMethods::new();
    println!("{:?}", t.update(Candle::new(10.0, 15.1, 9.9, 15.0, 1.0, 0)?));  // long white
    println!("{:?}", t.update(Candle::new(14.0, 14.1, 12.9, 13.0, 1.0, 1)?)); // small black, in range
    println!("{:?}", t.update(Candle::new(13.5, 13.6, 12.4, 12.5, 1.0, 2)?)); // small black, lower close
    println!("{:?}", t.update(Candle::new(13.0, 13.1, 11.9, 12.0, 1.0, 3)?)); // small black, lower close
    println!("{:?}", t.update(Candle::new(12.5, 16.1, 12.4, 16.0, 1.0, 4)?)); // long white, opens > 12.0, new high
    Ok(())
}
```

Output:

```
None
None
None
None
Some(1.0)
```

Three small black bars (bodies `1.0` ≤ `0.5 · 5.0`) rest with their bodies
inside the first white candle's range with falling closes, then bar 5 — a long white body opening at
`12.5`, above bar4's close `12.0` — closes at `16.0` above bar1's close `15.0` —
rising three methods. This matches
`rising_three_methods_is_plus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([10.0, 14.0, 13.5, 13.0, 12.5])
h = np.array([15.1, 14.1, 13.6, 13.1, 16.1])
l = np.array([9.9,  12.9, 12.4, 11.9, 12.4])
c = np.array([15.0, 13.0, 12.5, 12.0, 16.0])

print(ta.RisingThreeMethods().batch(o, h, l, c))  # array('d', [nan, nan, nan, nan, 1.0])
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.RisingThreeMethods();
t.update(10, 15.1, 9.9, 15);
t.update(14, 14.1, 12.9, 13);
t.update(13.5, 13.6, 12.4, 12.5);
t.update(13, 13.1, 11.9, 12);
console.log(t.update(12.5, 16.1, 12.4, 16)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, RisingThreeMethods};

let mut t = RisingThreeMethods::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if t.update(bar) == Some(1.0) { /* uptrend resumes after an in-range rest */ }
}
```

## Interpretation

1. **Healthy pause.** Three small black bars holding inside a strong white candle's
   range, then a breakout, is a textbook bullish continuation.
2. **Range-contained vs gapped.** Where the rest gaps up and holds rather than
   drifting inside, see [MatHold](/Indicators/Indicator-MatHold).
3. **Confirm with the trend.** Continuation pattern; use within an uptrend.

## Common pitfalls

- **Resting body escapes the range.** A middle bar whose *body* lies entirely
  beyond bar1's high or low disqualifies the setup; a shadow alone poking out
  does not.
- **No breakout.** The fifth candle must close above bar1's close.
- **Wrong-coloured or flat rest.** The resting bars must be black with each close
  lower than the last; a white or sideways rest bar disqualifies the setup.
- **Weak fifth bar.** Bar 5 must open above bar4's close and be a long white body,
  not just any up bar.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).
- TA-Lib `CDLRISEFALL3METHODS` — reference implementation of the shape rules.

## See also

- [FallingThreeMethods](/Indicators/Indicator-FallingThreeMethods) — the bearish mirror.
- [MatHold](/Indicators/Indicator-MatHold) — the gap-and-hold variant.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
