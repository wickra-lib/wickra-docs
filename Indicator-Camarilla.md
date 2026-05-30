# Camarilla Pivots

> Nick Stott's four-tier range-based level set. Anchored on the
> *prior close* rather than the typical price, with widths scaled by
> the constant `1.1` divided by `{12, 6, 4, 2}`. R3 / S3 are
> typically used as reversal levels; R4 / S4 as breakout levels —
> the four-tier structure makes Camarilla particularly suited to
> intraday mean-reversion vs breakout decisions.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Pivots & S/R                                                         |
| Input type          | `Candle`                                                             |
| Output type         | `CamarillaPivotsOutput { pp, r1..r4, s1..s4 }`                       |
| Output range        | unbounded (price-units)                                              |
| Default parameters  | none — `Camarilla::new()`                                            |
| Warmup period       | `1`                                                                  |
| Interpretation      | R3/S3 = reversal; R4/S4 = breakout                                   |

## Formula

```
PP = (H + L + C) / 3        // informational; not used in R/S formulas
R  = H − L

R1 = C + R · 1.1 / 12       S1 = C − R · 1.1 / 12
R2 = C + R · 1.1 / 6        S2 = C − R · 1.1 / 6
R3 = C + R · 1.1 / 4        S3 = C − R · 1.1 / 4
R4 = C + R · 1.1 / 2        S4 = C − R · 1.1 / 2
```

All four tiers are anchored on the close, not the pivot — distinguishing
Camarilla from Classic / Fibonacci variants. See
`crates/wickra-core/src/indicators/camarilla_pivots.rs`.

## Parameters

None — `Camarilla::new()` takes no arguments.

## Inputs / Outputs

`Indicator<Input = Candle, Output = CamarillaPivotsOutput>` with
nine fields (`pp, r1..r4, s1..s4`).

- **Python.** `Camarilla().batch(high, low, close)` returns an
  `(n, 9)` `float64` array.
- **Node.** Flat `number[]` of length `n * 9`.

## Warmup

`warmup_period() == 1`. First candle emits the first set.

## Edge cases

- **`H == L`.** All R/S collapse to the close.
- **Same session-aggregation caveat as other pivots.**
- **Reset.** Stateless.

## Examples

### Rust

```rust
use wickra::{Camarilla, Candle, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prev = Candle::new(100.0, 110.0, 90.0, 105.0, 1.0, 0)?;
    let mut c = Camarilla::new();
    let l = c.update(prev).unwrap();
    // R = 20, C = 105
    // R3 = 105 + 20·1.1/4 = 110.5
    // R4 = 105 + 20·1.1/2 = 116.0
    println!("R3 = {:.3}  R4 = {:.3}", l.r3, l.r4);
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

c = ta.Camarilla()
out = c.batch(high, low, close)
# columns: pp, r1, r2, r3, r4, s1, s2, s3, s4
print(out[0])
```

### Node

```javascript
const wickra = require('wickra');
const c = new wickra.Camarilla();
console.log(c.batch([110], [90], [105]));
```

### Streaming on session bars

```rust
use wickra::{Camarilla, Candle, Indicator};

let mut c = Camarilla::new();
for bar in session_aggregator {
    let l = c.update(bar).unwrap();
    // Stott's standard rules:
    //   Long below S3 → target S2 / R3
    //   Short above R3 → target R2 / S3
    //   Breakout: long > R4, short < S4
}
```

## Interpretation

The Camarilla **canonical strategy** (Stott):

- **Open between S3 and R3.** Treat the levels as a fade range —
  short on touches of R3 (target R2 / pivot), long on touches of
  S3 (target S2 / pivot).
- **Open above R4 or below S4.** Treat as a breakout — long above
  R4 (target high of range), short below S4.
- **Open between R3 and R4** (rarely): expect either re-entry
  back below R3 or a continuation to R4. Wait for direction.

The asymmetric tier widths (`/12, /6, /4, /2`) cluster R1/R2 close
together, making R3 a strong "boundary" zone rather than a single
level.

## Common pitfalls

- **Forgetting the close-anchoring.** Camarilla pivots come from
  the prior close, not the prior pivot. The `pp` field is included
  for charting but not used in any R/S formula.
- **Trading R1/R2 as actionable.** They're typically just
  intra-range noise zones — Stott's strategy uses R3/R4 only.
- **Wrong session window.** Same as all pivots — use RTH only for
  US equities unless your strategy explicitly accounts for
  extended hours.

## References

- Nick Stott popularised Camarilla pivots in the late 1990s
  through his published S&P futures system. No formal academic
  reference — Camarilla circulated via trading forums and
  educational sites before being widely catalogued.

## See also

- [ClassicPivots](Indicator-ClassicPivots) — standard floor-trader
  variant.
- [FibonacciPivots](Indicator-FibonacciPivots) — Fib-ratio variant.
- [WoodiePivots](Indicator-WoodiePivots) — close-weighted pivot.
- [DemarkPivots](Indicator-DemarkPivots) — open-conditional
  variant.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
