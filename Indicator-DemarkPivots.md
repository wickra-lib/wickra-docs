# DeMark Pivots

> Tom DeMark's conditional pivot formulation. The pivot is derived
> from a sum `X` that depends on whether the bar closed up, down,
> or flat — making the open carry information that other pivot
> variants discard. Only one resistance and one support are
> produced; DeMark's intent is a tighter, condition-sensitive set
> rather than a multi-tier fan.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Pivots & S/R                                                         |
| Input type          | `Candle` (uses `open`, `high`, `low`, `close`)                       |
| Output type         | `DemarkPivotsOutput { pp, r1, s1 }`                                  |
| Output range        | unbounded (price-units)                                              |
| Default parameters  | none — `DemarkPivots::new()`                                         |
| Warmup period       | `1`                                                                  |
| Interpretation      | Single resistance / support level pair; bar-direction-aware          |

## Formula

```
X = 2·H + L + C       if C  < O   (down bar)
    H + 2·L + C       if C  > O   (up bar)
    H + L + 2·C       if C == O   (doji)

PP = X / 4
R1 = X / 2 − L
S1 = X / 2 − H
```

The branching on bar direction (`C vs O`) makes DeMark Pivots
unique — every other pivot variant ignores the open. See
`crates/wickra-core/src/indicators/demark_pivots.rs`.

## Parameters

None — `DemarkPivots::new()` takes no arguments.

## Inputs / Outputs

`Indicator<Input = Candle, Output = DemarkPivotsOutput>` with three
fields (`pp, r1, s1`).

- **Python.** `DemarkPivots().batch(open, high, low, close)`
  returns an `(n, 3)` `float64` array.
- **Node.** Flat `number[]` of length `n * 3`.

## Warmup

`warmup_period() == 1`. First candle emits the first set.

## Edge cases

- **Doji (`C == O`).** Takes the `H + L + 2C` branch. Equivalent to
  the Woodie-style weighting on a single bar.
- **Up bar (`C > O`).** Doubled low — the formula assumes buyers
  were defending the low; PP shifts down relative to the typical-
  price midpoint.
- **Down bar (`C < O`).** Doubled high — assumes sellers were
  defending the high; PP shifts up.
- **Floating-point equality.** `C == O` uses strict equality;
  near-doji bars (`|C - O| < ε`) take the up or down branch
  depending on the rounding.
- **Reset.** Stateless.

## Examples

### Rust

```rust
use wickra::{Candle, DemarkPivots, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Up bar: O=100, H=120, L=80, C=110 → X = H + 2L + C = 120 + 160 + 110 = 390
    let prev = Candle::new(100.0, 120.0, 80.0, 110.0, 1.0, 0)?;
    let mut d = DemarkPivots::new();
    let l = d.update(prev).unwrap();
    // PP = 97.5, R1 = 195/2 − 80 = 17.5, S1 = 195/2 − 120 = −22.5  (raw)
    println!("PP={}  R1={}  S1={}", l.pp, l.r1, l.s1);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

# Up bar
o = np.array([100.0])
h = np.array([120.0])
l = np.array([ 80.0])
c = np.array([110.0])

d = ta.DemarkPivots()
print(d.batch(o, h, l, c))  # [pp, r1, s1]
```

### Node

```javascript
const wickra = require('wickra');
const d = new wickra.DemarkPivots();
console.log(d.batch([100], [120], [80], [110]));
```

### Streaming on session bars

```rust
use wickra::{Candle, DemarkPivots, Indicator};

let mut d = DemarkPivots::new();
for bar in session_aggregator {
    let levels = d.update(bar).unwrap();
    // Use levels.r1 / levels.s1 as the only S/R for the next session
}
```

## Interpretation

- **Sentiment-aware pivot.** The branching on bar direction
  encodes the previous session's "tape sentiment". Up bars suggest
  buyers were active near the low; the next-session pivot tilts
  down toward where buyers will defend. Down bars do the opposite.
- **Tighter R1/S1.** Compared to Classic Pivots, DeMark's R1/S1
  are typically tighter (closer to PP) because the formula uses
  `X / 2` rather than the full-range `2·PP − L`.
- **One-tier only.** DeMark deliberately stops at R1/S1. Multi-tier
  variants (Classic R2/R3) are not part of DeMark's methodology.

## Common pitfalls

- **Forgetting the open.** All other pivot variants ignore the
  open. If you copy DeMark levels into Classic Pivots logic, you
  get different (and incorrect-for-DeMark) numbers.
- **Floating-point doji.** Strict `C == O` rarely holds in real
  data. If you want to treat near-doji as doji, pre-process the
  candle by snapping close to open within a tolerance.
- **Comparing to Classic / Fibonacci R3.** DeMark Pivots have no
  R2/R3. Don't try to extrapolate beyond R1/S1 with the same
  formula.

## References

- Tom DeMark, *The New Science of Technical Analysis* (1994) —
  original DeMark Pivot formulation and the broader DeMark
  methodology this fits into.

## See also

- [ClassicPivots](Indicator-ClassicPivots) — non-conditional
  variant.
- [FibonacciPivots](Indicator-FibonacciPivots) — Fib-ratio variant.
- [Camarilla](Indicator-Camarilla) — close-anchored four-tier
  variant.
- [WoodiePivots](Indicator-WoodiePivots) — close-weighted variant.
- [TdSetup](Indicator-TdSetup) / [TdSequential](Indicator-TdSequential)
  — DeMark's main oscillator system.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
