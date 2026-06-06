# OuHalfLife

> The Ornstein–Uhlenbeck half-life of mean reversion for the spread `a − b` —
> how many bars a deviation takes to decay by half.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Statistics |
| Input type | `(f64, f64)` (a pair of prices `a`, `b`) |
| Output type | `f64` (bars) |
| Output range | `>= 0`; `0` means "no finite half-life" (not mean-reverting) |
| Default parameters | `period` is required (`>= 3`) |
| Warmup period | `period` |
| Interpretation | Small half-life → fast reversion (short holding period); large → slow; `0` → random walk / trend. |

## Formula

Each `update` forms the spread `sₜ = aₜ − bₜ` and fits the discrete
Ornstein–Uhlenbeck (mean-reverting AR(1)) model over the trailing window by
ordinary least squares of the change on the level:

```
Δsₜ      = λ · sₜ₋₁ + c + εₜ
half_life = −ln(2) / λ        (only when λ < 0)
```

`λ` is the speed of mean reversion: a more negative `λ` pulls the spread back to
its mean faster. The half-life is the single most useful number for sizing a
pairs trade's holding period and look-back window. When the spread is not
mean-reverting (`λ ≥ 0`, a random walk or trend) or the regression is degenerate
(a flat spread), the indicator returns `0`. It is the complement of
[SpreadAr1Coefficient](/Indicators/Indicator-SpreadAr1Coefficient): the half-life is
`−ln(2) / ln(ρ)` for `0 < ρ < 1`.

Source: `crates/wickra-core/src/indicators/ou_half_life.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= 3`      | `ou_half_life.rs:59` | Look-back window of spreads. `< 3` errors with `Error::InvalidPeriod`. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/ou_half_life.rs`:

```rust
use wickra::{Indicator, OuHalfLife};
// OuHalfLife: Input = (f64, f64), Output = f64
const _: fn(&mut OuHalfLife, (f64, f64)) -> Option<f64> =
    <OuHalfLife as Indicator>::update;
```

Python streams as `update(a, b) -> float | None` and batches over two
equal-length arrays. Node streams as `update(a, b)` and batches over `a[]`,
`b[]`.

## Warmup

`warmup_period() == period`. The unit test `accessors_and_metadata` pins
`warmup_period() == 30` for `period = 30`; `warmup_returns_none` pins the first
`Some` at the `period`-th pair.

## Edge cases

- **Not mean-reverting.** A random-walk or trending spread has `λ ≥ 0`, so the
  half-life is reported as `0`; pinned by the module's regression-degenerate
  handling.
- **Mean reversion.** A reverting spread has `λ < 0` and a positive, finite
  half-life; pinned by `mean_reverting_spread_has_positive_half_life`.
- **Flat spread.** A constant spread has zero level variance, so the slope is
  undefined and the output is `0`.
- **Reset.** `reset()` clears the spread window.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, OuHalfLife};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut hl = OuHalfLife::new(20)?;
    // Mean-reverting spread: a oscillates around b.
    let pairs: Vec<(f64, f64)> = (0..60)
        .map(|t| (100.0 + 2.0 * (f64::from(t) * 0.5).sin(), 100.0))
        .collect();
    let last = hl.batch(&pairs).into_iter().flatten().last().unwrap();
    println!("{last:.6}");
    Ok(())
}
```

Output:

```
7.127658
```

### Python

```python
import numpy as np
import wickra as ta

t = np.arange(60)
a = 100.0 + 2.0 * np.sin(t * 0.5)
b = np.full(60, 100.0)
print(round(ta.OuHalfLife(20).batch(a, b)[-1], 6))
```

Output:

```
7.127658
```

### Node

```javascript
const ta = require('wickra');
const a = Array.from({ length: 60 }, (_, t) => 100 + 2 * Math.sin(t * 0.5));
const b = Array.from({ length: 60 }, () => 100);
console.log(new ta.OuHalfLife(20).batch(a, b).at(-1).toFixed(6));
```

Output:

```
7.127658
```

## Interpretation

The half-life sets the natural time scale of a pairs trade. A spread with a
half-life of ~7 bars reverts quickly: entries can be tighter and the holding
period short. A half-life of hundreds of bars means reversion is slow and the
edge is thin — capital is tied up too long. A reported `0` is a hard stop: the
spread is not reverting, so a mean-reversion strategy has no statistical basis.
Pair it with [SpreadAr1Coefficient](/Indicators/Indicator-SpreadAr1Coefficient) (reversion
strength) and [PairSpreadZScore](/Indicators/Indicator-PairSpreadZScore) (entry timing).

## Common pitfalls

- **`0` is a sentinel, not a fast half-life.** Zero means "no finite half-life"
  (random walk, trend, or flat), the opposite of a quick reversion. Always check
  for `0` before sizing on it.
- **Window length vs. half-life.** A `period` much shorter than the true
  half-life cannot observe a full reversion cycle and biases the estimate. Pick
  a window several multiples of the expected half-life.

## References

Ornstein, L. S. & Uhlenbeck, G. E. (1930), the OU mean-reverting process;
Chan, E. (2013), *Algorithmic Trading*, on half-life sizing of pairs trades.

## See also

- [Indicator-SpreadAr1Coefficient](/Indicators/Indicator-SpreadAr1Coefficient) — AR(1) reversion strength.
- [Indicator-Cointegration](/Indicators/Indicator-Cointegration) — ADF-style cointegration test.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
