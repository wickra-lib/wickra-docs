# Woodie Pivots

> Tom Williams' close-weighted pivot variant. The double-weighted
> close shifts the pivot toward where most of the session's activity
> actually settled — useful in trending markets where the close is
> more meaningful than the typical-price midpoint. Two resistances
> and two supports (vs Classic's three).

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Pivots & S/R                                                         |
| Input type          | `Candle`                                                             |
| Output type         | `WoodiePivotsOutput { pp, r1, r2, s1, s2 }`                          |
| Output range        | unbounded (price-units)                                              |
| Default parameters  | none — `WoodiePivots::new()`                                         |
| Warmup period       | `1`                                                                  |
| Interpretation      | Close-weighted reference levels for the next session                 |

## Formula

```
PP = (H + L + 2·C) / 4

R1 = 2·PP − L        S1 = 2·PP − H
R2 = PP + (H − L)    S2 = PP − (H − L)
```

R1/S1 use the same `2·PP − L / H` formula as Classic; R2/S2 use the
same range-width extension. The difference from Classic is purely
in the pivot itself. See
`crates/wickra-core/src/indicators/woodie_pivots.rs`.

## Parameters

None — `WoodiePivots::new()` takes no arguments.

## Inputs / Outputs

`Indicator<Input = Candle, Output = WoodiePivotsOutput>` with five
fields (`pp, r1, r2, s1, s2`).

- **Python.** `WoodiePivots().batch(high, low, close)` returns an
  `(n, 5)` `float64` array.
- **Node.** Flat `number[]` of length `n * 5`.

## Warmup

`warmup_period() == 1`. First candle emits the first set.

## Edge cases

- **`H == L`.** All R/S collapse to PP.
- **Strong closes near the high.** The doubled-weight close pulls
  PP up, lifting R1/R2 and S1/S2 in tandem. Compared to Classic
  Pivots on the same bar, Woodie levels are biased toward the
  close.
- **Reset.** Stateless.

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, WoodiePivots};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prev = Candle::new(100.0, 110.0, 90.0, 108.0, 1.0, 0)?;
    let mut w = WoodiePivots::new();
    let l = w.update(prev).unwrap();
    // PP = (110 + 90 + 2·108) / 4 = 416/4 = 104
    // R1 = 2·104 − 90 = 118
    // S1 = 2·104 − 110 = 98
    println!("PP={}  R1={}  S1={}", l.pp, l.r1, l.s1);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

high  = np.array([110.0])
low   = np.array([ 90.0])
close = np.array([108.0])  # close near the high

w = ta.WoodiePivots()
out = w.batch(high, low, close)
print(out[0])  # pp, r1, r2, s1, s2
```

### Node

```javascript
const wickra = require('wickra');
const w = new wickra.WoodiePivots();
console.log(w.batch([110], [90], [108]));
```

### Streaming on session bars

```rust
use wickra::{Candle, Indicator, WoodiePivots};

let mut w = WoodiePivots::new();
let session_aggregator: Vec<wickra::Candle> = Vec::new(); // your stream of completed session bars
for bar in session_aggregator {
    let levels = w.update(bar).unwrap();
}
```

## Interpretation

- **Trending-day bias.** Compared to Classic Pivots, Woodie's
  levels shift in the direction of the previous close. A strong
  bullish close raises the next session's pivot and resistances,
  reflecting market memory of where buyers ended the day.
- **R1 / S1 reactions.** Same `2·PP − L / H` formula as Classic, so
  R1 / S1 react at similar widths but at the shifted pivot.
- **Two-tier vs three-tier.** Woodie deliberately stops at R2/S2 —
  Williams felt R3/S3-style extensions added more noise than
  signal. If you want R3/S3, use Classic or Fibonacci.

## Common pitfalls

- **Treating Woodie pivot as Classic with adjusted close.** The PP
  formula is genuinely different — `(H + L + 2C) / 4` instead of
  `(H + L + C) / 3`. Don't try to map it.
- **Indecisive doji bar.** When close ≈ midpoint of high/low,
  Woodie and Classic produce nearly identical levels — the
  doubled-close weighting only matters on directional bars.
- **Session aggregation.** Same as all pivots — feed
  session-aggregated bars only.

## References

- Tom Williams (the *Volume Spread Analysis* author of the same
  name) popularised the close-weighted pivot variant in the late
  1990s. The formulation circulated through trading forums before
  being formally documented in commercial charting packages.

## See also

- [ClassicPivots](/Indicators/Indicator-ClassicPivots) — non-weighted variant.
- [FibonacciPivots](/Indicators/Indicator-FibonacciPivots) — Fib-spaced
  alternative.
- [Camarilla](/Indicators/Indicator-Camarilla) — close-anchored four-tier
  alternative.
- [DemarkPivots](/Indicators/Indicator-DemarkPivots) — conditional open-aware
  variant.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
