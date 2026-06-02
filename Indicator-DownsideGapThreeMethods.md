# DownsideGapThreeMethods

> Three-bar bearish continuation. Two black candles decline with a
> downside body gap between them, then a white candle opens inside the
> second body and closes inside the first, partially filling the gap
> without erasing the decline.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `-1.0` bearish, `0.0` otherwise (never `+1.0`) |
| Output range | `{-1.0, 0.0}` |
| Default parameters | none — `DownsideGapThreeMethods::new()` |
| Warmup period | `3` (first two bars always `0.0`) |
| Interpretation | Downtrend continuation; the gap is defended, not closed |

## Formula

```
bar1 black, bar2 black
downside body gap:  open2 < close1           (bar2's body entirely below bar1's)
bar3 white, opens within bar2's body:  close2 < open3 < open2
bar3 closes within bar1's body:        close1 < close3 < open1
```

Bearish-only (never `+1.0`); the bullish mirror is
[UpsideGapThreeMethods](Indicator-UpsideGapThreeMethods). The white third
candle bounces *into* the gap but only as far as the first body — the decline
survives. Thresholds are geometric, not TA-Lib rolling averages. See
`crates/wickra-core/src/indicators/downside_gap_three_methods.rs`.

## Parameters

None. Constructed with `DownsideGapThreeMethods::new()`.

## Signed ±1 encoding

Single-direction shape: `−1.0` bearish, `0.0` no pattern — one feature-matrix
dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, DownsideGapThreeMethods, Candle};
// DownsideGapThreeMethods: Input = Candle, Output = f64
const _: fn(&mut DownsideGapThreeMethods, Candle) -> Option<f64> = <DownsideGapThreeMethods as Indicator>::update;
```

- **Always emits a value.** Never `None`; warmup and no-match bars return `0.0`.
- **Node.** `update(open, high, low, close)` → `number`; `batch(open, high, low,
  close)` → `Array<number>`.
- **Python.** `update(candle)` → `float`; `batch(open, high, low, close)` → 1-D
  `numpy.ndarray` (`0.0` on warmup / no-match).

## Warmup

`warmup_period() == 3`. The first two bars return `0.0`
(`first_two_bars_return_zero`, `accessors_and_metadata`).

## Edge cases

- **Leading bars must be black.** A white first/second candle yields `0.0`
  (`non_black_first_bars_yield_zero`).
- **Gap required.** No downside body gap between bars 1 and 2 → `0.0`
  (`no_gap_yields_zero`).
- **Third candle must be white and land in the bodies.** A black third candle
  (`third_bar_not_white_yields_zero`) or one closing outside the first body
  (`third_bar_outside_bodies_yields_zero`) yields `0.0`.
- **Reset.** `reset()` clears the two-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, DownsideGapThreeMethods, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = DownsideGapThreeMethods::new();
    println!("{:?}", t.update(Candle::new(13.0, 13.2, 11.8, 12.0, 1.0, 0)?)); // black
    println!("{:?}", t.update(Candle::new(11.0, 11.1, 9.8, 10.0, 1.0, 1)?));  // black, gaps down
    println!("{:?}", t.update(Candle::new(10.5, 12.6, 10.4, 12.5, 1.0, 2)?)); // white, fills partly
    Ok(())
}
```

Output:

```
Some(0.0)
Some(0.0)
Some(-1.0)
```

The third candle opens at `10.5` inside bar2's body `(10, 11)` and closes at
`12.5` inside bar1's body `(12, 13)` — a downside gap three methods. This
matches `downside_gap_three_methods_is_minus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([13.0, 11.0, 10.5])
h = np.array([13.2, 11.1, 12.6])
l = np.array([11.8, 9.8,  10.4])
c = np.array([12.0, 10.0, 12.5])

print(ta.DownsideGapThreeMethods().batch(o, h, l, c))  # [ 0.  0. -1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.DownsideGapThreeMethods();
t.update(13, 13.2, 11.8, 12);
t.update(11, 11.1, 9.8, 10);
console.log(t.update(10.5, 12.6, 10.4, 12.5)); // -1
```

### Streaming

```rust
use wickra::{Candle, Indicator, DownsideGapThreeMethods};

let mut t = DownsideGapThreeMethods::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if t.update(bar) == Some(-1.0) { /* downtrend continuation — gap defended */ }
}
```

## Interpretation

1. **Continuation, not reversal.** The white bounce candle tests the gap but the
   decline holds; read it as a chance to stay short inside a downtrend.
2. **Contrast with Tasuki.** [TasukiGap](Indicator-TasukiGap) leaves the gap
   open; here the bounce partially fills it yet still stops at the first body.
3. **Confirm the trend.** Use within an established downtrend; pair with a trend
   filter.

## Common pitfalls

- **Mistaking it for a reversal.** A white candle after two black ones looks
  bullish, but the contained bounce is a continuation tell.
- **No trend context.** Meaningless in a sideways range.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [UpsideGapThreeMethods](Indicator-UpsideGapThreeMethods) — the bullish mirror.
- [TasukiGap](Indicator-TasukiGap) — gap continuation that leaves the gap open.
- [FallingThreeMethods](Indicator-FallingThreeMethods) — non-gap bearish
  continuation.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
