# StickSandwich

> Three-bar bullish reversal. A black candle, then a white candle that
> trades entirely above the first close, then a second black candle that
> drives price back down to close at the *same level* as the first. The
> matching closes "sandwich" the white candle and mark a support floor.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` bullish, `0.0` otherwise (never `-1.0`) |
| Output range | `{0.0, +1.0}` |
| Default parameters | none — `StickSandwich::new()` |
| Warmup period | `3` (first two bars always `0.0`) |
| Interpretation | Bullish reversal; the twice-tested close marks support |

## Formula

```
bar1 black, bar2 white, bar3 black
bar2 trades above bar1's close:  low2 > close1
matching closes:  |close3 − close1| <= 0.1 · (high1 − low1)
```

Bullish-only (never `−1.0`). The two black candles closing at the same level —
with a white candle between — define a support floor that held on the retest.
The matching-close tolerance is a fixed fraction of the first bar's range
(geometric house style), not a TA-Lib rolling average. See
`crates/wickra-core/src/indicators/stick_sandwich.rs`.

## Parameters

None. Constructed with `StickSandwich::new()`.

## Signed ±1 encoding

Single-direction shape: `+1.0` bullish, `0.0` no pattern — one feature-matrix
dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, StickSandwich, Candle};
// StickSandwich: Input = Candle, Output = f64
const _: fn(&mut StickSandwich, Candle) -> Option<f64> = <StickSandwich as Indicator>::update;
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

- **Colour sequence must be black / white / black.** A wrong colour at any
  position yields `0.0` (`first_candle_not_black_yields_zero`,
  `middle_candle_not_white_yields_zero`, `third_candle_not_black_yields_zero`).
- **Middle candle must trade above the first close.** Otherwise `0.0`
  (`middle_low_not_above_first_close_yields_zero`).
- **Closes must match.** A third close away from the first by more than the
  tolerance yields `0.0` (`mismatched_closes_yield_zero`).
- **Reset.** `reset()` clears the two-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, StickSandwich};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = StickSandwich::new();
    println!("{:?}", t.update(Candle::new(12.0, 12.1, 9.9, 10.0, 1.0, 0)?));  // black, close 10
    println!("{:?}", t.update(Candle::new(10.5, 11.6, 10.4, 11.5, 1.0, 1)?)); // white, above 10
    println!("{:?}", t.update(Candle::new(11.5, 11.6, 9.9, 10.0, 1.0, 2)?));  // black, close 10
    Ok(())
}
```

Output:

```
Some(0.0)
Some(0.0)
Some(1.0)
```

Both black candles close at `10.0` and the white candle's low `10.4` stays above
that floor — a stick sandwich. This matches `stick_sandwich_is_plus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([12.0, 10.5, 11.5])
h = np.array([12.1, 11.6, 11.6])
l = np.array([9.9,  10.4, 9.9])
c = np.array([10.0, 11.5, 10.0])

print(ta.StickSandwich().batch(o, h, l, c))  # [0. 0. 1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.StickSandwich();
t.update(12, 12.1, 9.9, 10);
t.update(10.5, 11.6, 10.4, 11.5);
console.log(t.update(11.5, 11.6, 9.9, 10)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, StickSandwich};

let mut t = StickSandwich::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if t.update(bar) == Some(1.0) { /* support floor held on the retest */ }
}
```

## Interpretation

1. **Twice-tested support.** Two black closes at the same level, separated by a
   white candle, show sellers failing to push below a floor — a bullish reversal
   cue after a decline.
2. **Soft signal.** Weaker than a bullish engulfing; the matching close is the
   whole story, so confirmation matters.
3. **Confirm.** Look for a follow-through close above the white candle's high or
   a supportive momentum reading.

## Common pitfalls

- **Demanding exact equality.** The two closes only need to match within a small
  tolerance (10 % of the first bar's range), not to the tick.
- **No downtrend context.** As a reversal it is meaningful after a decline, not
  mid-range.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [MatchingLow](/Indicators/Indicator-MatchingLow) — two-bar version: consecutive equal
  closes at a low.
- [UniqueThreeRiver](/Indicators/Indicator-UniqueThreeRiver) — another three-bar bottoming
  pattern.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
