# OpeningMarubozu

> Single-bar strong-momentum candle with a long body and **no shadow on
> the open end**. White opens right at the low; black opens right at the
> high. The shaved open shows the move took off from the bell without
> hesitation.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` white, `-1.0` black, `0.0` otherwise |
| Output range | `{-1.0, 0.0, +1.0}` |
| Default parameters | none — `OpeningMarubozu::new()` |
| Warmup period | `1` |
| Interpretation | Momentum from the open; conviction at the start of the bar |

## Formula

```
range = high − low
long body:  |close − open| >= 0.7 · range
white (+1.0): close > open  and  open − low  <= 0.05 · range   (open at the low)
black (-1.0): close < open  and  high − open <= 0.05 · range   (open at the high)
```

The body must dominate the bar (`≥ 70 %` of range) and the *open* end must be
effectively shaved (within `5 %` of range); the close end may carry a shadow.
Thresholds are geometric, not TA-Lib rolling averages. See
`crates/wickra-core/src/indicators/opening_marubozu.rs`.

## Parameters

None. Constructed with `OpeningMarubozu::new()`.

## Signed ±1 encoding

Emits the uniform candlestick sign convention — `+1.0` bullish (white), `−1.0`
bearish (black), `0.0` no pattern — a single feature-matrix dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, OpeningMarubozu, Candle};
// OpeningMarubozu: Input = Candle, Output = f64
const _: fn(&mut OpeningMarubozu, Candle) -> Option<f64> = <OpeningMarubozu as Indicator>::update;
```

- **Always emits a value.** Never `None`; non-matching bars return `0.0`.
- **Node.** `update(open, high, low, close)` → `number`; `batch(open, high, low,
  close)` → `Array<number>`.
- **Python.** `update(candle)` → `float`; `batch(open, high, low, close)` → 1-D
  `array.array('d')` (`0.0` on no-match).

## Warmup

`warmup_period() == 1` — a single-bar pattern emits from the first candle.
Pinned by `accessors_and_metadata`.

## Edge cases

- **Shadow on the open end.** A white bar that opens above the low (clear lower
  shadow) yields `0.0` (`white_with_lower_shadow_yields_zero`); the black mirror
  is `black_with_upper_shadow_yields_zero`.
- **Short body.** A body under `70 %` of range is not a marubozu
  (`short_body_yields_zero`).
- **Zero range.** A flat bar yields `0.0` (`zero_range_yields_zero`).
- **Reset.** `reset()` clears the has-emitted flag (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, OpeningMarubozu};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut m = OpeningMarubozu::new();
    // White: opens at the low (10), small closing shadow above (high 15).
    println!("{:?}", m.update(Candle::new(10.0, 15.0, 10.0, 14.5, 1.0, 0)?));
    // Black: opens at the high (15), small closing shadow below (low 10).
    println!("{:?}", m.update(Candle::new(15.0, 15.0, 10.0, 10.5, 1.0, 1)?));
    Ok(())
}
```

Output:

```
Some(1.0)
Some(-1.0)
```

These match `white_opening_marubozu_is_plus_one` and
`black_opening_marubozu_is_minus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([10.0, 15.0])
h = np.array([15.0, 15.0])
l = np.array([10.0, 10.0])
c = np.array([14.5, 10.5])

print(ta.OpeningMarubozu().batch(o, h, l, c))  # [ 1. -1.]
```

### Node

```javascript
const ta = require('wickra');
const m = new ta.OpeningMarubozu();
console.log(m.update(10, 15, 10, 14.5));  // 1
console.log(m.update(15, 15, 10, 10.5));  // -1
```

### Streaming

```rust
use wickra::{Candle, Indicator, OpeningMarubozu};

let mut m = OpeningMarubozu::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    match m.update(bar) {
        Some(1.0)  => { /* white opening marubozu — bulls seized the open */ }
        Some(-1.0) => { /* black opening marubozu — bears seized the open */ }
        _ => {}
    }
}
```

## Interpretation

1. **Conviction at the open.** Opening at the extreme and then running shows one
   side took control immediately — a momentum cue in the body direction, often
   following an overnight gap or news.
2. **Early-session bias.** Useful on intraday bars to read who owns the session
   from the first print.
3. **Pair with the close end.** Combine with [ClosingMarubozu](/Indicators/Indicator-ClosingMarubozu)
   for end-of-bar control, or [Marubozu](/Indicators/Indicator-Marubozu) when both ends are
   shaved.

## Common pitfalls

- **No direct TA-Lib equivalent.** TA-Lib ships `CDLMARUBOZU` and
  `CDLCLOSINGMARUBOZU` but not an opening-marubozu function; this detector
  completes the pair and will not line up one-to-one with a TA-Lib call.
- **Confusing it with a full marubozu.** Only the open end is shaved here; a
  closing shadow is allowed.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [Marubozu](/Indicators/Indicator-Marubozu) — both ends shaved.
- [ClosingMarubozu](/Indicators/Indicator-ClosingMarubozu) — the close end shaved instead.
- [BeltHold](/Indicators/Indicator-BeltHold) — a related open-at-the-extreme bar.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
