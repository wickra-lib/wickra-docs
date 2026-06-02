# GapSideBySideWhite

> Three-bar continuation. After a gap away from the first bar, two white
> candles of similar size open at roughly the same level (side by side)
> and hold the gap open, signalling the trend resumes in the gap
> direction.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` gap up, `-1.0` gap down, `0.0` otherwise |
| Output range | `{-1.0, 0.0, +1.0}` |
| Default parameters | none — `GapSideBySideWhite::new()` |
| Warmup period | `3` (first two bars always `0.0`) |
| Interpretation | Trend continuation in the gap direction |

## Formula

```
bar2, bar3 both white
bar2 body gaps away from bar1 body (up or down)
bar3 opens beside bar2:   |open3 − open2| <= 0.1 · range2
bar3 body similar in size to bar2 (neither more than twice the other)
gap up   -> +1.0   (bullish continuation)
gap down -> -1.0   (bearish "downside gap side-by-side white")
```

The sign follows the gap direction, not the (always-white) candle colour. See
`crates/wickra-core/src/indicators/gap_side_by_side_white.rs`.

## Parameters

None. Constructed with `GapSideBySideWhite::new()`.

## Signed ±1 encoding

Emits the uniform candlestick sign convention — `+1.0` (gap-up continuation),
`−1.0` (gap-down continuation), `0.0` no pattern — a single feature-matrix
dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, GapSideBySideWhite, Candle};
// GapSideBySideWhite: Input = Candle, Output = f64
const _: fn(&mut GapSideBySideWhite, Candle) -> Option<f64> = <GapSideBySideWhite as Indicator>::update;
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

- **Both followers must be white.** A black second/third bar yields `0.0`
  (`second_bar_black_yields_zero`).
- **Must be side by side.** Opens too far apart, or mismatched body sizes, yield
  `0.0` (`not_side_by_side_yields_zero`).
- **Gap required.** No gap from the first bar → `0.0` (`no_gap_yields_zero`).
- **Reset.** `reset()` clears the two-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, GapSideBySideWhite, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = GapSideBySideWhite::new();
    println!("{:?}", t.update(Candle::new(10.0, 11.1, 9.9, 11.0, 1.0, 0)?)); // white
    println!("{:?}", t.update(Candle::new(13.0, 14.1, 12.9, 14.0, 1.0, 1)?)); // white, gaps up
    println!("{:?}", t.update(Candle::new(13.0, 14.1, 12.9, 14.0, 1.0, 2)?)); // white, beside it
    Ok(())
}
```

Output:

```
Some(0.0)
Some(0.0)
Some(1.0)
```

Bars 2 and 3 are equal white candles opening at `13.0`, gapped above bar1 — an
upside gap side-by-side white. This matches `gap_up_is_plus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([10.0, 13.0, 13.0])
h = np.array([11.1, 14.1, 14.1])
l = np.array([9.9,  12.9, 12.9])
c = np.array([11.0, 14.0, 14.0])

print(ta.GapSideBySideWhite().batch(o, h, l, c))  # [0. 0. 1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.GapSideBySideWhite();
t.update(10, 11.1, 9.9, 11);
t.update(13, 14.1, 12.9, 14);
console.log(t.update(13, 14.1, 12.9, 14)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, GapSideBySideWhite};

let mut t = GapSideBySideWhite::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    match t.update(bar) {
        Some(1.0)  => { /* upside gap holds — uptrend continuation */ }
        Some(-1.0) => { /* downside gap holds — downtrend continuation */ }
        _ => {}
    }
}
```

## Interpretation

1. **Gap defence = continuation.** Two equal white candles holding the gap show
   the trend resuming rather than reversing.
2. **Direction from the gap.** A gap-down side-by-side *white* pair is still
   bearish continuation — the white colour is incidental; the gap direction
   carries the signal.
3. **Confirm the trend.** Use within an established trend.

## Common pitfalls

- **Reading the white colour as bullish.** On a downside gap the pattern is
  bearish; trust the gap, not the candle colour.
- **Loose "side by side".** The two opens must be close *and* the bodies similar
  in size.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [TasukiGap](Indicator-TasukiGap) — gap continuation with a counter candle.
- [UpsideGapThreeMethods](Indicator-UpsideGapThreeMethods) — gap continuation
  that partly fills.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
