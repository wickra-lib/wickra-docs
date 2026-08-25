# HikkakeModified

> Close-confirmed variant of the [Hikkake](/Indicators/Indicator-Hikkake) trap. An
> inside bar is followed by a bar that breaks out *and is immediately
> rejected* — it pierces the inside bar's range intrabar but closes back
> inside, a stronger signal than the plain breakout setup.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` bullish, `-1.0` bearish, `0.0` otherwise |
| Output range | `{-1.0, 0.0, +1.0}` |
| Default parameters | none — `HikkakeModified::new()` |
| Warmup period | `3` (first two bars always `0.0`) |
| Interpretation | Close-confirmed failed-breakout trap |

## Formula

```
inside bar:  bar2.high < bar1.high  &&  bar2.low > bar1.low
bullish (+1.0): bar3 makes a lower high AND lower low than bar2,
                yet closes back above the inside-bar low   (close3 > bar2.low)
bearish (-1.0): bar3 makes a higher high AND higher low than bar2,
                yet closes back below the inside-bar high  (close3 < bar2.high)
```

The extra close-recovery condition is what distinguishes it from the plain
[Hikkake](/Indicators/Indicator-Hikkake), which fires on the high/low break alone. See
`crates/wickra-core/src/indicators/hikkake_modified.rs`.

## Parameters

None. Constructed with `HikkakeModified::new()`.

## Signed ±1 encoding

Emits the uniform candlestick sign convention — `+1.0` bullish, `−1.0` bearish,
`0.0` no pattern — a single feature-matrix dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, HikkakeModified, Candle};
// HikkakeModified: Input = Candle, Output = f64
const _: fn(&mut HikkakeModified, Candle) -> Option<f64> = <HikkakeModified as Indicator>::update;
```

- **Always emits a value.** Never `None`; warmup and no-match bars return `0.0`.
- **Node.** `update(open, high, low, close)` → `number`; `batch(open, high, low,
  close)` → `Array<number>`.
- **Python.** `update(candle)` → `float`; `batch(open, high, low, close)` → 1-D
  `array.array('d')` (`0.0` on warmup / no-match).

## Warmup

`warmup_period() == 3`. The first two bars return `0.0`
(`first_two_bars_return_zero`, `accessors_and_metadata`).

## Edge cases

- **Break must be rejected at the close.** A break that does *not* recover back
  inside the inside-bar range yields `0.0`
  (`break_without_close_recovery_yields_zero`).
- **Bar 2 must be an inside bar.** Otherwise `0.0` (`not_inside_bar_yields_zero`).
- **Reset.** `reset()` clears the two-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, HikkakeModified};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = HikkakeModified::new();
    println!("{:?}", t.update(Candle::new(10.0, 15.0, 5.0, 12.0, 1.0, 0)?)); // wide bar
    println!("{:?}", t.update(Candle::new(11.0, 13.0, 8.0, 12.0, 1.0, 1)?)); // inside bar
    println!("{:?}", t.update(Candle::new(9.0, 12.0, 6.0, 9.0, 1.0, 2)?));   // lower break, closes back above 8
    Ok(())
}
```

Output:

```
Some(0.0)
Some(0.0)
Some(1.0)
```

Bar3 breaks below the inside bar (low `6 < 8`) but closes at `9.0`, back above the
inside-bar low `8` — a close-confirmed bullish modified hikkake. This matches
`bullish_modified_hikkake_is_plus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([10.0, 11.0, 9.0])
h = np.array([15.0, 13.0, 12.0])
l = np.array([5.0,  8.0,  6.0])
c = np.array([12.0, 12.0, 9.0])

print(ta.HikkakeModified().batch(o, h, l, c))  # [0. 0. 1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.HikkakeModified();
t.update(10, 15, 5, 12);
t.update(11, 13, 8, 12);
console.log(t.update(9, 12, 6, 9)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, HikkakeModified};

let mut t = HikkakeModified::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    match t.update(bar) {
        Some(1.0)  => { /* rejected downside break — lean long */ }
        Some(-1.0) => { /* rejected upside break — lean short */ }
        _ => {}
    }
}
```

## Interpretation

1. **Stronger than plain hikkake.** The close-back-inside rejection is firmer
   evidence the breakout failed — fewer false positives than the bare range
   break.
2. **Fade the trap.** Lean in the direction opposite the failed break.
3. **Range markets.** Like the plain hikkake, most useful in choppy ranges.

## Common pitfalls

- **Break that holds.** If the close does not recover inside the inside-bar
  range, this is a real break, not a trap — no signal.
- **Confusing with plain hikkake.** [Hikkake](/Indicators/Indicator-Hikkake) needs only the
  high/low break; this one also needs the close recovery.

## References

- Daniel Chesler, "Inside Bars / Hikkake Pattern" (technical-analysis
  literature); Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [Hikkake](/Indicators/Indicator-Hikkake) — the plain break-only variant.
- [Harami](/Indicators/Indicator-Harami) — the inside-bar reversal pattern.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
