# Breakaway

> Five-bar reversal that fades an exhausted run. A trend gaps away on the
> second bar, drifts two more bars in the same direction, then the fifth
> bar snaps the other way and closes back inside the body gap left between
> the first and second bars — the move has broken away from the crowd and
> is turning.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` bullish, `-1.0` bearish, `0.0` otherwise |
| Output range | `{-1.0, 0.0, +1.0}` |
| Default parameters | none — `Breakaway::new()` |
| Warmup period | `5` (first four bars always `0.0`) |
| Interpretation | Reversal that fades an over-extended, gapped run |

## Formula

```
bullish (+1.0) — appears in a decline:
  bar1 black
  bar2 black & body gaps DOWN below bar1's body   (bar2.open < bar1.close)
  bar3 extends lower (high & low below bar2)
  bar4 black & extends lower (high & low below bar3)
  bar5 green & closes inside the bar1/bar2 body gap  (bar2.open < close < bar1.close)

bearish (-1.0) — the mirror in an advance.
```

The middle bar (`bar3`) may be either colour — only its high/low must extend the
run. Recognition uses TA-Lib's `CDLBREAKAWAY` body-gap and high/low ordering
rules directly (no rolling body-length average), matching the geometric house
style. See `crates/wickra-core/src/indicators/breakaway.rs`.

## Parameters

None. Constructed with `Breakaway::new()`.

## Signed ±1 encoding

Emits the uniform candlestick sign convention — `+1.0` bullish, `−1.0` bearish,
`0.0` no pattern — a single feature-matrix dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, Breakaway, Candle};
// Breakaway: Input = Candle, Output = f64
const _: fn(&mut Breakaway, Candle) -> Option<f64> = <Breakaway as Indicator>::update;
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

- **Body gap required.** Without the bar1→bar2 body gap the result is `0.0`
  (`no_body_gap_yields_zero`).
- **Fifth bar must close inside the gap.** A fifth close outside the bar1/bar2
  body gap yields `0.0` (`bullish_close_outside_gap_yields_zero`).
- **Both directions.** Pinned by `bullish_breakaway_is_plus_one` and
  `bearish_breakaway_is_minus_one`.
- **Reset.** `reset()` clears the four-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, Breakaway};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = Breakaway::new();
    println!("{:?}", t.update(Candle::new(20.0, 20.2, 14.8, 15.0, 1.0, 0)?)); // black
    println!("{:?}", t.update(Candle::new(14.0, 14.1, 11.9, 12.0, 1.0, 1)?)); // black, gaps down
    println!("{:?}", t.update(Candle::new(12.5, 13.0, 10.5, 11.0, 1.0, 2)?)); // extends lower
    println!("{:?}", t.update(Candle::new(11.0, 11.5, 9.0, 9.5, 1.0, 3)?));   // black, lower
    println!("{:?}", t.update(Candle::new(9.5, 14.7, 9.4, 14.5, 1.0, 4)?));   // green, into the gap
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

The fifth candle closes at `14.5`, inside the bar1/bar2 body gap `(12, 15)`,
reversing a four-bar slide — a bullish breakaway. This matches
`bullish_breakaway_is_plus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([20.0, 14.0, 12.5, 11.0, 9.5])
h = np.array([20.2, 14.1, 13.0, 11.5, 14.7])
l = np.array([14.8, 11.9, 10.5, 9.0,  9.4])
c = np.array([15.0, 12.0, 11.0, 9.5,  14.5])

print(ta.Breakaway().batch(o, h, l, c))  # [0. 0. 0. 0. 1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.Breakaway();
t.update(20, 20.2, 14.8, 15);
t.update(14, 14.1, 11.9, 12);
t.update(12.5, 13, 10.5, 11);
t.update(11, 11.5, 9, 9.5);
console.log(t.update(9.5, 14.7, 9.4, 14.5)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, Breakaway};

let mut t = Breakaway::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    match t.update(bar) {
        Some(1.0)  => { /* bullish breakaway — fade the slide */ }
        Some(-1.0) => { /* bearish breakaway — fade the run-up */ }
        _ => {}
    }
}
```

## Interpretation

1. **Over-extension fade.** The gap-and-drift run sets up an exhausted move; the
   snap-back fifth bar fades it back into the original gap.
2. **Reversal after a sprint.** Best read when the four-bar run is clearly
   over-extended into support (bullish) or resistance (bearish).
3. **Confirm.** A single reversal bar after a sharp run can be a dead-cat bounce;
   wait for follow-through.

## Common pitfalls

- **Middle-bar colour.** Bar 3's colour does not matter — only its extension of
  the run.
- **Close must re-enter the gap.** A big reversal bar that overshoots the gap is
  not a textbook breakaway.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [ThreeLineStrike](/Indicators/Indicator-ThreeLineStrike) — another multi-bar run + snap.
- [LadderBottom](/Indicators/Indicator-LadderBottom) — five-bar bottoming reversal.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
