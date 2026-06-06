# TasukiGap

> Three-bar continuation pattern. Two same-coloured candles open a body
> gap in the trend direction, then an opposite-coloured candle opens
> inside the second body and closes back *into* the gap without filling
> it. The surviving gap says the trend is only pausing, not turning.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` (uses `open`, `close`; `high`/`low` validated by `Candle`) |
| Output type | `f64` — `+1.0` upside, `-1.0` downside, `0.0` otherwise |
| Output range | `{-1.0, 0.0, +1.0}` |
| Default parameters | none — `TasukiGap::new()` |
| Warmup period | `3` (first two bars always `0.0`) |
| Interpretation | Trend continuation; the unfilled gap confirms the prevailing move |

## Formula

```
Upside (+1.0):
  bar1 white, bar2 white
  upside body gap:            open2 > close1
  bar3 black, opens in body:  open2 < open3 < close2
  bar3 closes in the gap:     close1 < close3 < open2

Downside (-1.0): the mirror with black candles and a downside gap
  bar1 black, bar2 black,     open2 < close1
  bar3 white, opens in body:  close2 < open3 < open2
  bar3 closes in the gap:     open2 < close3 < close1
```

The third candle reaches *into* the gap but does not close past it: an upside
setup needs `close3 > close1` (gap survives) — a close back under `close1`
fills the gap and the pattern does not fire. Thresholds use exact body-edge
comparisons (geometric house style, no rolling averages). See
`crates/wickra-core/src/indicators/tasuki_gap.rs`.

## Parameters

None. Constructed with `TasukiGap::new()`.

## Signed ±1 encoding

This pattern emits the uniform candlestick sign convention shared across the
family — `+1.0` upside (bullish continuation), `−1.0` downside (bearish
continuation), `0.0` no pattern — so it drops straight into a machine-learning
feature matrix where the two directions occupy a single dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, TasukiGap, Candle};
// TasukiGap: Input = Candle, Output = f64
const _: fn(&mut TasukiGap, Candle) -> Option<f64> = <TasukiGap as Indicator>::update;
```

- **Always emits a value.** The detector never returns `None`: warmup bars and
  no-match bars both return `0.0`.
- **Node.** `update(open, high, low, close)` returns `number`; `batch(open, high,
  low, close)` returns `Array<number>`.
- **Python.** `update(candle)` returns `float`; `batch(open, high, low, close)`
  returns a 1-D `numpy.ndarray` (`0.0` on warmup / no-match, never `NaN`).

## Warmup

`warmup_period() == 3`. The first two bars return `0.0` because the three-bar
window is not yet filled — pinned by `first_two_bars_return_zero` and the
metadata test `accessors_and_metadata`.

## Edge cases

- **Filled gap.** A third candle that closes through the gap is a reversal, not
  a tasuki — `up_third_close_not_in_gap_yields_zero` /
  `down_third_close_not_in_gap_yields_zero` pin the `0.0`.
- **Open outside the second body.** The third candle must open within the
  second real body (`up_third_open_outside_body_yields_zero`).
- **Wrong third colour.** The third candle must oppose the first two
  (`up_third_not_black_yields_zero` / `down_third_not_white_yields_zero`).
- **No gap.** Without a body gap between bars 1 and 2 there is nothing to hold
  (`up_no_gap_yields_zero` / `down_no_gap_yields_zero`).
- **Mixed leading colours.** Bars 1 and 2 differing in colour yields `0.0`
  (`mixed_colours_yield_zero`).
- **Reset.** `reset()` clears the two-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, TasukiGap};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = TasukiGap::new();
    println!("{:?}", t.update(Candle::new(10.0, 11.2, 9.8, 11.0, 1.0, 0)?));   // white
    println!("{:?}", t.update(Candle::new(12.0, 14.0, 11.9, 13.5, 1.0, 1)?));  // white, gaps up
    println!("{:?}", t.update(Candle::new(13.0, 13.1, 11.4, 11.5, 1.0, 2)?));  // black, into gap
    Ok(())
}
```

Output:

```
Some(0.0)
Some(0.0)
Some(1.0)
```

The third candle is black, opens at `13.0` inside the second body `(12, 13.5)`,
and closes at `11.5` inside the gap `(11, 12)` — an upside tasuki gap. This
matches the `upside_tasuki_gap_is_plus_one` unit test.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([10.0, 12.0, 13.0])
h = np.array([11.2, 14.0, 13.1])
l = np.array([9.8,  11.9, 11.4])
c = np.array([11.0, 13.5, 11.5])

print(ta.TasukiGap().batch(o, h, l, c))  # [0. 0. 1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.TasukiGap();
t.update(10, 11.2, 9.8, 11);     // 0
t.update(12, 14, 11.9, 13.5);    // 0
console.log(t.update(13, 13.1, 11.4, 11.5)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, TasukiGap};

let mut t = TasukiGap::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    match t.update(bar) {
        Some(1.0)  => { /* upside gap holds — uptrend continuation */ }
        Some(-1.0) => { /* downside gap holds — downtrend continuation */ }
        _ => {}
    }
}
```

## Interpretation

1. **Stay-with-trend signal.** Inside an uptrend the upside tasuki gap is a
   one-bar pause: the counter-coloured candle dips into the gap but fails to
   close it, so the prior gap-up still anchors the move. The downside variant
   is the mirror inside a downtrend.
2. **Not a reversal.** Unlike engulfing or piercing patterns, tasuki gaps
   argue for continuation. Read a *filled* gap (which this detector suppresses)
   as the warning sign instead.
3. **Confirm the trend.** Because the pattern is direction-agnostic about
   context, pair it with a trend filter (e.g. price above a rising
   [Ema](/Indicators/Indicator-Ema)) so a "continuation" is continuing something real.

## Common pitfalls

- **Treating it as a reversal.** The opposite-coloured third candle looks like
  a turn but the held gap means continuation.
- **Ignoring the gap rule.** A near-miss where the third candle closes a hair
  past the gap edge does not qualify — the comparison is strict.
- **No trend context.** In a flat range, gaps are noise; the pattern is only
  meaningful within an established trend.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [UpsideGapThreeMethods](/Indicators/Indicator-UpsideGapThreeMethods) — gap continuation
  where the third candle *does* partly fill the gap.
- [GapSideBySideWhite](/Indicators/Indicator-GapSideBySideWhite) — twin white candles after
  an upside gap.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
