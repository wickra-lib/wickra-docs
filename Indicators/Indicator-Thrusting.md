# Thrusting

> Two-bar bearish continuation, deeper than In-Neck but short of a
> piercing reversal. A long black candle in a decline is followed by a
> white candle that opens below the black bar's low and closes well into
> the black body — but still below its midpoint, so the bounce is not yet
> a reversal.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `-1.0` bearish, `0.0` otherwise (never `+1.0`) |
| Output range | `{-1.0, 0.0}` |
| Default parameters | none — `Thrusting::new()` |
| Warmup period | `2` (first bar always `0.0`) |
| Interpretation | Bearish continuation; deepest bounce that is still not a reversal |

## Formula

```
long body = |close − open| >= 0.5 · (high − low)
bar1 black & long
bar2 white, opens below bar1's low:  open2 < low1
bar2 closes above the in-neck zone but below the body midpoint:
     close1 + 0.1·body1 < close2 < midpoint(open1, close1)
```

Bearish-only (never `+1.0`). A close *at or above* the midpoint would be a
piercing pattern (a reversal) instead. See
`crates/wickra-core/src/indicators/thrusting.rs`.

## Parameters

None. Constructed with `Thrusting::new()`.

## Signed ±1 encoding

Single-direction shape: `−1.0` bearish, `0.0` no pattern — one feature-matrix
dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, Thrusting, Candle};
// Thrusting: Input = Candle, Output = f64
const _: fn(&mut Thrusting, Candle) -> Option<f64> = <Thrusting as Indicator>::update;
```

- **Always emits a value.** Never `None`; warmup and no-match bars return `0.0`.
- **Node.** `update(open, high, low, close)` → `number`; `batch(open, high, low,
  close)` → `Array<number>`.
- **Python.** `update(candle)` → `float`; `batch(open, high, low, close)` → 1-D
  `array.array('d')` (`0.0` on warmup / no-match).

## Warmup

`warmup_period() == 2`. The first bar returns `0.0` (`first_bar_returns_zero`,
`accessors_and_metadata`).

## Edge cases

- **Shallow close.** A close still in the in-neck zone is In-Neck, not Thrusting
  (`shallow_close_yields_zero`).
- **Close past the midpoint.** A close at/above mid-body is a piercing reversal,
  not a thrust (`close_past_midpoint_yields_zero`).
- **Second bar must be white.** Otherwise `0.0` (`second_bar_black_yields_zero`).
- **Reset.** `reset()` clears the one-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, Thrusting};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = Thrusting::new();
    println!("{:?}", t.update(Candle::new(15.0, 15.1, 9.0, 10.0, 1.0, 0)?)); // long black, mid 12.5
    println!("{:?}", t.update(Candle::new(7.0, 11.6, 6.9, 11.5, 1.0, 1)?));  // white, closes below mid
    Ok(())
}
```

Output:

```
Some(0.0)
Some(-1.0)
```

The white bar closes at `11.5` — well into the black body `(10, 15)` but below
its midpoint `12.5` — a thrusting line. This matches `thrusting_is_minus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([15.0, 7.0])
h = np.array([15.1, 11.6])
l = np.array([9.0,  6.9])
c = np.array([10.0, 11.5])

print(ta.Thrusting().batch(o, h, l, c))  # [ 0. -1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.Thrusting();
t.update(15, 15.1, 9, 10);
console.log(t.update(7, 11.6, 6.9, 11.5)); // -1
```

### Streaming

```rust
use wickra::{Candle, Indicator, Thrusting};

let mut t = Thrusting::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if t.update(bar) == Some(-1.0) { /* deep-but-failed bounce — downtrend continuation */ }
}
```

## Interpretation

1. **The line in the sand.** A thrust closes deep into the body yet stops below
   the midpoint — the last bearish-continuation rung before the bounce becomes a
   piercing reversal.
2. **Watch the midpoint.** If the next attempt clears mid-body, treat it as a
   reversal instead.
3. **Confirm with the trend.** Continuation pattern; needs a decline.

## Common pitfalls

- **Mistaking it for piercing.** The midpoint is the dividing line — a close at
  or above it flips the read to bullish reversal.
- **No downtrend context.** Only meaningful inside a decline.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [OnNeck](/Indicators/Indicator-OnNeck) / [InNeck](/Indicators/Indicator-InNeck) — shallower bounces.
- [PiercingDarkCloud](/Indicators/Indicator-PiercingDarkCloud) — the reversal past mid-body.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
