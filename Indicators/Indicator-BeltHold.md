# BeltHold

> Single-bar reversal: a long candle that opens at one extreme of its
> range (an opening marubozu) and runs the other way — a bullish belt-hold
> opens at the low and rallies, a bearish one opens at the high and sells
> off.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` bullish, `-1.0` bearish, `0.0` otherwise |
| Output range | `{-1.0, 0.0, +1.0}` |
| Default parameters | `shadow_tolerance = 0.05` (5 % of range); bindings use the default |
| Warmup period | `1` |
| Interpretation | Single-bar reversal/continuation from an extreme open |

## Formula

```
range = high − low
long body = |close − open| >= 0.5 · range
bullish (+1.0): green, opens at the low   (open − low  <= tol · range) & long body
bearish (-1.0): red,   opens at the high  (high − open <= tol · range) & long body
```

A belt-hold is exactly an opening marubozu read as a reversal signal: the open
sits at the bar extreme (within `tol`) and the long body runs away from it. See
`crates/wickra-core/src/indicators/belt_hold.rs`.

## Parameters

| Name | Type | Default | Valid range | Source |
|------|------|---------|-------------|--------|
| `shadow_tolerance` | `f64` | `0.05` | `[0.0, 1.0)` | `BeltHold::with_tolerance` (`belt_hold.rs`) |

`with_tolerance` outside `[0, 1)` errors (`rejects_invalid_tolerance`,
`accepts_valid_tolerance`). Python/Node construct with the default.

## Signed ±1 encoding

Emits the uniform candlestick sign convention — `+1.0` bullish, `−1.0` bearish,
`0.0` no pattern — a single feature-matrix dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, BeltHold, Candle};
// BeltHold: Input = Candle, Output = f64
const _: fn(&mut BeltHold, Candle) -> Option<f64> = <BeltHold as Indicator>::update;
```

- **Always emits a value.** Never `None`; non-matching bars return `0.0`.
- **Node.** `update(open, high, low, close)` → `number`; `batch(open, high, low,
  close)` → `Array<number>`.
- **Python.** `update(candle)` → `float`; `batch(open, high, low, close)` → 1-D
  `numpy.ndarray` (`0.0` on no-match).

## Warmup

`warmup_period() == 1` — emits from the first candle (`accessors_and_metadata`).

## Edge cases

- **Opening-side shadow.** A shadow on the open end disqualifies it
  (`opening_shadow_yields_zero`).
- **Short body.** A body under half the range yields `0.0`
  (`short_body_yields_zero`).
- **Zero range.** A flat bar yields `0.0` (`zero_range_yields_zero`).
- **Reset.** `reset()` clears the has-emitted flag (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, BeltHold};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = BeltHold::new();
    // Bullish belt-hold: opens at the low (10), closes near the high.
    println!("{:?}", t.update(Candle::new(10.0, 12.0, 10.0, 11.5, 1.0, 0)?));
    Ok(())
}
```

Output:

```
Some(1.0)
```

The open equals the low and the body is `1.5` of a `2.0` range (`≥ 0.5`) — a
bullish belt-hold. This matches `bullish_belt_hold_is_plus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([10.0])
h = np.array([12.0])
l = np.array([10.0])
c = np.array([11.5])

print(ta.BeltHold().batch(o, h, l, c))  # [1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.BeltHold();
console.log(t.update(10, 12, 10, 11.5)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, BeltHold};

let mut t = BeltHold::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    match t.update(bar) {
        Some(1.0)  => { /* bullish belt-hold — opened at the low and ran */ }
        Some(-1.0) => { /* bearish belt-hold */ }
        _ => {}
    }
}
```

## Interpretation

1. **Conviction from the open.** Opening at an extreme and running the full body
   the other way shows one side seized control immediately — read it as a
   reversal at a turning point or a strong continuation in-trend.
2. **Single-bar, so confirm.** One bar is weak evidence; pair with location
   (support/resistance) or a follow-through bar.

## Common pitfalls

- **It is an opening marubozu.** Mechanically identical to
  [OpeningMarubozu](/Indicators/Indicator-OpeningMarubozu); the difference is interpretive
  (belt-hold names it as a reversal signal).
- **No context.** A belt-hold mid-range is far weaker than one at an extreme.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [OpeningMarubozu](/Indicators/Indicator-OpeningMarubozu) — the same geometry.
- [Marubozu](/Indicators/Indicator-Marubozu) — both ends shaved.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
