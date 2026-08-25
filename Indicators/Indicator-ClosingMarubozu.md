# ClosingMarubozu

> Single-bar strong-momentum candle with a long body and **no shadow on
> the close end**. White closes right at the high; black closes right at
> the low. The shaved close shows the move ran unopposed into the bell.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` white, `-1.0` black, `0.0` otherwise |
| Output range | `{-1.0, 0.0, +1.0}` |
| Default parameters | none — `ClosingMarubozu::new()` |
| Warmup period | `1` |
| Interpretation | Momentum into the close; trend-confirming single bar |

## Formula

```
range = high − low
long body:  |close − open| >= 0.7 · range
white (+1.0): close > open  and  high − close <= 0.05 · range   (close at the high)
black (-1.0): close < open  and  close − low  <= 0.05 · range   (close at the low)
```

The body must dominate the bar (`≥ 70 %` of range) and the *close* end must be
effectively shaved (within `5 %` of range). The opposite (open) end may carry a
shadow — that is what distinguishes a closing marubozu from a full
[Marubozu](/Indicators/Indicator-Marubozu). Thresholds are geometric (fixed fractions of
range), not TA-Lib rolling averages. See
`crates/wickra-core/src/indicators/closing_marubozu.rs`.

## Parameters

None. Constructed with `ClosingMarubozu::new()`.

## Signed ±1 encoding

Emits the uniform candlestick sign convention — `+1.0` bullish (white), `−1.0`
bearish (black), `0.0` no pattern — a single feature-matrix dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, ClosingMarubozu, Candle};
// ClosingMarubozu: Input = Candle, Output = f64
const _: fn(&mut ClosingMarubozu, Candle) -> Option<f64> = <ClosingMarubozu as Indicator>::update;
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

- **Shadow on the close end.** A white bar with a clear upper shadow (close not
  at the high) yields `0.0` (`white_with_upper_shadow_yields_zero`); the black
  mirror is `black_with_lower_shadow_yields_zero`.
- **Short body.** A body under `70 %` of range is not a marubozu
  (`short_body_yields_zero`).
- **Zero range.** A flat bar (`high == low`) yields `0.0`
  (`zero_range_yields_zero`).
- **Reset.** `reset()` only clears the has-emitted flag (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, ClosingMarubozu, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut m = ClosingMarubozu::new();
    // White: closes at the high (15), small opening shadow below (low 10).
    println!("{:?}", m.update(Candle::new(10.5, 15.0, 10.0, 15.0, 1.0, 0)?));
    // Black: closes at the low (10), small opening shadow above (high 15).
    println!("{:?}", m.update(Candle::new(14.5, 15.0, 10.0, 10.0, 1.0, 1)?));
    Ok(())
}
```

Output:

```
Some(1.0)
Some(-1.0)
```

These match `white_closing_marubozu_is_plus_one` and
`black_closing_marubozu_is_minus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([10.5, 14.5])
h = np.array([15.0, 15.0])
l = np.array([10.0, 10.0])
c = np.array([15.0, 10.0])

print(ta.ClosingMarubozu().batch(o, h, l, c))  # [ 1. -1.]
```

### Node

```javascript
const ta = require('wickra');
const m = new ta.ClosingMarubozu();
console.log(m.update(10.5, 15, 10, 15));  // 1
console.log(m.update(14.5, 15, 10, 10));  // -1
```

### Streaming

```rust
use wickra::{Candle, ClosingMarubozu, Indicator};

let mut m = ClosingMarubozu::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    match m.update(bar) {
        Some(1.0)  => { /* white closing marubozu — bulls owned the close */ }
        Some(-1.0) => { /* black closing marubozu — bears owned the close */ }
        _ => {}
    }
}
```

## Interpretation

1. **Momentum confirmation.** A close at the extreme says one side controlled
   price right into the bell — a strong continuation cue in the body's
   direction.
2. **Break confirmation.** A white closing marubozu out of a base, or a black
   one out of a top, lends weight to the breakout because there was no
   late-session rejection.
3. **Pair with the open end.** Combine with [OpeningMarubozu](/Indicators/Indicator-OpeningMarubozu)
   or full [Marubozu](/Indicators/Indicator-Marubozu) to grade how complete the
   one-directional control was.

## Common pitfalls

- **Confusing it with a full marubozu.** A closing marubozu *allows* an opening
  shadow; only the close end is shaved.
- **Body too small.** A long shadow on the open end can still leave a short
  body — which disqualifies the bar even if the close is at the extreme.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [Marubozu](/Indicators/Indicator-Marubozu) — both ends shaved.
- [OpeningMarubozu](/Indicators/Indicator-OpeningMarubozu) — the open end shaved instead.
- [BeltHold](/Indicators/Indicator-BeltHold) — opens at the extreme and runs the other way.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
