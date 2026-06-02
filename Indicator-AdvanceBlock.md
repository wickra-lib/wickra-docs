# AdvanceBlock

> Three-bar bearish warning. Three green candles still push to higher
> closes, but visibly run out of steam — each real body shrinks while the
> upper shadows lengthen, hinting the advance is about to stall.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `-1.0` bearish, `0.0` otherwise (never `+1.0`) |
| Output range | `{-1.0, 0.0}` |
| Default parameters | none — `AdvanceBlock::new()` |
| Warmup period | `3` (first two bars always `0.0`) |
| Interpretation | Bearish exhaustion warning near the top of an advance |

## Formula

```
all three green & higher closes
each opens inside the prior body
shrinking bodies:  body3 < body2 < body1
upper shadow of bar3 >= upper shadow of bar2, and bar3 has an upper shadow
```

Bearish-only (never `+1.0`). The combination of shrinking bodies and growing
upper wicks while still closing higher is the tell that demand is fading. See
`crates/wickra-core/src/indicators/advance_block.rs`.

## Parameters

None. Constructed with `AdvanceBlock::new()`.

## Signed ±1 encoding

Single-direction shape: `−1.0` bearish, `0.0` no pattern — one feature-matrix
dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, AdvanceBlock, Candle};
// AdvanceBlock: Input = Candle, Output = f64
const _: fn(&mut AdvanceBlock, Candle) -> Option<f64> = <AdvanceBlock as Indicator>::update;
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

- **A healthy advance does not fire.** Three strong, non-shrinking green candles
  yield `0.0` (`strong_advance_yields_zero`).
- **Upper shadows must grow.** Without the lengthening upper wick on the third
  candle the result is `0.0` (`no_upper_shadow_growth_yields_zero`).
- **Reset.** `reset()` clears the two-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, AdvanceBlock};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = AdvanceBlock::new();
    println!("{:?}", t.update(Candle::new(10.0, 13.1, 9.9, 13.0, 1.0, 0)?));  // strong green
    println!("{:?}", t.update(Candle::new(12.0, 14.3, 11.9, 14.0, 1.0, 1)?)); // smaller body
    println!("{:?}", t.update(Candle::new(13.5, 15.0, 13.4, 14.5, 1.0, 2)?)); // tiny body, long upper wick
    Ok(())
}
```

Output:

```
Some(0.0)
Some(0.0)
Some(-1.0)
```

Bodies shrink `3.0 → 2.0 → 1.0` while the third candle sprouts a `0.5` upper
shadow — an advance block. This matches `advance_block_is_minus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([10.0, 12.0, 13.5])
h = np.array([13.1, 14.3, 15.0])
l = np.array([9.9,  11.9, 13.4])
c = np.array([13.0, 14.0, 14.5])

print(ta.AdvanceBlock().batch(o, h, l, c))  # [ 0.  0. -1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.AdvanceBlock();
t.update(10, 13.1, 9.9, 13);
t.update(12, 14.3, 11.9, 14);
console.log(t.update(13.5, 15, 13.4, 14.5)); // -1
```

### Streaming

```rust
use wickra::{Candle, Indicator, AdvanceBlock};

let mut t = AdvanceBlock::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if t.update(bar) == Some(-1.0) { /* advance is stalling — protect longs */ }
}
```

## Interpretation

1. **Fading demand.** Higher closes on shrinking bodies and rising upper wicks
   reveal supply meeting the advance — a caution flag near a top.
2. **Warning, not trigger.** Like Stalled Pattern it argues for caution, not an
   immediate short.
3. **Best near resistance.** Most meaningful at the top of an extended run.

## Common pitfalls

- **Confusing it with healthy three soldiers.** A strong, even three-soldier
  advance is bullish; Advance Block is specifically the *weakening* version.
- **Expecting an instant reversal.** It flags exhaustion, not a confirmed turn.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [StalledPattern](Indicator-StalledPattern) — sibling deliberation top.
- [ThreeSoldiersOrCrows](Indicator-ThreeSoldiersOrCrows) — the healthy advance
  this warns is tiring.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
