# TwoCrows

> Three-bar bearish reversal after an advance. A long white candle is
> followed by two black candles: the first gaps its body up, the second
> opens inside that body and closes back down inside the white body —
> two crows settling on the highs.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `-1.0` bearish, `0.0` otherwise (never `+1.0`) |
| Output range | `{-1.0, 0.0}` |
| Default parameters | none — `TwoCrows::new()` |
| Warmup period | `3` (first two bars always `0.0`) |
| Interpretation | Bearish reversal at the top of an advance |

## Formula

```
bar1 green (long white)
bar2 red & its body gaps up above bar1's body:  bar2.close > bar1.close
bar3 red & opens inside bar2's body:             bar2.close < bar3.open  < bar2.open
         & closes inside bar1's body:            bar1.open  < bar3.close < bar1.close
```

Bearish-only (never `+1.0`). The second crow erasing the gap by closing back
inside the white body is the reversal tell. Thresholds are geometric, not
TA-Lib rolling averages. See `crates/wickra-core/src/indicators/two_crows.rs`.

## Parameters

None. Constructed with `TwoCrows::new()`.

## Signed ±1 encoding

Single-direction shape: `−1.0` bearish, `0.0` no pattern — one feature-matrix
dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, TwoCrows, Candle};
// TwoCrows: Input = Candle, Output = f64
const _: fn(&mut TwoCrows, Candle) -> Option<f64> = <TwoCrows as Indicator>::update;
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

- **No upside gap.** If the first black candle does not gap its body above the
  white body, the result is `0.0` (`no_gap_up_yields_zero`).
- **Third close not inside the first body.** A third close that does not return
  into the white body yields `0.0` (`third_close_below_first_body_yields_zero`).
- **Reset.** `reset()` clears the two-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, TwoCrows};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = TwoCrows::new();
    println!("{:?}", t.update(Candle::new(10.0, 12.2, 9.9, 12.0, 1.0, 0)?));  // long white
    println!("{:?}", t.update(Candle::new(14.0, 14.2, 12.9, 13.0, 1.0, 1)?)); // black, gaps up
    println!("{:?}", t.update(Candle::new(13.5, 13.6, 10.9, 11.0, 1.0, 2)?)); // black, back inside
    Ok(())
}
```

Output:

```
Some(0.0)
Some(0.0)
Some(-1.0)
```

The second crow opens at `13.5` inside the first crow's body `(13, 14)` and
closes at `11.0` inside the white body `(10, 12)` — Two Crows. This matches
`two_crows_is_minus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([10.0, 14.0, 13.5])
h = np.array([12.2, 14.2, 13.6])
l = np.array([9.9,  12.9, 10.9])
c = np.array([12.0, 13.0, 11.0])

print(ta.TwoCrows().batch(o, h, l, c))  # [ 0.  0. -1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.TwoCrows();
t.update(10, 12.2, 9.9, 12);
t.update(14, 14.2, 12.9, 13);
console.log(t.update(13.5, 13.6, 10.9, 11)); // -1
```

### Streaming

```rust
use wickra::{Candle, Indicator, TwoCrows};

let mut t = TwoCrows::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if t.update(bar) == Some(-1.0) { /* bearish reversal candidate at the highs */ }
}
```

## Interpretation

1. **Top reversal.** Meaningful at the top of an advance: the failed gap-up and
   the close back into the white body show buyers losing the highs.
2. **Softer than engulfing.** A two-crows signal is a caution flag; confirm with
   a follow-through down candle or a momentum roll-over.
3. **Stronger cousin.** [UpsideGapTwoCrows](/Indicators/Indicator-UpsideGapTwoCrows) keeps
   the gap open and is the more strictly-defined sibling.

## Common pitfalls

- **No uptrend context.** As a reversal it only matters after an advance.
- **Ignoring the body-only rule.** The gaps and overlaps are measured on bodies,
  not full ranges.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [UpsideGapTwoCrows](/Indicators/Indicator-UpsideGapTwoCrows) — the gap-holding sibling.
- [Engulfing](/Indicators/Indicator-Engulfing) — stronger two-bar reversal.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
