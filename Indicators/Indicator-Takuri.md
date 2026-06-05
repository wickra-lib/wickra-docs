# Takuri

> Single-bar bullish reversal — a stricter Dragonfly Doji. Open, close
> and high sit at the very top with a negligible upper shadow, while an
> exceptionally long lower shadow shows price was driven down sharply and
> then bid all the way back: an emphatic rejection of the lows.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` bullish, `0.0` otherwise (never `-1.0`) |
| Output range | `{0.0, +1.0}` |
| Default parameters | none — `Takuri::new()` |
| Warmup period | `1` |
| Interpretation | Bullish rejection of the lows; stronger than a plain dragonfly |

## Formula

```
range = high − low
doji body:        |close − open| <= 0.1  · range
negligible upper: high − max(open, close) <= 0.05 · range
very long lower:  min(open, close) − low  >= 0.7  · range
```

Bullish-only (never `−1.0`). The tighter upper-shadow ceiling (`5 %` vs the
dragonfly's `10 %`) and longer lower-shadow floor (`70 %` vs `50 %`) make Takuri
a strict subset of [DragonflyDoji](/Indicators/Indicator-DragonflyDoji). Thresholds are
geometric, not TA-Lib rolling averages. See
`crates/wickra-core/src/indicators/takuri.rs`.

## Parameters

None. Constructed with `Takuri::new()`.

## Signed ±1 encoding

Single-direction shape: `+1.0` bullish, `0.0` no pattern — one feature-matrix
dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, Takuri, Candle};
// Takuri: Input = Candle, Output = f64
const _: fn(&mut Takuri, Candle) -> Option<f64> = <Takuri as Indicator>::update;
```

- **Always emits a value.** Never `None`; non-matching bars return `0.0`.
- **Node.** `update(open, high, low, close)` → `number`; `batch(open, high, low,
  close)` → `Array<number>`.
- **Python.** `update(candle)` → `float`; `batch(open, high, low, close)` → 1-D
  `numpy.ndarray` (`0.0` on no-match).

## Warmup

`warmup_period() == 1` — a single-bar pattern emits from the first candle
(`accessors_and_metadata`).

## Edge cases

- **Body too large.** A bar that is not a doji yields `0.0`
  (`non_doji_body_yields_zero`).
- **Upper shadow.** Any meaningful upper shadow disqualifies it
  (`upper_shadow_yields_zero`); even a bar that *would* pass as a dragonfly
  (upper shadow ≈ 7 % of range) fails Takuri's tighter `5 %` ceiling
  (`dragonfly_but_not_takuri_yields_zero`).
- **Zero range.** A flat bar yields `0.0` (`zero_range_yields_zero`).
- **Reset.** `reset()` clears the has-emitted flag (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, Takuri};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = Takuri::new();
    // Body at the top (open=close=10, high=10.05), very long lower shadow to 7.0.
    println!("{:?}", t.update(Candle::new(10.0, 10.05, 7.0, 10.0, 1.0, 0)?));
    Ok(())
}
```

Output:

```
Some(1.0)
```

`range = 3.05`, body `0`, upper shadow `0.05` (`< 0.05·3.05`), lower shadow
`3.0` (`> 0.7·3.05`). This matches the `takuri_is_plus_one` unit test.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([10.0])
h = np.array([10.05])
l = np.array([7.0])
c = np.array([10.0])

print(ta.Takuri().batch(o, h, l, c))  # [1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.Takuri();
console.log(t.update(10, 10.05, 7.0, 10)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, Takuri};

let mut t = Takuri::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if t.update(bar) == Some(1.0) { /* strong rejection of the lows */ }
}
```

## Interpretation

1. **Rejection of the lows.** The deep lower shadow that closes back at the high
   is a hard bid response — a bullish reversal cue, strongest at the bottom of a
   downtrend or at support.
2. **Stronger than a dragonfly.** Because Takuri demands a longer lower shadow
   and a cleaner top, a Takuri print is a higher-conviction version of the
   [DragonflyDoji](/Indicators/Indicator-DragonflyDoji) signal.
3. **Confirm.** Pair with support context or a follow-through up candle.

## Common pitfalls

- **Treating any dragonfly as a Takuri.** Most dragonflies do *not* clear
  Takuri's tighter thresholds; the distinction is intentional.
- **No location context.** A Takuri mid-range is far less meaningful than one at
  a tested low.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [DragonflyDoji](/Indicators/Indicator-DragonflyDoji) — the looser parent pattern.
- [Hammer](/Indicators/Indicator-Hammer) — small body at the top with a long lower shadow.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
