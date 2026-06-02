# ShortLine

> A single candle whose range is *shorter* than the recent average while
> its body still dominates that (small) range — a compact directional bar.
> As with [LongLine](Indicator-LongLine), "short" only has meaning relative
> to recent activity, so the detector compares each candle's range against
> a rolling average of the previous `period` ranges.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` short white, `-1.0` short black, `0.0` otherwise |
| Output range | `{-1.0, 0.0, +1.0}` |
| Default parameters | `period = 5` |
| Warmup period | `period` (default `5`) |
| Interpretation | A compact, low-range directional bar (consolidation) |

## Formula

```
avg = mean range of the previous `period` candles
short line = range < avg  AND  |close − open| >= 0.5 · range
white -> +1.0,  black -> -1.0
```

See `crates/wickra-core/src/indicators/short_line.rs`.

## Parameters

| Name | Type | Default | Valid range | Source |
|------|------|---------|-------------|--------|
| `period` | `usize` | `5` | `>= 1` | `ShortLine::with_period` (`short_line.rs`) |

`with_period(0)` errors (`rejects_zero_period`, `accepts_valid_period`).
`ShortLine::new()` uses the default period; Python/Node construct with the
default.

## Signed ±1 encoding

Emits the uniform candlestick sign convention — `+1.0` short white, `−1.0` short
black, `0.0` no pattern — a single feature-matrix dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, ShortLine, Candle};
// ShortLine: Input = Candle, Output = f64
const _: fn(&mut ShortLine, Candle) -> Option<f64> = <ShortLine as Indicator>::update;
```

- **Always emits a value.** Never `None`; warmup and no-match bars return `0.0`.
- **Node.** `update(open, high, low, close)` → `number`; `batch(open, high, low,
  close)` → `Array<number>`.
- **Python.** `update(candle)` → `float`; `batch(open, high, low, close)` → 1-D
  `numpy.ndarray` (`0.0` while the rolling average fills).

## Warmup

`warmup_period() == period` (default `5`). The first `period` candles return
`0.0` while the rolling average fills (`warmup_returns_zero`,
`accessors_and_metadata`).

## Edge cases

- **Wide range.** A range at or above the rolling average yields `0.0`
  (`wide_range_yields_zero`).
- **Short range, small body.** A compact range with an indecisive body yields
  `0.0` (`short_range_small_body_yields_zero`).
- **Reset.** `reset()` clears the rolling-range buffer and restarts warmup
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, ShortLine};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Five wide bars (range 3.0) establish the baseline, then one small white bar.
    let mut bars: Vec<Candle> = (0..5)
        .map(|i| Candle::new(10.0, 13.0, 10.0, 12.0, 1.0, i).unwrap())
        .collect();
    bars.push(Candle::new(10.0, 11.0, 9.9, 10.9, 1.0, 5)?); // range 1.1, white
    let mut t = ShortLine::new();
    println!("{:?}", t.batch(&bars));
    Ok(())
}
```

Output:

```
[Some(0.0), Some(0.0), Some(0.0), Some(0.0), Some(0.0), Some(1.0)]
```

The sixth bar's range `1.1` is below the `3.0` baseline yet its body dominates —
a short white line. This matches the `short_white_line_is_plus_one` unit test.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([10.0]*5 + [10.0])
h = np.array([13.0]*5 + [11.0])
l = np.array([10.0]*5 + [9.9])
c = np.array([12.0]*5 + [10.9])

print(ta.ShortLine().batch(o, h, l, c))  # [0. 0. 0. 0. 0. 1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.ShortLine();
for (let i = 0; i < 5; i++) t.update(10, 13, 10, 12);
console.log(t.update(10, 11, 9.9, 10.9)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, ShortLine};

let mut t = ShortLine::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    match t.update(bar) {
        Some(1.0)  => { /* compact white bar — quiet bullish drift */ }
        Some(-1.0) => { /* compact black bar */ }
        _ => {}
    }
}
```

## Interpretation

1. **Consolidation, with a lean.** A small-but-solid body in a contracting range
   marks a quiet, one-directional drift — often a pause before the next move.
2. **Volatility context.** Clusters of short lines mark low-volatility
   compression that frequently precedes an expansion.
3. **Direction = colour.** White leans bullish, black bearish — gently.

## Common pitfalls

- **Absolute thinking.** "Short" is relative to recent ranges, not an absolute
  size.
- **Small body.** A compact range with an indecisive body is a doji/spinning
  top, not a short line.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [LongLine](Indicator-LongLine) — the high-range counterpart.
- [SpinningTop](Indicator-SpinningTop) — small body, larger shadows.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
