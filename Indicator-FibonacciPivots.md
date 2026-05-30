# Fibonacci Pivots

> The classic central pivot `(H + L + C) / 3` with three resistances
> and three supports spaced at the Fibonacci ratios `0.382`,
> `0.618`, and `1.000` of the previous bar's range. Used by traders
> who treat the Fibonacci ratios as natural reaction levels.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Pivots & S/R                                                         |
| Input type          | `Candle` (uses `high`, `low`, `close`)                               |
| Output type         | `FibonacciPivotsOutput { pp, r1, r2, r3, s1, s2, s3 }`               |
| Output range        | unbounded (price-units)                                              |
| Default parameters  | none — `FibonacciPivots::new()`                                      |
| Warmup period       | `1`                                                                  |
| Interpretation      | Fib-spaced reaction levels for the next session                      |

## Formula

```
PP = (H + L + C) / 3
R  = H − L

R1 = PP + 0.382·R     S1 = PP − 0.382·R
R2 = PP + 0.618·R     S2 = PP − 0.618·R
R3 = PP + 1.000·R     S3 = PP − 1.000·R
```

R3/S3 sit exactly one full range above / below the pivot. See
`crates/wickra-core/src/indicators/fibonacci_pivots.rs`.

## Parameters

None — `FibonacciPivots::new()` takes no arguments.

## Inputs / Outputs

Same shape as [ClassicPivots](Indicator-ClassicPivots):
`Indicator<Input = Candle, Output = FibonacciPivotsOutput>` with
fields `pp, r1, r2, r3, s1, s2, s3`.

- **Python.** `(n, 7)` array, columns
  `[pp, r1, r2, r3, s1, s2, s3]`.
- **Node.** Flat `number[]` of length `n * 7`.

## Warmup

`warmup_period() == 1`. The first candle produces the first set.

## Edge cases

- **`H == L`.** All levels collapse to `PP`.
- **Same session-aggregation caveat as Classic Pivots.** Feed
  pre-aggregated session bars, not minute bars.
- **Reset.** Stateless.

## Examples

### Rust

```rust
use wickra::{Candle, FibonacciPivots, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prev = Candle::new(100.0, 110.0, 90.0, 105.0, 1.0, 0)?;
    let mut fp = FibonacciPivots::new();
    let l = fp.update(prev).unwrap();
    // PP = 101.667, range = 20
    // R1 = 101.667 + 0.382·20 = 109.31
    println!("R1 = {:.3}  R3 = {:.3}", l.r1, l.r3);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

high  = np.array([110.0])
low   = np.array([ 90.0])
close = np.array([105.0])

fp = ta.FibonacciPivots()
print(fp.batch(high, low, close))
```

### Node

```javascript
const wickra = require('wickra');
const fp = new wickra.FibonacciPivots();
console.log(fp.batch([110], [90], [105]));
```

### Streaming on session bars

```rust
use wickra::{Candle, FibonacciPivots, Indicator};

let mut fp = FibonacciPivots::new();
for session_bar in session_aggregator {
    let levels = fp.update(session_bar).unwrap();
}
```

## Interpretation

- **Fib-spaced reactions.** Many traders see `0.382` and `0.618`
  retracements as natural reaction points; Fibonacci Pivots use
  these ratios on the prior range to anticipate the next session's
  reaction levels.
- **R3 = full range.** A `1.000` extension above the pivot is the
  "one-full-range" trend-day target — common to all session pivot
  systems but explicit here.
- **Vs Classic Pivots.** Different spacing — Fibonacci Pivots are
  tighter near the pivot (R1 at 0.382·R vs Classic's `2·PP − L` ≈
  `PP + 0.5·R` on a roughly symmetric bar) and the same wide at R3.

## Common pitfalls

- **Treating Fib as causation.** The `0.382 / 0.618` levels are a
  convention, not a market law. Use as reference, not as
  prediction.
- **Mixing pivot systems.** Trading "Fib R1 to Classic R2" mixes
  numbers from two different formulas; pick one system per chart.
- **Session aggregation.** Same as all pivot variants — feed
  session-aggregated bars only.

## References

- The Fibonacci pivot formulation is a practitioner extension of
  the classic floor-trader pivots, popularised in retail charting
  software in the late 1990s.

## See also

- [ClassicPivots](Indicator-ClassicPivots) — non-Fib alternative.
- [Camarilla](Indicator-Camarilla) — close-anchored variant.
- [WoodiePivots](Indicator-WoodiePivots) — close-weighted pivot.
- [DemarkPivots](Indicator-DemarkPivots) — conditional one-tier
  variant.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
