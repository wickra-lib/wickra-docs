# HighWave

> Single-bar extreme-indecision signal. A small body with very long
> shadows on *both* sides: price swung far up and far down yet finished
> near the open — trend conviction has evaporated.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` detected (indecision), `0.0` otherwise |
| Output range | `{0.0, +1.0}` |
| Default parameters | none — `HighWave::new()` |
| Warmup period | `1` |
| Interpretation | Non-directional extreme indecision |

## Formula

```
range = high − low
long upper = high − max(open, close) >= 0.4 · range
long lower = min(open, close) − low  >= 0.4 · range
```

The two long-shadow conditions force the body below `0.2 · range`, so no separate
body test is needed. A **non-directional** flag (never `−1.0`) — a stronger
indecision signal than the doji family because both shadows are *very* long. See
`crates/wickra-core/src/indicators/high_wave.rs`.

## Parameters

None. Constructed with `HighWave::new()`.

## Signed ±1 encoding

Indecision flag: `+1.0` detected, `0.0` no pattern — one feature-matrix
dimension (the `+1.0` marks *detection*, not direction).

## Inputs / Outputs

```rust
use wickra::{Indicator, HighWave, Candle};
// HighWave: Input = Candle, Output = f64
const _: fn(&mut HighWave, Candle) -> Option<f64> = <HighWave as Indicator>::update;
```

- **Always emits a value.** Never `None`; non-matching bars return `0.0`.
- **Node.** `update(open, high, low, close)` → `number`; `batch(open, high, low,
  close)` → `Array<number>`.
- **Python.** `update(candle)` → `float`; `batch(open, high, low, close)` → 1-D
  `numpy.ndarray` (`0.0` on no-match).

## Warmup

`warmup_period() == 1` — emits from the first candle (`accessors_and_metadata`).

## Edge cases

- **Short shadow on either side.** A short upper or lower shadow yields `0.0`
  (`short_upper_shadow_yields_zero`, `short_lower_shadow_yields_zero`).
- **Body too big.** A large body yields `0.0` (`big_body_yields_zero`).
- **Zero range.** A flat bar yields `0.0` (`zero_range_yields_zero`).
- **Reset.** `reset()` clears the has-emitted flag (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, HighWave};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = HighWave::new();
    // Small body, very long shadows both sides.
    println!("{:?}", t.update(Candle::new(10.0, 12.0, 8.0, 10.3, 1.0, 0)?));
    Ok(())
}
```

Output:

```
Some(1.0)
```

`range = 4.0`, upper shadow ≈ `1.7`, lower shadow `2.0` (both `> 0.4·range`) — a
high-wave candle. This matches `high_wave_is_plus_one`.

### Python

```python
import numpy as np
import wickra as ta

print(ta.HighWave().batch(
    np.array([10.0]), np.array([12.0]), np.array([8.0]), np.array([10.3])))  # [1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.HighWave();
console.log(t.update(10, 12, 8, 10.3)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, HighWave};

let mut t = HighWave::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if t.update(bar) == Some(1.0) { /* conviction gone — expect volatility/turn */ }
}
```

## Interpretation

1. **Volatility + indecision.** Very long shadows both ways show a violent but
   ultimately undecided session — often a precursor to a sharp move or a turn.
2. **Context decides direction.** A non-directional flag; read the trend or the
   next bar for resolution.
3. **Cluster signal.** Several high-wave candles together mark a battleground /
   distribution zone.

## Common pitfalls

- **Reading +1.0 as bullish.** It marks detection, not direction.
- **Confusing with a long-legged doji.** [LongLeggedDoji](Indicator-LongLeggedDoji)
  requires a near-zero (doji) body; high-wave allows a small real body with even
  longer shadows.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [LongLeggedDoji](Indicator-LongLeggedDoji) — the doji-bodied cousin.
- [SpinningTop](Indicator-SpinningTop) — small body, moderate shadows.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
