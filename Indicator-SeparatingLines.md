# SeparatingLines

> Two-bar continuation. After a counter-trend candle, the next candle of
> the *opposite* colour opens right back at the prior open and runs as an
> opening marubozu in the trend direction — the trend "separates" from the
> pullback and resumes.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` bullish, `-1.0` bearish, `0.0` otherwise |
| Output range | `{-1.0, 0.0, +1.0}` |
| Default parameters | none — `SeparatingLines::new()` |
| Warmup period | `2` (first bar always `0.0`) |
| Interpretation | Trend continuation after a one-bar counter-move |

## Formula

```
long body = |close − open| >= 0.5 · (high − low)
bar1, bar2 opposite colours
bar2 opens at bar1's open:  |open2 − open1| <= 0.05 · range1
bar2 is a long opening marubozu in its direction:
  white bar2: open2 == low2  (no lower shadow)  -> +1.0
  black bar2: open2 == high2 (no upper shadow)  -> -1.0
```

The shared open is the "separating line"; the sign follows the second
(trend-direction) candle. See
`crates/wickra-core/src/indicators/separating_lines.rs`.

## Parameters

None. Constructed with `SeparatingLines::new()`.

## Signed ±1 encoding

Emits the uniform candlestick sign convention — `+1.0` bullish, `−1.0` bearish,
`0.0` no pattern — a single feature-matrix dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, SeparatingLines, Candle};
// SeparatingLines: Input = Candle, Output = f64
const _: fn(&mut SeparatingLines, Candle) -> Option<f64> = <SeparatingLines as Indicator>::update;
```

- **Always emits a value.** Never `None`; warmup and no-match bars return `0.0`.
- **Node.** `update(open, high, low, close)` → `number`; `batch(open, high, low,
  close)` → `Array<number>`.
- **Python.** `update(candle)` → `float`; `batch(open, high, low, close)` → 1-D
  `numpy.ndarray` (`0.0` on warmup / no-match).

## Warmup

`warmup_period() == 2`. The first bar returns `0.0` (`first_bar_returns_zero`,
`accessors_and_metadata`).

## Edge cases

- **Colours must oppose.** Same-coloured bars yield `0.0`
  (`same_color_yields_zero`).
- **Opens must match.** A different open yields `0.0`
  (`different_open_yields_zero`).
- **Opening-side shadow.** The second bar must open at its extreme (marubozu
  open); an opening shadow yields `0.0` (`opening_shadow_yields_zero`).
- **Reset.** `reset()` clears the one-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, SeparatingLines};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = SeparatingLines::new();
    println!("{:?}", t.update(Candle::new(12.0, 12.1, 9.9, 10.0, 1.0, 0)?)); // black pullback
    println!("{:?}", t.update(Candle::new(12.0, 14.1, 12.0, 14.0, 1.0, 1)?)); // white, opens at 12, runs up
    Ok(())
}
```

Output:

```
Some(0.0)
Some(1.0)
```

The white bar opens at `12.0` (same as bar1's open) with no lower shadow and runs
up — a bullish separating line. This matches
`bullish_separating_lines_is_plus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([12.0, 12.0])
h = np.array([12.1, 14.1])
l = np.array([9.9,  12.0])
c = np.array([10.0, 14.0])

print(ta.SeparatingLines().batch(o, h, l, c))  # [0. 1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.SeparatingLines();
t.update(12, 12.1, 9.9, 10);
console.log(t.update(12, 14.1, 12, 14)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, SeparatingLines};

let mut t = SeparatingLines::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    match t.update(bar) {
        Some(1.0)  => { /* uptrend resumes after a one-bar dip */ }
        Some(-1.0) => { /* downtrend resumes after a one-bar pop */ }
        _ => {}
    }
}
```

## Interpretation

1. **Pullback rejected at the open.** Re-opening at the prior open and running
   the trend way shows the counter-move was a one-bar blip — continuation.
2. **Marubozu strength.** The trend-direction candle opening at its extreme
   (no opening shadow) is what gives the signal its conviction.
3. **Confirm with the trend.** Continuation pattern; use within a trend.

## Common pitfalls

- **Loose open match.** The two opens must be essentially equal (within 5 % of
  range), not just close.
- **Opening shadow.** A trend candle with an opening shadow is not a separating
  line.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [OpeningMarubozu](Indicator-OpeningMarubozu) — the marubozu the second bar
  forms.
- [GapSideBySideWhite](Indicator-GapSideBySideWhite) — gap-based continuation.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
