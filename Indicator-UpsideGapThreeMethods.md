# UpsideGapThreeMethods

> Three-bar bullish continuation. Two white candles advance with an
> upside body gap between them, then a black candle opens inside the
> second body and closes inside the first, partially filling the gap
> without erasing the advance.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` bullish, `0.0` otherwise (never `-1.0`) |
| Output range | `{0.0, +1.0}` |
| Default parameters | none — `UpsideGapThreeMethods::new()` |
| Warmup period | `3` (first two bars always `0.0`) |
| Interpretation | Uptrend continuation; the gap is defended, not closed |

## Formula

```
bar1 white, bar2 white
upside body gap:  open2 > close1            (bar2's body entirely above bar1's)
bar3 black, opens within bar2's body:  open2 < open3 < close2
bar3 closes within bar1's body:        open1 < close3 < close1
```

Bullish-only (never `−1.0`); the bearish mirror is
[DownsideGapThreeMethods](Indicator-DownsideGapThreeMethods). The black third
candle pulls back *into* the gap but only as far as the first body — the
advance survives. Thresholds are geometric, not TA-Lib rolling averages. See
`crates/wickra-core/src/indicators/upside_gap_three_methods.rs`.

## Parameters

None. Constructed with `UpsideGapThreeMethods::new()`.

## Signed ±1 encoding

Single-direction shape: `+1.0` bullish, `0.0` no pattern — one feature-matrix
dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, UpsideGapThreeMethods, Candle};
// UpsideGapThreeMethods: Input = Candle, Output = f64
const _: fn(&mut UpsideGapThreeMethods, Candle) -> Option<f64> = <UpsideGapThreeMethods as Indicator>::update;
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

- **Leading bars must be white.** A black first/second candle yields `0.0`
  (`non_white_first_bars_yield_zero`).
- **Gap required.** No upside body gap between bars 1 and 2 → `0.0`
  (`no_gap_yields_zero`).
- **Third candle must be black and land in the bodies.** A white third candle
  (`third_bar_not_black_yields_zero`) or one closing outside the first body
  (`third_bar_outside_bodies_yields_zero`) yields `0.0`.
- **Reset.** `reset()` clears the two-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, UpsideGapThreeMethods};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = UpsideGapThreeMethods::new();
    println!("{:?}", t.update(Candle::new(10.0, 11.2, 9.8, 11.0, 1.0, 0)?));  // white
    println!("{:?}", t.update(Candle::new(12.0, 13.2, 11.9, 13.0, 1.0, 1)?)); // white, gaps up
    println!("{:?}", t.update(Candle::new(12.5, 12.6, 10.4, 10.5, 1.0, 2)?)); // black, fills partly
    Ok(())
}
```

Output:

```
Some(0.0)
Some(0.0)
Some(1.0)
```

The third candle opens at `12.5` inside bar2's body `(12, 13)` and closes at
`10.5` inside bar1's body `(10, 11)` — an upside gap three methods. This matches
`upside_gap_three_methods_is_plus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([10.0, 12.0, 12.5])
h = np.array([11.2, 13.2, 12.6])
l = np.array([9.8,  11.9, 10.4])
c = np.array([11.0, 13.0, 10.5])

print(ta.UpsideGapThreeMethods().batch(o, h, l, c))  # [0. 0. 1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.UpsideGapThreeMethods();
t.update(10, 11.2, 9.8, 11);
t.update(12, 13.2, 11.9, 13);
console.log(t.update(12.5, 12.6, 10.4, 10.5)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, UpsideGapThreeMethods};

let mut t = UpsideGapThreeMethods::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if t.update(bar) == Some(1.0) { /* uptrend continuation — gap defended */ }
}
```

## Interpretation

1. **Continuation, not reversal.** The black pullback candle tests the gap but
   the advance holds; read it as a chance to stay long inside an uptrend.
2. **Contrast with Tasuki.** [TasukiGap](Indicator-TasukiGap) keeps the gap
   *open*; here the pullback partially fills it yet still stops at the first
   body — both are continuation signals with slightly different geometry.
3. **Confirm the trend.** Use within an established uptrend; pair with a trend
   filter.

## Common pitfalls

- **Mistaking it for a reversal.** A black candle after two white ones looks
  bearish, but the contained pullback is a continuation tell.
- **No trend context.** Meaningless in a sideways range.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [DownsideGapThreeMethods](Indicator-DownsideGapThreeMethods) — the bearish
  mirror.
- [TasukiGap](Indicator-TasukiGap) — gap continuation that leaves the gap open.
- [RisingThreeMethods](Indicator-RisingThreeMethods) — non-gap bullish
  continuation.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
