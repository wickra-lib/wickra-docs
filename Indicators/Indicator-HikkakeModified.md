# HikkakeModified

> Dan Chesler's Modified Hikkake (TA-Lib `CDLHIKKAKEMOD`) — a refinement of the
> [Hikkake](/Indicators/Indicator-Hikkake) trap. Two nested inside bars coil the
> market, the first inside bar already closes near the extreme the false break
> will run towards, and the fourth bar breaks out of the second inside bar the
> wrong way.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` bullish, `-1.0` bearish, `0.0` otherwise |
| Output range | `{-1.0, 0.0, +1.0}` |
| Default parameters | none — `HikkakeModified::new()` |
| Warmup period | `4` (first three bars return `None`) |
| Interpretation | Double-inside-bar false-breakout trap |

## Formula

```
bar2 inside bar1 : high2 < high1  &&  low2 > low1
bar3 inside bar2 : high3 < high2  &&  low3 > low2
bullish (+1.0): bar4 makes a lower high AND lower low than bar3,
                and bar2 closed near its low   (close2 <= low2  + 0.2 · range2)
bearish (-1.0): bar4 makes a higher high AND higher low than bar3,
                and bar2 closed near its high  (close2 >= high2 − 0.2 · range2)
range2 = high2 − low2
```

Compared with the plain [Hikkake](/Indicators/Indicator-Hikkake) (one inside bar,
then a break), the modified pattern needs **two** nested inside bars and a
close filter on the first inside bar: for a bullish setup it must already have
closed in the bottom fifth of its range, for a bearish one in the top fifth.
"Near" is a fixed fifth of bar 2's range — TA-Lib's `Near` factor of `0.2`
applied geometrically rather than to a rolling average of candle ranges. The
signal fires on the breakout bar 4; the later confirmation bar is not flagged
separately. Pattern-shape check only — no trend filter is applied. See
`crates/wickra-core/src/indicators/hikkake_modified.rs`.

**TA-Lib parity.** On the TA-Lib reference pattern series the signals on the
breakout bar (bar 4, the pattern's setup bar) are identical to `CDLHIKKAKEMOD`
(`±1` here, `±100` there). TA-Lib additionally emits `±200` on a later
confirmation bar; Wickra flags only the setup bar. TA-Lib sizes bodies and
shadows against 5- or 10-bar rolling averages ("candle settings"), while Wickra
sizes them against the pattern's own bars.

## Parameters

None. Constructed with `HikkakeModified::new()`.

## Signed ±1 encoding

Emits the uniform candlestick sign convention — `+1.0` bullish, `−1.0` bearish,
`0.0` no pattern — a single feature-matrix dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, HikkakeModified, Candle};
// HikkakeModified: Input = Candle, Output = f64
const _: fn(&mut HikkakeModified, Candle) -> Option<f64> = <HikkakeModified as Indicator>::update;
```

- **Warmup returns `None`.** The first three bars return `None`; from bar 4 on
  every bar emits `+1.0`, `-1.0` or `0.0`.
- **Node.** `update(open, high, low, close)` → `number | null`; `batch(open, high,
  low, close)` → `Array<number>` (`NaN` on warmup).
- **Python.** `update(candle)` → `float | None`; `batch(open, high, low, close)` →
  1-D `array.array('d')` (`NaN` on warmup, `0.0` on no-match).

## Warmup

`warmup_period() == 4`. The four-bar window must fill, so the first three bars
return `None` (`first_three_bars_return_none`, `accessors_and_metadata`).

## Edge cases

- **Bar 2 must close near the extreme.** A first inside bar that closes
  mid-range fails the close filter and yields `0.0`
  (`second_bar_close_not_near_extreme_yields_zero`).
- **Two nested inside bars.** If bar 3 is not inside bar 2 (or bar 2 not inside
  bar 1) the result is `0.0` (`not_double_inside_bar_yields_zero`).
- **Bearish mirror.** Higher high and higher low on bar 4 with bar 2 closing in
  the top fifth gives `-1.0` (`bearish_modified_hikkake_is_minus_one`).
- **Reset.** `reset()` clears the three-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, HikkakeModified};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = HikkakeModified::new();
    println!("{:?}", t.update(Candle::new(10.0, 15.0, 5.0, 12.0, 1.0, 0)?)); // wide bar
    println!("{:?}", t.update(Candle::new(11.0, 13.0, 7.0, 7.5, 1.0, 1)?));  // inside bar, closes near low
    println!("{:?}", t.update(Candle::new(9.0, 12.0, 8.0, 10.0, 1.0, 2)?));  // second inside bar
    println!("{:?}", t.update(Candle::new(9.0, 11.0, 6.0, 9.0, 1.0, 3)?));   // lower high + lower low
    Ok(())
}
```

Output:

```
None
None
None
Some(1.0)
```

Bar 2 (`13 / 7`) sits inside bar 1 (`15 / 5`) and closes at `7.5`, within
`0.2 · 6 = 1.2` of its low; bar 3 (`12 / 8`) sits inside bar 2. Bar 4 makes a
lower high (`11 < 12`) and lower low (`6 < 8`) than bar 3 — a bullish modified
hikkake. This matches `bullish_modified_hikkake_is_plus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([10.0, 11.0,  9.0, 9.0])
h = np.array([15.0, 13.0, 12.0, 11.0])
l = np.array([5.0,  7.0,  8.0,  6.0])
c = np.array([12.0, 7.5, 10.0,  9.0])

print(ta.HikkakeModified().batch(o, h, l, c))  # array('d', [nan, nan, nan, 1.0])
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.HikkakeModified();
t.update(10, 15, 5, 12);  // null
t.update(11, 13, 7, 7.5); // null
t.update(9, 12, 8, 10);   // null
console.log(t.update(9, 11, 6, 9)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, HikkakeModified};

let mut t = HikkakeModified::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    match t.update(bar) {
        Some(1.0)  => { /* false downside break — lean long */ }
        Some(-1.0) => { /* false upside break — lean short */ }
        _ => {}
    }
}
```

## Interpretation

1. **Stricter than plain hikkake.** Two nested inside bars plus the bar-2 close
   filter make the setup rarer than the single-inside-bar
   [Hikkake](/Indicators/Indicator-Hikkake) — fewer, more selective signals.
2. **Fade the trap.** Lean in the direction opposite the bar-4 break: a
   downside break after bar 2 closed near its low is read bullish, and vice
   versa.
3. **Range markets.** Like the plain hikkake, most useful in choppy ranges.

## Common pitfalls

- **No confirmation.** The signal fires on bar 4 itself; whether the break
  actually fails (price re-crossing the inside bars) is not checked — confirm
  it yourself on subsequent bars.
- **Confusing with plain hikkake.** [Hikkake](/Indicators/Indicator-Hikkake) needs one
  inside bar and the high/low break; this one needs two nested inside bars and
  the bar-2 close filter.
- **Near is geometric.** The `0.2 · range2` threshold is fixed; TA-Lib's version
  scales `Near` by a rolling average of candle ranges, so results can differ on
  the close filter.

## References

- Daniel Chesler, "Trading False Moves with the Hikkake Pattern", *Active
  Trader* (2004) — the original hikkake and its modified variant.
- TA-Lib, `CDLHIKKAKEMOD` (Modified Hikkake Pattern).
- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [Hikkake](/Indicators/Indicator-Hikkake) — the plain break-only variant.
- [Harami](/Indicators/Indicator-Harami) — the inside-bar reversal pattern.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
