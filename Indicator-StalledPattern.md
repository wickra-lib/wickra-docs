# StalledPattern

> Three-bar bearish reversal warning (also called Deliberation). Two long
> white candles push higher, then a small-bodied white candle opens at or
> near the top of the second body and barely advances — the rally is
> running out of breath.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `-1.0` bearish, `0.0` otherwise (never `+1.0`) |
| Output range | `{-1.0, 0.0}` |
| Default parameters | none — `StalledPattern::new()` |
| Warmup period | `3` (first two bars always `0.0`) |
| Interpretation | Bearish exhaustion warning near the top of an advance |

## Formula

```
long body  = |close − open| >= 0.5 · range
small body = |close − open| <= 0.3 · range
bar1, bar2 long white;  bar3 small white
rising closes:  close3 > close2 > close1
bar3 rides the shoulder:  open3 >= close2 − 0.1 · (high2 − low2)
```

Bearish-only (never `+1.0`). After two strong white candles, the small white
third candle perched on the second's shoulder shows buyers losing momentum.
Thresholds are geometric, not TA-Lib rolling averages. See
`crates/wickra-core/src/indicators/stalled_pattern.rs`.

## Parameters

None. Constructed with `StalledPattern::new()`.

## Signed ±1 encoding

Single-direction shape: `−1.0` bearish, `0.0` no pattern — one feature-matrix
dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, StalledPattern, Candle};
// StalledPattern: Input = Candle, Output = f64
const _: fn(&mut StalledPattern, Candle) -> Option<f64> = <StalledPattern as Indicator>::update;
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

- **All three must be white & rising.** A black bar
  (`non_white_yields_zero`) or non-ascending closes
  (`non_rising_closes_yield_zero`) yields `0.0`.
- **Leading bodies must be long.** Short first/second bodies → `0.0`
  (`short_first_bodies_yield_zero`).
- **Third body must be small and on the shoulder.** A large third body
  (`large_third_body_yields_zero`) or a third candle that opens well below the
  second close (`third_bar_off_shoulder_yields_zero`) yields `0.0`.
- **Zero range.** A flat bar yields `0.0` (`zero_range_yields_zero`).
- **Reset.** `reset()` clears the two-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, StalledPattern};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = StalledPattern::new();
    println!("{:?}", t.update(Candle::new(10.0, 12.05, 9.9, 12.0, 1.0, 0)?));  // long white
    println!("{:?}", t.update(Candle::new(11.0, 14.05, 10.9, 14.0, 1.0, 1)?)); // long white
    println!("{:?}", t.update(Candle::new(14.0, 14.6, 13.95, 14.15, 1.0, 2)?));// small white, stalls
    Ok(())
}
```

Output:

```
Some(0.0)
Some(0.0)
Some(-1.0)
```

The third candle is a small white body (`0.15` of a `0.65` range) opening at
`14.0` on the second candle's shoulder (`close2 = 14.0`) and barely advancing —
a stalled pattern. This matches `stalled_pattern_is_minus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([10.0, 11.0, 14.0])
h = np.array([12.05, 14.05, 14.6])
l = np.array([9.9,  10.9, 13.95])
c = np.array([12.0, 14.0, 14.15])

print(ta.StalledPattern().batch(o, h, l, c))  # [ 0.  0. -1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.StalledPattern();
t.update(10, 12.05, 9.9, 12);
t.update(11, 14.05, 10.9, 14);
console.log(t.update(14, 14.6, 13.95, 14.15)); // -1
```

### Streaming

```rust
use wickra::{Candle, Indicator, StalledPattern};

let mut t = StalledPattern::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if t.update(bar) == Some(-1.0) { /* rally stalling — tighten longs / watch for a top */ }
}
```

## Interpretation

1. **Loss of momentum.** Two strong up candles followed by a tiny one on the
   shoulder shows demand thinning — a warning of a possible top, not a
   confirmed reversal.
2. **Warning, not trigger.** Like Advance Block, it argues for caution on
   longs rather than an outright short; wait for a bearish confirmation candle.
3. **Best near resistance.** Most meaningful at the top of an extended advance
   or into resistance.

## Common pitfalls

- **Expecting an immediate drop.** "Stalled" means momentum is fading, not that
  price reverses on the next bar.
- **Confusing it with Advance Block.** Both are deliberation tops;
  [AdvanceBlock](Indicator-AdvanceBlock) emphasises shrinking bodies with rising
  shadows across all three, while StalledPattern keys on the small third candle
  riding the shoulder.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [AdvanceBlock](Indicator-AdvanceBlock) — sibling deliberation top.
- [ThreeSoldiersOrCrows](Indicator-ThreeSoldiersOrCrows) — the healthy
  three-soldier advance this pattern warns is tiring.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
