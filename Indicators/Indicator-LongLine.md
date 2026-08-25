# LongLine

> A single candle whose range is *longer* than the recent average and
> whose body dominates that range — a solid directional bar. Because
> "long" only has meaning relative to recent activity, the detector
> compares each candle's range against a rolling average of the previous
> `period` ranges.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` long white, `-1.0` long black, `0.0` otherwise |
| Output range | `{-1.0, 0.0, +1.0}` |
| Default parameters | `period = 5` |
| Warmup period | `period` (default `5`) |
| Interpretation | A conviction bar relative to recent ranges |

## Formula

```
avg = mean range of the previous `period` candles
long line = range > avg  AND  |close − open| >= 0.5 · range
white -> +1.0,  black -> -1.0
```

This rolling baseline is the one place the candlestick family departs from a
purely intra-candle rule, since a long/short classification is inherently
scale-relative. See `crates/wickra-core/src/indicators/long_line.rs`.

## Parameters

| Name | Type | Default | Valid range | Source |
|------|------|---------|-------------|--------|
| `period` | `usize` | `5` | `>= 1` | `LongLine::with_period` (`long_line.rs`) |

`with_period(0)` errors (`rejects_zero_period`, `accepts_valid_period`).
`LongLine::new()` uses the default period; Python/Node construct with the
default.

## Signed ±1 encoding

Emits the uniform candlestick sign convention — `+1.0` long white, `−1.0` long
black, `0.0` no pattern — a single feature-matrix dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, LongLine, Candle};
// LongLine: Input = Candle, Output = f64
const _: fn(&mut LongLine, Candle) -> Option<f64> = <LongLine as Indicator>::update;
```

- **Always emits a value.** Never `None`; warmup and no-match bars return `0.0`.
- **Node.** `update(open, high, low, close)` → `number`; `batch(open, high, low,
  close)` → `Array<number>`.
- **Python.** `update(candle)` → `float`; `batch(open, high, low, close)` → 1-D
  `array.array('d')` (`0.0` while the rolling average fills).

## Warmup

`warmup_period() == period` (default `5`). The first `period` candles return
`0.0` while the rolling average fills (`warmup_returns_zero`,
`accessors_and_metadata`).

## Edge cases

- **Short range.** A range at or below the rolling average yields `0.0`
  (`short_range_yields_zero`).
- **Wide range, small body.** A long range with an indecisive body yields `0.0`
  (`wide_range_small_body_yields_zero`).
- **Reset.** `reset()` clears the rolling-range buffer and restarts warmup
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, LongLine};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Five small bars (range 1.0) establish the baseline, then one long white bar.
    let mut bars: Vec<Candle> = (0..5)
        .map(|i| Candle::new(10.0, 10.5, 9.5, 10.1, 1.0, i).unwrap())
        .collect();
    bars.push(Candle::new(10.0, 13.0, 9.9, 12.9, 1.0, 5)?); // range 3.1, white
    let mut t = LongLine::new();
    println!("{:?}", t.batch(&bars));
    Ok(())
}
```

Output:

```
[Some(0.0), Some(0.0), Some(0.0), Some(0.0), Some(0.0), Some(1.0)]
```

The sixth bar's range `3.1` beats the `1.0` baseline and its body dominates — a
long white line. This matches the `long_white_line_is_plus_one` unit test.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([10.0]*5 + [10.0])
h = np.array([10.5]*5 + [13.0])
l = np.array([9.5]*5  + [9.9])
c = np.array([10.1]*5 + [12.9])

print(ta.LongLine().batch(o, h, l, c))  # [0. 0. 0. 0. 0. 1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.LongLine();
for (let i = 0; i < 5; i++) t.update(10, 10.5, 9.5, 10.1);
console.log(t.update(10, 13, 9.9, 12.9)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, LongLine};

let mut t = LongLine::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    match t.update(bar) {
        Some(1.0)  => { /* strong white bar relative to recent ranges */ }
        Some(-1.0) => { /* strong black bar */ }
        _ => {}
    }
}
```

## Interpretation

1. **Conviction, in context.** A bar that is long *relative to its neighbours*
   marks a decisive push — more informative than an absolute size threshold.
2. **Tune the window.** A longer `period` smooths the baseline (fewer, higher-
   conviction signals); a shorter one reacts faster.
3. **Direction = colour.** White is bullish conviction, black bearish.

## Common pitfalls

- **Absolute thinking.** A bar that looks big on the chart may be ordinary
  relative to recent ranges — and vice versa.
- **Small body.** A wide range with a small body is indecision, not a long line.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [ShortLine](/Indicators/Indicator-ShortLine) — the compact counterpart.
- [Marubozu](/Indicators/Indicator-Marubozu) — the shadowless full-body bar.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
