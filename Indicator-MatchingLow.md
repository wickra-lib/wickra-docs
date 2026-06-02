# MatchingLow

> Two-bar bullish reversal. Two black candles in a decline close at the
> *same* level: the second sell-off cannot push price any lower, so the
> matching closes mark a support floor.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` bullish, `0.0` otherwise (never `-1.0`) |
| Output range | `{0.0, +1.0}` |
| Default parameters | none — `MatchingLow::new()` |
| Warmup period | `2` (first bar always `0.0`) |
| Interpretation | Bullish support floor after a decline |

## Formula

```
bar1, bar2 both black
equal closes = |close2 − close1| <= 0.05 · mean(range1, range2)
```

Bullish-only (never `−1.0`). Two black closes at the same level mark a floor
sellers could not break. The two-bar precursor to the three-bar
[StickSandwich](Indicator-StickSandwich). See
`crates/wickra-core/src/indicators/matching_low.rs`.

## Parameters

None. Constructed with `MatchingLow::new()`.

## Signed ±1 encoding

Single-direction shape: `+1.0` bullish, `0.0` no pattern — one feature-matrix
dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, MatchingLow, Candle};
// MatchingLow: Input = Candle, Output = f64
const _: fn(&mut MatchingLow, Candle) -> Option<f64> = <MatchingLow as Indicator>::update;
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

- **Closes must match.** A different second close yields `0.0`
  (`different_close_yields_zero`).
- **Both bars must be black.** A white second bar yields `0.0`
  (`second_bar_white_yields_zero`).
- **Reset.** `reset()` clears the one-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, MatchingLow};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = MatchingLow::new();
    println!("{:?}", t.update(Candle::new(15.0, 15.1, 9.9, 10.0, 1.0, 0)?)); // black, close 10
    println!("{:?}", t.update(Candle::new(13.0, 13.1, 9.9, 10.0, 1.0, 1)?)); // black, close 10
    Ok(())
}
```

Output:

```
Some(0.0)
Some(1.0)
```

Both black candles close at `10.0` — a matching low. This matches
`matching_low_is_plus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([15.0, 13.0])
h = np.array([15.1, 13.1])
l = np.array([9.9,  9.9])
c = np.array([10.0, 10.0])

print(ta.MatchingLow().batch(o, h, l, c))  # [0. 1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.MatchingLow();
t.update(15, 15.1, 9.9, 10);
console.log(t.update(13, 13.1, 9.9, 10)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, MatchingLow};

let mut t = MatchingLow::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if t.update(bar) == Some(1.0) { /* support floor formed — watch for a turn */ }
}
```

## Interpretation

1. **Floor held.** Two black sessions closing at the same level show sellers
   unable to extend — a soft bullish reversal cue after a decline.
2. **Soft signal.** The matched close is the whole pattern; confirm with a
   follow-through up candle.
3. **Best at support.** Most meaningful after a decline.

## Common pitfalls

- **Demanding tick-equal closes.** They only need to match within 5 % of the
  mean range.
- **No downtrend context.** Only meaningful inside a decline.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [StickSandwich](Indicator-StickSandwich) — the three-bar version.
- [HomingPigeon](Indicator-HomingPigeon) — another soft two-bar bottoming pattern.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
