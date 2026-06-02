# IdenticalThreeCrows

> Three-bar bearish reversal: three consecutive black candles with
> steadily lower closes where each opens at (or very near) the prior
> candle's close, so the bodies stack in an identical staircase down.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `-1.0` bearish, `0.0` otherwise (never `+1.0`) |
| Output range | `{-1.0, 0.0}` |
| Default parameters | `tolerance = 0.001` (10 bps); bindings use the default |
| Warmup period | `3` (first two bars always `0.0`) |
| Interpretation | Strong, orderly bearish continuation/reversal down |

## Formula

```
tol_n = tolerance · max(|open|, |prev.close|)
all three red:        close < open
declining closes:     bar2.close < bar1.close,  bar3.close < bar2.close
bar2 opens at bar1's close:  |bar2.open − bar1.close| <= tol_2
bar3 opens at bar2's close:  |bar3.open − bar2.close| <= tol_3
```

Bearish-only (never `+1.0`). Each candle opening exactly where the previous one
closed — no gap, no overlap — is the "identical" staircase that distinguishes
this from ordinary [ThreeSoldiersOrCrows](Indicator-ThreeSoldiersOrCrows). See
`crates/wickra-core/src/indicators/identical_three_crows.rs`.

## Parameters

| Name | Type | Default | Valid range | Source |
|------|------|---------|-------------|--------|
| `tolerance` | `f64` | `0.001` | `[0.0, 1.0)` | `IdenticalThreeCrows::with_tolerance` (`identical_three_crows.rs`) |

`with_tolerance` outside `[0, 1)` errors; pinned by `rejects_invalid_tolerance`
and `accepts_valid_tolerance`. The Python (`ta.IdenticalThreeCrows()`) and Node
(`new ta.IdenticalThreeCrows()`) constructors use the default tolerance.

## Signed ±1 encoding

Single-direction shape: `−1.0` bearish, `0.0` no pattern — one feature-matrix
dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, IdenticalThreeCrows, Candle};
// IdenticalThreeCrows: Input = Candle, Output = f64
const _: fn(&mut IdenticalThreeCrows, Candle) -> Option<f64> = <IdenticalThreeCrows as Indicator>::update;
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

- **Opens must match prior closes.** A gap or overlap beyond `tolerance` yields
  `0.0` (`non_identical_opens_yield_zero`).
- **Closes must keep falling.** Any non-declining close yields `0.0`
  (`rising_close_yields_zero`).
- **Reset.** `reset()` clears the two-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, IdenticalThreeCrows, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = IdenticalThreeCrows::new();
    println!("{:?}", t.update(Candle::new(13.0, 13.1, 11.9, 12.0, 1.0, 0)?));
    println!("{:?}", t.update(Candle::new(12.0, 12.1, 10.9, 11.0, 1.0, 1)?));
    println!("{:?}", t.update(Candle::new(11.0, 11.1, 9.9, 10.0, 1.0, 2)?));
    Ok(())
}
```

Output:

```
Some(0.0)
Some(0.0)
Some(-1.0)
```

Each candle opens at the previous close (`12 → 12`, `11 → 11`) and closes one
unit lower — an identical-three-crows staircase. This matches
`identical_three_crows_is_minus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([13.0, 12.0, 11.0])
h = np.array([13.1, 12.1, 11.1])
l = np.array([11.9, 10.9, 9.9])
c = np.array([12.0, 11.0, 10.0])

print(ta.IdenticalThreeCrows().batch(o, h, l, c))  # [ 0.  0. -1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.IdenticalThreeCrows();
t.update(13, 13.1, 11.9, 12);
t.update(12, 12.1, 10.9, 11);
console.log(t.update(11, 11.1, 9.9, 10)); // -1
```

### Streaming

```rust
use wickra::{Candle, Indicator, IdenticalThreeCrows};

let mut t = IdenticalThreeCrows::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if t.update(bar) == Some(-1.0) { /* orderly, persistent selling */ }
}
```

## Interpretation

1. **Orderly distribution.** Identical opens with falling closes show steady,
   unhurried selling — often a more reliable bearish read than the gappy
   ordinary three crows.
2. **Continuation or reversal.** At a top it reverses; mid-decline it confirms
   continuation. Read the location.
3. **Confirm.** Persistent staircases can become oversold quickly; manage entries
   with a momentum filter.

## Common pitfalls

- **Expecting tick-perfect opens.** The match is within `tolerance` (10 bps by
  default), not exact.
- **Confusing with Three Crows.** The "identical" constraint (open == prior
  close) is what sets this apart.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [ThreeSoldiersOrCrows](Indicator-ThreeSoldiersOrCrows) — the general
  three-crows / three-soldiers pattern.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
