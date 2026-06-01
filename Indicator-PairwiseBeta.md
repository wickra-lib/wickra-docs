# PairwiseBeta

> Rolling OLS slope of one asset's **log-returns** on another's. Unlike
> [Beta](Indicator-Beta), which regresses the raw inputs it is fed,
> PairwiseBeta differences prices into log-returns internally — the
> conventional way to measure cross-asset beta, where a beta on price
> levels would be dominated by the shared trend.

## Quick reference

| Item                | Value                                                   |
|---------------------|---------------------------------------------------------|
| Family              | Price Statistics                                        |
| Input type          | `(f64, f64)` — `(a, b)` price pair                       |
| Output type         | `f64`                                                   |
| Output range        | unbounded                                               |
| Default parameters  | `period = 20` (`>= 2`)                                  |
| Warmup period       | `period + 1`                                            |
| Interpretation      | Cross-asset return sensitivity                          |

## Formula

```
rₐ = ln(aₜ / aₜ₋₁)          (log-returns, computed internally)
r_b = ln(bₜ / bₜ₋₁)
Beta = cov(rₐ, r_b) / var(r_b)   over the trailing `period` returns
```

Population formulas. Each `update` is O(1) via four running sums.
See `crates/wickra-core/src/indicators/pairwise_beta.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | `20`    | `>= 2`     | Rolling window of return pairs. |

## Inputs / Outputs

`Indicator<Input = (f64, f64), Output = f64>`. Feed **raw prices** `(a, b)`;
the indicator forms the log-returns for you. Python:
`PairwiseBeta(period).batch(a, b)` returns a 1-D `np.ndarray` with `NaN`
warmup. Node and WASM expose the same `update(a, b)` / `batch(a, b)` shape.

## Warmup

`warmup_period() == period + 1` — one prior price to seed the first return,
then `period` returns to fill the window.

## Edge cases

- **Flat benchmark returns.** `var(r_b) = 0`; the indicator returns `0.0`
  rather than NaN.
- **Bad tick.** A non-positive or non-finite price breaks the return chain:
  that sample is dropped and the next valid price re-seeds the reference.
- **Reset.** Clears the previous-price reference and all running sums.

## Examples

### Rust

```rust
use wickra::{Indicator, PairwiseBeta};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut b = PairwiseBeta::new(20)?;
    for i in 0..60 {
        let bench = 100.0 + 10.0 * (f64::from(i) * 0.5).sin();
        let asset = bench * bench; // log-returns are exactly 2× ⇒ beta 2
        let _ = b.update((asset, bench));
    }
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

b = 100.0 + 10.0 * np.sin(np.arange(60) * 0.5)
a = b ** 2                      # a's log-returns are exactly twice b's
print(ta.PairwiseBeta(20).batch(a, b)[-1])  # ~2.0
```

### Node

```javascript
const wickra = require('wickra');
const pb = new wickra.PairwiseBeta(20);
// feed prices (a, b): pb.update(a, b)
```

## Interpretation

- **Beta > 1.** `a`'s returns amplify `b`'s — a higher-volatility leg.
- **Beta ≈ 1.** The two move one-for-one in return space.
- **Beta < 0.** Inverse return relationship — the basis for a hedge.

## Common pitfalls

- **Levels vs returns.** Use [Beta](Indicator-Beta) if you have already
  differenced your inputs into returns; use PairwiseBeta to pass raw prices
  and have returns computed for you.
- **Period choice.** Short windows are noisy; long windows hide regime
  shifts.

## See also

- [Beta](Indicator-Beta) — same OLS slope on the raw inputs you feed it.
- [PairSpreadZScore](Indicator-PairSpreadZScore) — the spread between two
  cointegrated legs.
- [PearsonCorrelation](Indicator-PearsonCorrelation) — unit-free cousin.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
