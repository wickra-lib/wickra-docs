# Doji

> Single-bar indecision candle. A Doji prints whenever the absolute
> distance between open and close is small compared to the bar's
> total range. The canonical "neither side won" bar and the
> building block for many three-bar reversal patterns (Morning /
> Evening Star, Three Inside / Outside).

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Candlestick Patterns                                                 |
| Input type          | `Candle`                                                             |
| Output type         | `f64` — default: `+1.0` if Doji, `0.0` otherwise (directionless); signed mode: `+1.0` / `−1.0` / `0.0` |
| Output range        | `{0.0, +1.0}` (default) · `{−1.0, 0.0, +1.0}` (signed)              |
| Default parameters  | `body_threshold = 0.1`, `signed = false` (`Doji::default()`)        |
| Warmup period       | `1`                                                                  |
| Interpretation      | Indecision bar; meaningful only in context of trend / extremes       |

## Formula

```
body  = |close - open|
range = high - low

doji  = (body <= body_threshold · range)
```

By default the output is `+1.0` when a Doji is detected and `0.0`
otherwise — a directionless detection flag. See
`crates/wickra-core/src/indicators/doji.rs`.

## Signed ±1 encoding

For a drop-in machine-learning feature where every candlestick
pattern shares the same sign convention (`+1.0` bullish, `−1.0`
bearish, `0.0` none), switch the detector into signed mode with
`Doji::new().signed()` (`Doji(signed=True)` in Python,
`new Doji(true)` in Node / WASM). A *detected* Doji is then
classified by where its negligible body sits within the bar range:

```
pos = (0.5 · (open + close) − low) / (high − low)

pos > 2/3  ->  +1.0   dragonfly  (long lower shadow, bullish)
pos < 1/3  ->  −1.0   gravestone (long upper shadow, bearish)
else       ->   0.0   long-legged / standard (neutral)
```

A candle that is not a Doji (body above the threshold) emits `0.0`
in signed mode regardless of its position. The classification only
runs once the body-to-range test has already passed. Query the mode
with `is_signed()` / `isSigned()`. Switching to signed mode never
changes the default `+1.0` / `0.0` behaviour of `Doji::new()`.

## Parameters

| Name             | Type   | Default | Constraint        | Description |
|------------------|--------|---------|-------------------|-------------|
| `body_threshold` | `f64`  | `0.1`   | finite, `(0, 1]`  | Body-to-range ratio below which the bar counts as a Doji. |
| `signed`         | `bool` | `false` | —                 | Emit the dragonfly / gravestone `±1` direction instead of the directionless detection flag. |

`Doji::new()` and `Doji::default()` build the `0.1` factory.
`Doji::with_threshold(t)` returns `Error::InvalidPeriod` for an
out-of-range `t`. The consuming builder `signed()` switches a
detector into signed mode and composes with `with_threshold`.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python:
`Doji().batch(open, high, low, close)` returns a 1-D `np.ndarray`.
Node: `update(candle)` returns `number | null` (only `null` for a
non-finite candle).

## Warmup

`warmup_period() == 1`. Every bar emits.

## Edge cases

- **Zero-range bar.** `range == 0` (a four-equal-prices bar) short-
  circuits to `0.0` in both default and signed mode — direction is
  undefined when there is no range to position the body within.
- **Threshold tuning.** `body_threshold = 0.05` is strict (only
  near-perfect Dojis); `0.2` is loose. Match to the instrument's
  typical body-to-range distribution.
- **Reset.** Stateless.

## Examples

### Rust

```rust
use wickra::{Candle, Doji, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let c = Candle::new(100.0, 102.0, 98.0, 100.05, 1.0, 0)?;
    let mut d = Doji::default();
    println!("doji = {:?}", d.update(c));  // +1.0 (body 0.05 vs range 4)
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

o = np.array([100.0])
h = np.array([102.0])
l = np.array([ 98.0])
c = np.array([100.05])

d = ta.Doji()
print(d.batch(o, h, l, c))  # [1.0]
```

### Node

```javascript
const wickra = require('wickra');
const d = new wickra.Doji();
console.log(d.batch([100], [102], [98], [100.05]));
```

### Signed mode

```rust
use wickra::{Candle, Doji, Indicator};

let mut d = Doji::new().signed();
// Dragonfly: body at the top, long lower shadow -> bullish.
let dragonfly = Candle::new(100.0, 100.1, 96.0, 100.0, 1.0, 0).unwrap();
assert_eq!(d.update(dragonfly), Some(1.0));
```

```python
import wickra as ta

d = ta.Doji(signed=True)
# Gravestone: body at the bottom, long upper shadow -> bearish.
print(d.update((100.0, 104.0, 99.95, 100.0, 1.0, 0)))  # -1.0
```

```javascript
const wickra = require('wickra');
const d = new wickra.Doji(true);
// Dragonfly low at 96, body near the high -> +1.
console.log(d.update(100, 100.1, 96, 100));  // 1
```

### Streaming

```rust
use wickra::{Candle, Doji, Indicator};

let mut d = Doji::default();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if d.update(bar) == Some(1.0) {
        // Doji on this bar — combine with trend filter
    }
}
```

## Interpretation

- **Indecision.** A Doji on its own is informational, not
  actionable. Treat as a "watch the next bar" signal.
- **At extremes.** A Doji at a swing high in an uptrend is a
  potential reversal signal; at a swing low in a downtrend,
  potentially bullish.
- **Building block.** Dojis form the middle bar of three-bar
  reversal patterns like Morning / Evening Star (see
  [MorningEveningStar](Indicator-MorningEveningStar)).

## Common pitfalls

- **Treating every Doji as a reversal.** Most Dojis in trending
  markets are just continuation pauses. Without trend context,
  signal value is near-zero.
- **Threshold mismatch.** Default `0.1` is reasonable for daily
  bars; intraday minute bars may need `0.15`–`0.20` because micro-
  ranges are wider relative to micro-bodies.
- **Pattern recognition on Heikin-Ashi.** Doji on raw candles is
  meaningful; Doji on HA candles is not — HA bodies are smoothed
  averages, not actual price levels.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991)
  — the modern English reference for candlestick patterns.
- Various Japanese trading texts dating back to the 18th century
  (Honma Munehisa's rice-trading notes).

## See also

- [SpinningTop](Indicator-SpinningTop) — Doji's cousin with
  longer wicks.
- [Hammer](Indicator-Hammer) — bullish reversal candidate.
- [MorningEveningStar](Indicator-MorningEveningStar) — three-bar
  pattern with Doji as middle bar.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
