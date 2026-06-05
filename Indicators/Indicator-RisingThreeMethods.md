# RisingThreeMethods

> Five-bar bullish continuation. A long white candle is followed by three
> small bars that drift back but stay inside its range (a brief rest),
> then a second long white candle closes above the first, resuming the
> advance.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` bullish, `0.0` otherwise (never `-1.0`) |
| Output range | `{0.0, +1.0}` |
| Default parameters | none — `RisingThreeMethods::new()` |
| Warmup period | `5` (first four bars always `0.0`) |
| Interpretation | Bullish continuation after an in-range rest |

## Formula

```
long body = |close − open| >= 0.5 · (high − low)
bar1 white & long
bar2, bar3, bar4 small bodies, each contained within bar1's high/low range
bar5 white, closing above bar1's close
```

Bullish-only (never `−1.0`); the bearish mirror is
[FallingThreeMethods](/Indicators/Indicator-FallingThreeMethods). The three resting bars
stay *inside* bar1's range (unlike [MatHold](/Indicators/Indicator-MatHold), where they gap
up and hold). See `crates/wickra-core/src/indicators/rising_three_methods.rs`.

## Parameters

None. Constructed with `RisingThreeMethods::new()`.

## Signed ±1 encoding

Single-direction shape: `+1.0` bullish, `0.0` no pattern — one feature-matrix
dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, RisingThreeMethods, Candle};
// RisingThreeMethods: Input = Candle, Output = f64
const _: fn(&mut RisingThreeMethods, Candle) -> Option<f64> = <RisingThreeMethods as Indicator>::update;
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

- **Middle bars must stay in range.** If a resting bar breaks bar1's high/low the
  result is `0.0` (`middle_bar_breaks_range_yields_zero`).
- **Fifth bar must make a new high.** A fifth close that does not clear bar1's
  close yields `0.0` (`bar5_not_new_high_yields_zero`).
- **Reset.** `reset()` clears the four-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, RisingThreeMethods};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = RisingThreeMethods::new();
    println!("{:?}", t.update(Candle::new(10.0, 15.1, 9.9, 15.0, 1.0, 0)?));  // long white
    println!("{:?}", t.update(Candle::new(14.0, 14.1, 12.9, 13.0, 1.0, 1)?)); // small, in range
    println!("{:?}", t.update(Candle::new(13.5, 13.6, 12.4, 12.5, 1.0, 2)?)); // small drift
    println!("{:?}", t.update(Candle::new(13.0, 13.1, 11.9, 12.0, 1.0, 3)?)); // small drift
    println!("{:?}", t.update(Candle::new(12.5, 16.1, 12.4, 16.0, 1.0, 4)?)); // long white, new high
    Ok(())
}
```

Output:

```
Some(0.0)
Some(0.0)
Some(0.0)
Some(0.0)
Some(1.0)
```

Three small bars rest inside the first white candle's range, then bar 5 closes at
`16.0` above bar1's close `15.0` — rising three methods. This matches
`rising_three_methods_is_plus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([10.0, 14.0, 13.5, 13.0, 12.5])
h = np.array([15.1, 14.1, 13.6, 13.1, 16.1])
l = np.array([9.9,  12.9, 12.4, 11.9, 12.4])
c = np.array([15.0, 13.0, 12.5, 12.0, 16.0])

print(ta.RisingThreeMethods().batch(o, h, l, c))  # [0. 0. 0. 0. 1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.RisingThreeMethods();
t.update(10, 15.1, 9.9, 15);
t.update(14, 14.1, 12.9, 13);
t.update(13.5, 13.6, 12.4, 12.5);
t.update(13, 13.1, 11.9, 12);
console.log(t.update(12.5, 16.1, 12.4, 16)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, RisingThreeMethods};

let mut t = RisingThreeMethods::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if t.update(bar) == Some(1.0) { /* uptrend resumes after an in-range rest */ }
}
```

## Interpretation

1. **Healthy pause.** Three small bars holding inside a strong white candle's
   range, then a breakout, is a textbook bullish continuation.
2. **Range-contained vs gapped.** Where the rest gaps up and holds rather than
   drifting inside, see [MatHold](/Indicators/Indicator-MatHold).
3. **Confirm with the trend.** Continuation pattern; use within an uptrend.

## Common pitfalls

- **Resting bar escapes the range.** Any middle bar poking beyond bar1's high or
  low disqualifies the setup.
- **No breakout.** The fifth candle must close above bar1's close.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [FallingThreeMethods](/Indicators/Indicator-FallingThreeMethods) — the bearish mirror.
- [MatHold](/Indicators/Indicator-MatHold) — the gap-and-hold variant.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
