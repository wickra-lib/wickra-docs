# RickshawMan

> Single-bar indecision signal. A long-legged doji whose tiny body sits
> near the *middle* of a wide range — the most balanced form of
> indecision: neither side controlled the close and the midpoint pins it.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` detected (indecision), `0.0` otherwise |
| Output range | `{0.0, +1.0}` |
| Default parameters | none — `RickshawMan::new()` |
| Warmup period | `1` |
| Interpretation | Non-directional indecision, perfectly balanced |

## Formula

```
range = high − low
doji         = |close − open| <= 0.1 · range
long upper   = high − max(open, close) >= 0.3 · range
long lower   = min(open, close) − low  >= 0.3 · range
centred body = the body midpoint sits within the central 40–60 % of the range
```

A **non-directional** flag (never `−1.0`); a special case of
[LongLeggedDoji](/Indicators/Indicator-LongLeggedDoji) with the added centring constraint, so
both detectors may flag the same bar. See
`crates/wickra-core/src/indicators/rickshaw_man.rs`.

## Parameters

None. Constructed with `RickshawMan::new()`.

## Signed ±1 encoding

Indecision flag: `+1.0` detected, `0.0` no pattern — one feature-matrix
dimension (the `+1.0` marks *detection*, not direction).

## Inputs / Outputs

```rust
use wickra::{Indicator, RickshawMan, Candle};
// RickshawMan: Input = Candle, Output = f64
const _: fn(&mut RickshawMan, Candle) -> Option<f64> = <RickshawMan as Indicator>::update;
```

- **Always emits a value.** Never `None`; non-matching bars return `0.0`.
- **Node.** `update(open, high, low, close)` → `number`; `batch(open, high, low,
  close)` → `Array<number>`.
- **Python.** `update(candle)` → `float`; `batch(open, high, low, close)` → 1-D
  `numpy.ndarray` (`0.0` on no-match).

## Warmup

`warmup_period() == 1` — emits from the first candle (`accessors_and_metadata`).

## Edge cases

- **Off-centre body.** A long-legged doji whose body is not centred yields `0.0`
  (`off_centre_body_yields_zero`).
- **One-sided shadow.** Only one long shadow yields `0.0`
  (`one_sided_shadow_yields_zero`).
- **Not a doji.** A real body yields `0.0` (`non_doji_yields_zero`); a flat bar
  yields `0.0` (`zero_range_yields_zero`).
- **Reset.** `reset()` clears the has-emitted flag (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, RickshawMan};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = RickshawMan::new();
    // Tiny body dead-centre, long shadows both sides.
    println!("{:?}", t.update(Candle::new(10.0, 12.0, 8.0, 10.0, 1.0, 0)?));
    Ok(())
}
```

Output:

```
Some(1.0)
```

`range = 4.0`, body ≈ `0` centred at `10.0` (the midpoint of `8..12`), with both
shadows `2.0` (`> 0.3·range`) — a rickshaw man. This matches
`rickshaw_is_plus_one`.

### Python

```python
import numpy as np
import wickra as ta

print(ta.RickshawMan().batch(
    np.array([10.0]), np.array([12.0]), np.array([8.0]), np.array([10.0])))  # [1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.RickshawMan();
console.log(t.update(10, 12, 8, 10)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, RickshawMan};

let mut t = RickshawMan::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if t.update(bar) == Some(1.0) { /* perfectly balanced indecision */ }
}
```

## Interpretation

1. **Maximum indecision.** The centred body and symmetric shadows are the purest
   form of "no one is in control" — momentum fully paused.
2. **Context decides.** As a non-directional flag, the prevailing trend or the
   next bar resolves the direction.
3. **Turning-point hint.** After an extended move, a rickshaw man often marks a
   stall before a reversal or a range.

## Common pitfalls

- **Reading +1.0 as bullish.** It marks detection, not direction.
- **Over-strict centring.** The body need only sit in the central 40–60 % band,
  not exactly at the midpoint.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [LongLeggedDoji](/Indicators/Indicator-LongLeggedDoji) — the parent (no centring rule).
- [Doji](/Indicators/Indicator-Doji) — the general doji detector.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
