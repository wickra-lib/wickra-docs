# Hikkake

> Three-bar trap. An inside bar sets up a breakout that immediately fails
> on the next bar, trapping breakout traders and pointing the opposite
> way.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` bullish setup, `-1.0` bearish setup, `0.0` otherwise |
| Output range | `{-1.0, 0.0, +1.0}` |
| Default parameters | none — `Hikkake::new()` |
| Warmup period | `3` (first two bars always `0.0`) |
| Interpretation | Failed-breakout trap; fade the false break |

## Formula

```
inside bar:  bar2.high < bar1.high  &&  bar2.low > bar1.low
bullish (+1.0): bar3 makes a LOWER high AND LOWER low than bar2
                (a false downside break -> expect a move up)
bearish (-1.0): bar3 makes a HIGHER high AND HIGHER low than bar2
                (a false upside break -> expect a move down)
```

The detector fires when the three-bar setup completes on bar3; it does not
separately flag the optional later confirmation bar. A range-based pattern
(uses highs/lows, not bodies). See
`crates/wickra-core/src/indicators/hikkake.rs`.

## Parameters

None. Constructed with `Hikkake::new()`.

## Signed ±1 encoding

Emits the uniform candlestick sign convention — `+1.0` bullish setup, `−1.0`
bearish setup, `0.0` no pattern — a single feature-matrix dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, Hikkake, Candle};
// Hikkake: Input = Candle, Output = f64
const _: fn(&mut Hikkake, Candle) -> Option<f64> = <Hikkake as Indicator>::update;
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

- **Bar 2 must be an inside bar.** If bar2 is not contained by bar1 the result is
  `0.0` (`not_inside_bar_yields_zero`).
- **Bar 3 must break one way cleanly.** A bar3 that engulfs bar2 (both higher
  high and lower low, an outside bar) yields `0.0` (`outside_bar3_yields_zero`).
- **Reset.** `reset()` clears the two-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, Hikkake};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = Hikkake::new();
    println!("{:?}", t.update(Candle::new(10.0, 15.0, 5.0, 12.0, 1.0, 0)?)); // wide bar
    println!("{:?}", t.update(Candle::new(11.0, 13.0, 8.0, 12.0, 1.0, 1)?)); // inside bar
    println!("{:?}", t.update(Candle::new(9.0, 12.0, 6.0, 7.0, 1.0, 2)?));   // lower high & low
    Ok(())
}
```

Output:

```
Some(0.0)
Some(0.0)
Some(1.0)
```

Bar3's high `12 < 13` and low `6 < 8` — a false downside break of the inside bar,
so the bullish hikkake fires. This matches `bullish_hikkake_is_plus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([10.0, 11.0, 9.0])
h = np.array([15.0, 13.0, 12.0])
l = np.array([5.0,  8.0,  6.0])
c = np.array([12.0, 12.0, 7.0])

print(ta.Hikkake().batch(o, h, l, c))  # [0. 0. 1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.Hikkake();
t.update(10, 15, 5, 12);
t.update(11, 13, 8, 12);
console.log(t.update(9, 12, 6, 7)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, Hikkake};

let mut t = Hikkake::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    match t.update(bar) {
        Some(1.0)  => { /* false downside break — lean long */ }
        Some(-1.0) => { /* false upside break — lean short */ }
        _ => {}
    }
}
```

## Interpretation

1. **Trap the breakout crowd.** A failed break of the inside bar's range traps
   traders who chased it; the hikkake points the other way.
2. **Optional confirmation.** Classic hikkake waits for a later close beyond the
   inside bar; this detector flags the setup — pair it with your own confirm.
3. **Works in ranges.** Especially useful in choppy, range-bound markets where
   false breaks are common.

## Common pitfalls

- **Outside-bar bar3.** A bar3 that makes both a higher high and a lower low is
  not a clean one-way break and does not qualify.
- **Range-based, not body-based.** The pattern reads highs/lows, not candle
  bodies.

## References

- Daniel Chesler, "Inside Bars / Hikkake Pattern" (technical-analysis
  literature); Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [HikkakeModified](Indicator-HikkakeModified) — close-confirmed variant.
- [Harami](Indicator-Harami) — the inside-bar reversal pattern.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
