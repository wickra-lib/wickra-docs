# Counterattack

> Two-bar reversal where the second bar storms back to close right where
> the first closed. A long candle runs with the trend, then an
> opposite-coloured long candle opens far in the trend direction and
> rallies (or sells off) all the way back to the prior close — the two
> level closes form the "counterattack line".

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` bullish, `-1.0` bearish, `0.0` otherwise |
| Output range | `{-1.0, 0.0, +1.0}` |
| Default parameters | `equal_tolerance = 0.05` (TA-Lib "equal" factor); bindings use the default |
| Warmup period | `2` (first bar always `0.0`) |
| Interpretation | Two-bar reversal; matching closes mark the line |

## Formula

```
long bodies = |close − open| >= 0.5 · (high − low)   (both bars)
equal closes = |close2 − close1| <= equal_tolerance · mean(range1, range2)
bullish (+1.0): bar1 black (down), bar2 white (up),  equal closes
bearish (-1.0): bar1 white (up),   bar2 black (down), equal closes
```

The defining feature is the matched close: the counterattack candle erases the
session's move and stops exactly at the prior close. See
`crates/wickra-core/src/indicators/counterattack.rs`.

## Parameters

| Name | Type | Default | Valid range | Source |
|------|------|---------|-------------|--------|
| `equal_tolerance` | `f64` | `0.05` | `[0.0, 1.0)` | `Counterattack::with_tolerance` (`counterattack.rs`) |

`with_tolerance` outside `[0, 1)` errors (`rejects_invalid_tolerance`,
`accepts_valid_tolerance`). Python/Node construct with the default.

## Signed ±1 encoding

Emits the uniform candlestick sign convention — `+1.0` bullish, `−1.0` bearish,
`0.0` no pattern — a single feature-matrix dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, Counterattack, Candle};
// Counterattack: Input = Candle, Output = f64
const _: fn(&mut Counterattack, Candle) -> Option<f64> = <Counterattack as Indicator>::update;
```

- **Always emits a value.** Never `None`; warmup and no-match bars return `0.0`.
- **Node.** `update(open, high, low, close)` → `number`; `batch(open, high, low,
  close)` → `Array<number>`.
- **Python.** `update(candle)` → `float`; `batch(open, high, low, close)` → 1-D
  `numpy.ndarray` (`0.0` on warmup / no-match).

## Warmup

`warmup_period() == 2`. The first bar returns `0.0` (`first_bar_returns_zero`,
`accessors_and_metadata`).

## Edge cases

- **Closes must be level.** A second close away from the first by more than the
  tolerance yields `0.0` (`unequal_close_yields_zero`).
- **Colours must oppose.** Same-coloured bars yield `0.0`
  (`same_color_yields_zero`).
- **Both bodies must be long.** A short body yields `0.0`
  (`short_body_yields_zero`).
- **Reset.** `reset()` clears the one-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Counterattack, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = Counterattack::new();
    println!("{:?}", t.update(Candle::new(20.0, 20.1, 14.9, 15.0, 1.0, 0)?)); // long black, close 15
    println!("{:?}", t.update(Candle::new(10.0, 15.1, 9.9, 15.0, 1.0, 1)?));  // long white, close 15
    Ok(())
}
```

Output:

```
Some(0.0)
Some(1.0)
```

Both bars close at `15.0` with opposite colours and long bodies — a bullish
counterattack. This matches `bullish_counterattack_is_plus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([20.0, 10.0])
h = np.array([20.1, 15.1])
l = np.array([14.9, 9.9])
c = np.array([15.0, 15.0])

print(ta.Counterattack().batch(o, h, l, c))  # [0. 1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.Counterattack();
t.update(20, 20.1, 14.9, 15);
console.log(t.update(10, 15.1, 9.9, 15)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, Counterattack};

let mut t = Counterattack::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    match t.update(bar) {
        Some(1.0)  => { /* bullish counterattack at a low */ }
        Some(-1.0) => { /* bearish counterattack at a high */ }
        _ => {}
    }
}
```

## Interpretation

1. **Momentum snap-back.** The counterattack candle fully reverses the prior
   session and halts at its close — a reversal cue when it appears at an extreme.
2. **Weaker than piercing/engulfing.** Because the second bar only returns *to*
   the prior close (not through it), it is softer than a piercing line or
   engulfing; confirmation matters.
3. **Watch the level.** The shared close often becomes a near-term pivot.

## Common pitfalls

- **Demanding identical closes.** They only need to match within
  `equal_tolerance` (5 % of mean range).
- **Confusing with piercing.** [PiercingDarkCloud](Indicator-PiercingDarkCloud)
  pushes *into* the prior body; a counterattack stops at the prior close.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [PiercingDarkCloud](Indicator-PiercingDarkCloud) — stronger two-bar reversal.
- [Engulfing](Indicator-Engulfing) — full-body two-bar reversal.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
