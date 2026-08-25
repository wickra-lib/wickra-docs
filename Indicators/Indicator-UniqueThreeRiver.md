# UniqueThreeRiver

> Three-bar bullish reversal (the "Unique Three River Bottom"). A long
> black candle, then a black candle whose body sits inside the first but
> whose long lower shadow probes a *new* low, then a small white candle
> held below the second body. The fresh low that fails to hold marks an
> exhausted decline.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` bullish, `0.0` otherwise (never `-1.0`) |
| Output range | `{0.0, +1.0}` |
| Default parameters | none — `UniqueThreeRiver::new()` |
| Warmup period | `3` (first two bars always `0.0`) |
| Interpretation | Bottoming reversal after a downtrend |

## Formula

```
bar1 long black:  open1 − close1 >= 0.5 · (high1 − low1)
bar2 black, body inside bar1's body:  open2 <= open1  and  close2 >= close1
bar2 makes a new low:  low2 < low1
bar3 small white:  close3 > open3  and  close3 − open3 <= 0.3 · (high3 − low3)
bar3 contained below bar2's body:  high3 <= close2
```

A single-direction (bullish-only) reversal — it never emits `−1.0`. The second
candle's long lower shadow undercutting the first low, only for price to recover
and print a small white candle that stays below, is the "river bottom". Body
thresholds are geometric, not TA-Lib rolling averages. See
`crates/wickra-core/src/indicators/unique_three_river.rs`.

## Parameters

None. Constructed with `UniqueThreeRiver::new()`.

## Signed ±1 encoding

Single-direction shape: `+1.0` bullish, `0.0` no pattern. Slots into a
feature matrix as one (sign-stable) dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, UniqueThreeRiver, Candle};
// UniqueThreeRiver: Input = Candle, Output = f64
const _: fn(&mut UniqueThreeRiver, Candle) -> Option<f64> = <UniqueThreeRiver as Indicator>::update;
```

- **Always emits a value.** Never `None`; warmup and no-match bars return `0.0`.
- **Node.** `update(open, high, low, close)` → `number`; `batch(open, high, low,
  close)` → `Array<number>`.
- **Python.** `update(candle)` → `float`; `batch(open, high, low, close)` → 1-D
  `array.array('d')` (`0.0` on warmup / no-match).

## Warmup

`warmup_period() == 3`. The first two bars return `0.0`
(`first_two_bars_return_zero`, `accessors_and_metadata`).

## Edge cases

- **First bar not a long black.** A white or short-bodied first bar yields `0.0`
  (`first_bar_not_black_yields_zero`, `first_bar_short_body_yields_zero`).
- **Second bar not engulfed / no new low.** The second body must sit inside the
  first and undercut its low (`second_bar_not_inside_yields_zero`,
  `second_bar_no_new_low_yields_zero`); a white second bar also fails
  (`second_bar_not_black_yields_zero`).
- **Third bar wrong shape.** It must be a *small white* candle held below the
  second body (`third_bar_not_white_yields_zero`,
  `third_bar_large_body_yields_zero`, `third_bar_not_below_second_yields_zero`).
- **Reset.** `reset()` clears the two-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, UniqueThreeRiver};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = UniqueThreeRiver::new();
    println!("{:?}", t.update(Candle::new(15.0, 15.1, 10.0, 10.5, 1.0, 0)?)); // long black
    println!("{:?}", t.update(Candle::new(14.0, 14.1, 9.0, 11.0, 1.0, 1)?));  // black, new low
    println!("{:?}", t.update(Candle::new(10.2, 10.9, 9.5, 10.4, 1.0, 2)?));  // small white, held below
    Ok(())
}
```

Output:

```
Some(0.0)
Some(0.0)
Some(1.0)
```

The second candle's low `9.0` undercuts the first's `10.0`; the small white
third candle (`high 10.9 ≤ close2 11.0`) confirms the bottom. This matches the
`unique_three_river_is_plus_one` unit test.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([15.0, 14.0, 10.2])
h = np.array([15.1, 14.1, 10.9])
l = np.array([10.0, 9.0,  9.5])
c = np.array([10.5, 11.0, 10.4])

print(ta.UniqueThreeRiver().batch(o, h, l, c))  # [0. 0. 1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.UniqueThreeRiver();
t.update(15, 15.1, 10, 10.5);
t.update(14, 14.1, 9, 11);
console.log(t.update(10.2, 10.9, 9.5, 10.4)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, UniqueThreeRiver};

let mut t = UniqueThreeRiver::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if t.update(bar) == Some(1.0) { /* potential bottom — confirm with trend/volume */ }
}
```

## Interpretation

1. **Bottoming after a decline.** The pattern is meaningful only at the foot of
   a downtrend; the new-low-that-fails is the exhaustion tell.
2. **Rare and soft.** Three-river bottoms are uncommon and weaker than an
   outright bullish engulfing — treat the signal as "watch for a turn", not
   "buy now".
3. **Confirm.** Wait for a follow-through close above the second candle's body,
   or pair with an oversold momentum reading.

## Common pitfalls

- **No downtrend context.** In isolation the geometry can appear mid-range and
  mean nothing.
- **Demanding a textbook third candle.** The third bar only needs to be a small
  white candle below the second body — not a doji.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [MorningEveningStar](/Indicators/Indicator-MorningEveningStar) — a more common three-bar
  reversal.
- [StickSandwich](/Indicators/Indicator-StickSandwich) — another three-bar bottoming shape.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
