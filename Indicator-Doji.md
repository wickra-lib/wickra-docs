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
| Output type         | `f64` — `+1.0` if Doji, `0.0` otherwise (directionless)              |
| Output range        | `{0.0, +1.0}`                                                        |
| Default parameters  | `body_threshold = 0.1` (`Doji::default()`)                           |
| Warmup period       | `1`                                                                  |
| Interpretation      | Indecision bar; meaningful only in context of trend / extremes       |

## Formula

```
body  = |close - open|
range = high - low

doji  = (body <= body_threshold · range)
```

Output is `+1.0` when a Doji is detected and `0.0` otherwise. Doji
is **directionless** — no `−1.0` is emitted. See
`crates/wickra-core/src/indicators/doji.rs`.

## Parameters

| Name             | Type  | Default | Constraint        | Description |
|------------------|-------|---------|-------------------|-------------|
| `body_threshold` | `f64` | `0.1`   | finite, `(0, 1]`  | Body-to-range ratio below which the bar counts as a Doji. |

`Doji::new` returns `Error::InvalidPeriod` for out-of-range
`body_threshold`. `Doji::default()` returns the `0.1` factory.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python:
`Doji().batch(open, high, low, close)` returns a 1-D `np.ndarray`.
Node: `update(candle)` returns `number | null` (only `null` for a
non-finite candle).

## Warmup

`warmup_period() == 1`. Every bar emits.

## Edge cases

- **Zero-range bar.** `range == 0`; body must also be `0`, so the
  inequality holds and Doji = `+1.0`.
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

### Streaming

```rust
use wickra::{Candle, Doji, Indicator};

let mut d = Doji::default();
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
