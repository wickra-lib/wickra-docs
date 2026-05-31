# FAMA (Following Adaptive Moving Average)

> Scalar wrapper that exposes only the FAMA line from
> [Mama](Indicator-Mama). FAMA is MAMA's lagging companion in
> Ehlers' MESA construction — it uses half MAMA's adaptive alpha,
> so it reacts later than MAMA. MAMA crossing above FAMA marks a
> trend confirmation; MAMA below FAMA a reversal. This wrapper is
> useful when you want a single scalar smoother and don't need both
> MAMA and FAMA paired in one `MamaOutput`.

## Quick reference

| Item                | Value                                                                  |
|---------------------|------------------------------------------------------------------------|
| Family              | Ehlers / Cycle (DSP)                                                   |
| Input type          | `f64`                                                                  |
| Output type         | `f64` (the FAMA scalar)                                                |
| Output range        | unbounded (price-units)                                                |
| Default parameters  | `fast_limit = 0.5`, `slow_limit = 0.05` (`Fama::classic()`)            |
| Warmup period       | Inherited from [Mama](Indicator-Mama) — ~30 bars                       |
| Interpretation      | Slower of the MAMA/FAMA pair; trend-confirmation line                  |

## Formula

```
(mama_t, fama_t) = Mama(x).update(x)
return fama_t
```

The internal `Mama` does all the work — `Fama` just discards the
`mama` field of the output. See
`crates/wickra-core/src/indicators/fama.rs`.

FAMA's recurrence inside `Mama`:

```
FAMA_t = 0.5 * alpha_t * MAMA_t + (1 - 0.5 * alpha_t) * FAMA_{t-1}
```

Half-alpha vs MAMA → roughly twice the lag.

## Parameters

| Name         | Type  | Default | Constraint                    | Description |
|--------------|-------|---------|-------------------------------|-------------|
| `fast_limit` | `f64` | `0.5`   | finite, `0 < slow < fast ≤ 1` | Upper bound on adaptive alpha (forwarded to `Mama`). |
| `slow_limit` | `f64` | `0.05`  | finite, `0 < slow < fast`     | Lower bound on adaptive alpha (forwarded to `Mama`). |

Forwards `Mama::new`'s validation errors. `Fama::classic()` returns
the canonical `(0.5, 0.05)` factory.

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Python: `FAMA(fast, slow).batch(prices)`
returns a 1-D `np.ndarray` with `NaN` in the warmup prefix. Node:
same shape; `update(value)` returns `number | null`.

## Warmup

Same as [Mama](Indicator-Mama) — the Hilbert chain needs ~30 bars
to fill before adaptive alpha kicks in. `warmup_period()` delegates
to the inner `Mama`.

## Edge cases

- **Constant input.** FAMA converges to the constant.
- **Reset.** `reset()` clears the inner `Mama` state and `last_value`.
- **Identity with MAMA's `fama` field.** `Fama::update(x)` is
  *exactly* `Mama::update(x)?.fama`. There is no recomputation
  hidden inside the wrapper.

## Examples

### Rust

```rust
use wickra::{BatchExt, Fama, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prices: Vec<f64> = (0..200)
        .map(|i| 100.0 + (f64::from(i) * 0.2).sin() * 5.0)
        .collect();
    let mut f = Fama::classic();
    let out = f.batch(&prices);
    println!("row 100 FAMA = {:?}", out[100]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

prices = 100 + np.sin(np.linspace(0, 30, 200)) * 5
fama = ta.FAMA(0.5, 0.05)
out = fama.batch(prices)
print('row 100:', out[100])
```

### Node

```javascript
const wickra = require('wickra');

const fama = new wickra.FAMA(0.5, 0.05);
const prices = Array.from({ length: 200 },
  (_, i) => 100 + Math.sin(i * 0.2) * 5);
console.log('row 100:', fama.batch(prices)[100]);
```

### Streaming

```rust
use wickra::{Fama, Indicator};

let mut fama = Fama::classic();
let price_stream: Vec<f64> = Vec::new(); // your live price feed
for px in price_stream {
    if let Some(v) = fama.update(px) {
        // FAMA as a slow trend reference line
    }
}
```

## Interpretation

- **Slow line of the MAMA/FAMA pair.** Use FAMA when you need a
  single smoothed reference and the MAMA line itself isn't required.
  E.g. `price > FAMA` as a coarse bull-trend filter.
- **Confirmation, not signal.** Trend confirmation systems use the
  *crossing* of MAMA over FAMA — but for that you want the paired
  `MamaOutput` from [Mama](Indicator-Mama) directly, not this
  wrapper.
- **Adaptive lag.** FAMA's lag is variable: faster in trends,
  slower in cycles. The half-alpha vs MAMA ratio holds, so the
  *relative* lag is constant even as the absolute lag varies.

## Common pitfalls

- **Using FAMA alone for crossover signals.** A crossover needs two
  lines. `Fama` is one — pair it with `price`, `Sma`, or `Ema`, or
  use `Mama` directly.
- **Expecting a fixed period.** There is no "period" parameter;
  FAMA's effective period varies with the underlying phase
  adaptation.
- **Mismatched parameters with paired MAMA.** If you instantiate
  both `Mama` and `Fama` independently, ensure the `(fast_limit,
  slow_limit)` tuples match — otherwise the two lines won't be
  comparable.

## References

- John F. Ehlers, *Cycle Analytics for Traders*, Wiley (2013),
  ch. 8 — derives the MAMA/FAMA pair.

## See also

- [Mama](Indicator-Mama) — the parent indicator that emits both
  lines together.
- [HilbertDominantCycle](Indicator-HilbertDominantCycle) —
  underlying phase-extraction engine.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
