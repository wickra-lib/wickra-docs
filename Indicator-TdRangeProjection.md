# TD Range Projection

> DeMark's projection of the next bar's high and low based on the
> current bar's open/high/low/close. The pivot is weighted by the
> relationship between close and open — different from the classic
> typical-price pivot, similar in spirit to DeMark Pivots' branching
> on bar direction.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | DeMark                                                               |
| Input type          | `Candle`                                                             |
| Output type         | `TdRangeProjectionOutput { high, low }`                              |
| Output range        | unbounded (price-units)                                              |
| Default parameters  | none — `TdRangeProjection::new()`                                    |
| Warmup period       | `1`                                                                  |
| Interpretation      | Projected high / low for the *next* bar                              |

## Formula

After each bar closes, project the next bar's high and low from a
direction-weighted pivot sum:

```
if close < open:    pivot_sum = high + 2·low  + close
if close > open:    pivot_sum = 2·high + low  + close
if close == open:   pivot_sum = high + low    + 2·close

projected_high = pivot_sum / 2 − low
projected_low  = pivot_sum / 2 − high
```

The indicator is stateless beyond the current bar — every bar
deterministically produces a projection. See
`crates/wickra-core/src/indicators/td_range_projection.rs`.

## Parameters

None — `TdRangeProjection::new()` takes no arguments.

## Inputs / Outputs

`Indicator<Input = Candle, Output = TdRangeProjectionOutput>` with
two fields (`high`, `low`).

- **Python.** Returns an `(n, 2)` `float64` array, columns
  `[high, low]`.
- **Node.** Flat `number[]` of length `n * 2`.

## Warmup

`warmup_period() == 1`. Every bar emits a projection.

## Edge cases

- **Doji bar.** Takes the `H + L + 2C` branch (equivalent to
  Woodie-style weighting).
- **Floating-point equality (`C == O`).** Uses strict equality —
  near-doji bars use the up or down branch depending on rounding.
- **Reset.** Stateless; `reset()` clears the cached last value.

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, TdRangeProjection};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Up bar: O=100, H=110, L=98, C=108
    let c = Candle::new(100.0, 110.0, 98.0, 108.0, 1.0, 0)?;
    let mut p = TdRangeProjection::new();
    let proj = p.update(c).unwrap();
    // pivot_sum = 2·110 + 98 + 108 = 426  (C > O branch)
    // projected_high = 213 − 98 = 115
    // projected_low  = 213 − 110 = 103
    println!("next high={}  next low={}", proj.high, proj.low);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

o = np.array([100.0])
h = np.array([110.0])
l = np.array([ 98.0])
c = np.array([108.0])

p = ta.TdRangeProjection()
print(p.batch(o, h, l, c))  # [projected_high, projected_low]
```

### Node

```javascript
const wickra = require('wickra');
const p = new wickra.TdRangeProjection();
console.log(p.batch([100], [110], [98], [108]));
```

### Streaming on session bars

```rust
use wickra::{Candle, Indicator, TdRangeProjection};

let mut p = TdRangeProjection::new();
for bar in session_aggregator {
    let proj = p.update(bar).unwrap();
    // Use proj.high / proj.low as next session's expected range
}
```

## Interpretation

- **Next-bar range estimate.** The projection is DeMark's expected
  high / low for the *following* bar. Useful for position-sizing
  (expected stop distances) and gap analysis (large gaps outside
  the projection signal regime change).
- **Direction-weighted pivot.** The conditional branching on
  bar direction lets the projection encode "tape sentiment" —
  an up bar projects a wider next bar to the upside, a down bar
  to the downside.
- **Trade-mechanics use.** Some intraday systems use the projected
  range as the day's "expected envelope" — trade into the
  envelope, fade outside it.

## Common pitfalls

- **Treating projection as forecast.** It's a deterministic
  algebraic transform, not a probabilistic forecast. Don't expect
  the next bar to actually print between the projected H and L.
- **Confusing with DeMark Pivots.** DeMark Pivots produce
  PP/R1/S1 levels for the next session; TD Range Projection
  produces H/L for the next bar — different scale and use.
- **Floating-point doji.** Same strict-equality issue as DeMark
  Pivots — pre-process if you want a tolerance.

## References

- Tom DeMark, *The New Science of Technical Analysis* (1994) —
  TD Range Projection definition (DeMark's "X-projection" pivot).

## See also

- [DemarkPivots](Indicator-DemarkPivots) — session-pivot cousin
  with similar branching logic.
- [ClassicPivots](Indicator-ClassicPivots) — non-conditional
  pivot.
- [Atr](Indicator-Atr) — alternative next-bar range estimate.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
