# MatHold

> Five-bar bullish continuation. A long white candle is followed by a brief
> three-bar pullback that gaps up and then drifts on small bodies *without*
> surrendering much ground, after which a white candle breaks to a new high
> and the uptrend resumes.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` bullish, `0.0` otherwise (never `-1.0`) |
| Output range | `{0.0, +1.0}` |
| Default parameters | `penetration = 0.5` (TA-Lib default); bindings use the default |
| Warmup period | `5` (first four bars always `0.0`) |
| Interpretation | Bullish continuation after a shallow rest |

## Formula

```
long body = |close − open| >= 0.5 · (high − low)
bar1 white & long
bar2 small body gapping up above bar1        (min(o2,c2) > close1)
bar2, bar3, bar4 each small                   (|body| <= 0.5 · body1)
the pullback holds                            (min low of bars 2..4 > close1 − penetration · body1)
bar5 white, closing at a new high             (close5 > max high of bars 1..4)
```

Bullish-only (never `−1.0`). A close-cousin of [RisingThreeMethods](/Indicators/Indicator-RisingThreeMethods)
where the rest gaps up and merely holds rather than drifting back through the
first body. See `crates/wickra-core/src/indicators/mat_hold.rs`.

## Parameters

| Name | Type | Default | Valid range | Source |
|------|------|---------|-------------|--------|
| `penetration` | `f64` | `0.5` | `[0.0, 1.0)` | `MatHold::with_penetration` (`mat_hold.rs`) |

`with_penetration` outside `[0, 1)` errors (`rejects_invalid_penetration`,
`accepts_valid_penetration`). Python/Node construct with the default.

## Signed ±1 encoding

Single-direction shape: `+1.0` bullish, `0.0` no pattern — one feature-matrix
dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, MatHold, Candle};
// MatHold: Input = Candle, Output = f64
const _: fn(&mut MatHold, Candle) -> Option<f64> = <MatHold as Indicator>::update;
```

- **Always emits a value.** Never `None`; warmup and no-match bars return `0.0`.
- **Node.** `update(open, high, low, close)` → `number`; `batch(open, high, low,
  close)` → `Array<number>`.
- **Python.** `update(candle)` → `float`; `batch(open, high, low, close)` → 1-D
  `array.array('d')` (`0.0` on warmup / no-match).

## Warmup

`warmup_period() == 5`. The first four bars return `0.0`
(`first_four_bars_return_zero`, `accessors_and_metadata`).

## Edge cases

- **Pullback must hold.** A retracement deeper than `penetration` into the first
  body yields `0.0` (`pullback_breaks_hold_yields_zero`).
- **Fifth bar must break out.** Without a new high the result is `0.0`
  (`no_new_high_yields_zero`).
- **Reset.** `reset()` clears the four-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, MatHold};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = MatHold::new();
    println!("{:?}", t.update(Candle::new(10.0, 15.1, 9.9, 15.0, 1.0, 0)?));  // long white
    println!("{:?}", t.update(Candle::new(16.0, 16.1, 15.4, 15.5, 1.0, 1)?)); // small, gaps up
    println!("{:?}", t.update(Candle::new(15.5, 15.6, 14.9, 15.0, 1.0, 2)?)); // small drift
    println!("{:?}", t.update(Candle::new(15.0, 15.1, 14.4, 14.5, 1.0, 3)?)); // small drift, holds
    println!("{:?}", t.update(Candle::new(14.5, 17.1, 14.4, 17.0, 1.0, 4)?)); // white breakout
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

The three-bar rest gaps up and holds above the penetration floor, then bar 5
closes at `17.0`, a new high — a mat hold. This matches `mat_hold_is_plus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([10.0, 16.0, 15.5, 15.0, 14.5])
h = np.array([15.1, 16.1, 15.6, 15.1, 17.1])
l = np.array([9.9,  15.4, 14.9, 14.4, 14.4])
c = np.array([15.0, 15.5, 15.0, 14.5, 17.0])

print(ta.MatHold().batch(o, h, l, c))  # [0. 0. 0. 0. 1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.MatHold();
t.update(10, 15.1, 9.9, 15);
t.update(16, 16.1, 15.4, 15.5);
t.update(15.5, 15.6, 14.9, 15);
t.update(15, 15.1, 14.4, 14.5);
console.log(t.update(14.5, 17.1, 14.4, 17)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, MatHold};

let mut t = MatHold::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if t.update(bar) == Some(1.0) { /* uptrend resumes after a shallow rest */ }
}
```

## Interpretation

1. **Shallow rest = strong trend.** A pullback that gaps up and barely gives
   ground before a breakout is a high-quality continuation signal.
2. **Penetration tunes strictness.** A smaller `penetration` demands a shallower
   rest (stronger trend) to qualify.
3. **Confirm with the trend.** Continuation pattern; use within an uptrend.

## Common pitfalls

- **Deep pullback.** A rest that digs too far into the first body fails the hold
  test — that is a deeper correction, not a mat hold.
- **No breakout.** The fifth candle must make a new high; a flat fifth bar does
  not confirm.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [RisingThreeMethods](/Indicators/Indicator-RisingThreeMethods) — the non-gap sibling.
- [UpsideGapThreeMethods](/Indicators/Indicator-UpsideGapThreeMethods) — gap continuation.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
