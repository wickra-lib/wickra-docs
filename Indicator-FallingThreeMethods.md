# FallingThreeMethods

> Five-bar bearish continuation. A long black candle is followed by three
> small bars that drift up but stay inside its range (a brief rest), then a
> second long black candle closes below the first, resuming the decline.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `-1.0` bearish, `0.0` otherwise (never `+1.0`) |
| Output range | `{-1.0, 0.0}` |
| Default parameters | none — `FallingThreeMethods::new()` |
| Warmup period | `5` (first four bars always `0.0`) |
| Interpretation | Bearish continuation after an in-range rest |

## Formula

```
long body = |close − open| >= 0.5 · (high − low)
bar1 black & long
bar2, bar3, bar4 small bodies, each contained within bar1's high/low range
bar5 black, closing below bar1's close
```

Bearish-only (never `+1.0`); the bullish mirror is
[RisingThreeMethods](Indicator-RisingThreeMethods). See
`crates/wickra-core/src/indicators/falling_three_methods.rs`.

## Parameters

None. Constructed with `FallingThreeMethods::new()`.

## Signed ±1 encoding

Single-direction shape: `−1.0` bearish, `0.0` no pattern — one feature-matrix
dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, FallingThreeMethods, Candle};
// FallingThreeMethods: Input = Candle, Output = f64
const _: fn(&mut FallingThreeMethods, Candle) -> Option<f64> = <FallingThreeMethods as Indicator>::update;
```

- **Always emits a value.** Never `None`; warmup and no-match bars return `0.0`.
- **Node.** `update(open, high, low, close)` → `number`; `batch(open, high, low,
  close)` → `Array<number>`.
- **Python.** `update(candle)` → `float`; `batch(open, high, low, close)` → 1-D
  `numpy.ndarray` (`0.0` on warmup / no-match).

## Warmup

`warmup_period() == 5`. The first four bars return `0.0`
(`first_four_bars_return_zero`, `accessors_and_metadata`).

## Edge cases

- **Middle bars must stay in range.** A resting bar breaking bar1's high/low
  yields `0.0` (`middle_bar_breaks_range_yields_zero`).
- **Fifth bar must make a new low.** A fifth close that does not clear bar1's
  close downward yields `0.0` (`bar5_not_new_low_yields_zero`).
- **Reset.** `reset()` clears the four-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, FallingThreeMethods};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = FallingThreeMethods::new();
    println!("{:?}", t.update(Candle::new(15.0, 15.1, 9.9, 10.0, 1.0, 0)?));  // long black
    println!("{:?}", t.update(Candle::new(11.0, 12.1, 10.9, 12.0, 1.0, 1)?)); // small, in range
    println!("{:?}", t.update(Candle::new(11.5, 12.6, 11.4, 12.5, 1.0, 2)?)); // small drift up
    println!("{:?}", t.update(Candle::new(12.0, 13.1, 11.9, 13.0, 1.0, 3)?)); // small drift up
    println!("{:?}", t.update(Candle::new(12.5, 12.6, 8.9, 9.0, 1.0, 4)?));   // long black, new low
    Ok(())
}
```

Output:

```
Some(0.0)
Some(0.0)
Some(0.0)
Some(0.0)
Some(-1.0)
```

Three small bars rest inside the first black candle's range, then bar 5 closes at
`9.0` below bar1's close `10.0` — falling three methods. This matches
`falling_three_methods_is_minus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([15.0, 11.0, 11.5, 12.0, 12.5])
h = np.array([15.1, 12.1, 12.6, 13.1, 12.6])
l = np.array([9.9,  10.9, 11.4, 11.9, 8.9])
c = np.array([10.0, 12.0, 12.5, 13.0, 9.0])

print(ta.FallingThreeMethods().batch(o, h, l, c))  # [ 0.  0.  0.  0. -1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.FallingThreeMethods();
t.update(15, 15.1, 9.9, 10);
t.update(11, 12.1, 10.9, 12);
t.update(11.5, 12.6, 11.4, 12.5);
t.update(12, 13.1, 11.9, 13);
console.log(t.update(12.5, 12.6, 8.9, 9)); // -1
```

### Streaming

```rust
use wickra::{Candle, Indicator, FallingThreeMethods};

let mut t = FallingThreeMethods::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if t.update(bar) == Some(-1.0) { /* downtrend resumes after an in-range rest */ }
}
```

## Interpretation

1. **Healthy pause in a decline.** Three small bars holding inside a strong black
   candle's range, then a breakdown, is a textbook bearish continuation.
2. **Stay short.** Read it as a chance to remain with the downtrend rather than
   to call a bottom.
3. **Confirm with the trend.** Continuation pattern; use within a downtrend.

## Common pitfalls

- **Resting bar escapes the range.** Any middle bar poking beyond bar1's range
  disqualifies the setup.
- **No breakdown.** The fifth candle must close below bar1's close.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [RisingThreeMethods](Indicator-RisingThreeMethods) — the bullish mirror.
- [DownsideGapThreeMethods](Indicator-DownsideGapThreeMethods) — gap-based
  bearish continuation.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
