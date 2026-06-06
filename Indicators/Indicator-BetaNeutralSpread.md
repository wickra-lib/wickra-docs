# BetaNeutralSpread

> The beta-neutral spread between two assets — the residual of a rolling OLS
> regression of `a` on `b`, in price units.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Statistics |
| Input type | `(f64, f64)` (a pair of prices `a`, `b`) |
| Output type | `f64` (price units) |
| Output range | unbounded; `0` when `a` sits exactly on its hedge |
| Default parameters | `period` is required (`>= 2`) |
| Warmup period | `period` |
| Interpretation | Positive → `a` rich vs. its hedge; negative → `a` cheap; `0` → fairly priced. |

## Formula

Each `update` takes one `(a, b)` price pair. Over the trailing window of
`period` pairs the indicator fits the hedge ratio `β` (and intercept `α`) by
OLS and reports the **current** residual:

```
β      = cov(a, b) / var(b)        α = ā − β · b̄
spread = a_now − (α + β · b_now)
```

Subtracting `β · b` removes `a`'s exposure to `b`, so the spread is market-
(beta-)neutral: it is what is left after the common factor is hedged out.
Positive means `a` is rich relative to its hedge, negative means cheap — the raw
signal a pairs trade fades. Where
[PairSpreadZScore](/Indicators/Indicator-PairSpreadZScore) standardises this residual into a
z-score and [Cointegration](/Indicators/Indicator-Cointegration) bundles it with an ADF
test, this indicator returns the residual itself, in price units. If `b` is flat
over the window (`var(b) = 0`) there is no defined slope and it falls back to
`β = 0`, so the spread becomes `a_now − ā`.

Source: `crates/wickra-core/src/indicators/beta_neutral_spread.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= 2`      | `beta_neutral_spread.rs:63` | Look-back window of pairs for the OLS fit. `< 2` errors with `Error::InvalidPeriod`. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/beta_neutral_spread.rs`:

```rust
use wickra::{Indicator, BetaNeutralSpread};
// BetaNeutralSpread: Input = (f64, f64), Output = f64
const _: fn(&mut BetaNeutralSpread, (f64, f64)) -> Option<f64> =
    <BetaNeutralSpread as Indicator>::update;
```

Python streams as `update(a, b) -> float | None` and batches over two
equal-length arrays. Node streams as `update(a, b)` and batches over `a[]`,
`b[]`.

## Warmup

`warmup_period() == period`. The unit test `accessors_and_metadata` pins
`warmup_period() == 20` for `period = 20`; `warmup_returns_none` pins the first
`Some` at the `period`-th pair.

## Edge cases

- **Perfect linear relationship.** When `a = α + β·b` exactly, the residual is
  zero; pinned by `perfect_linear_relationship_has_zero_spread`.
- **Dislocation.** A departure from the fitted line produces a nonzero spread;
  pinned by `dislocation_produces_nonzero_spread`.
- **Flat `b`.** Zero variance in `b` collapses the slope to `β = 0`, so the
  spread reduces to `a_now − ā`.
- **Reset.** `reset()` clears the regression window.

## Examples

### Rust

```rust
use wickra::{BatchExt, BetaNeutralSpread, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut s = BetaNeutralSpread::new(20)?;
    // a = 2*b exactly -> residual is zero.
    let pairs: Vec<(f64, f64)> =
        (0..40).map(|t| (2.0 * f64::from(t), f64::from(t))).collect();
    let last = s.batch(&pairs).into_iter().flatten().last().unwrap();
    println!("{last:.6}");
    Ok(())
}
```

Output:

```
0.000000
```

### Python

```python
import numpy as np
import wickra as ta

t = np.arange(40, dtype=float)
a = 2.0 * t
b = t
print(round(ta.BetaNeutralSpread(20).batch(a, b)[-1], 6))
```

Output:

```
0.0
```

### Node

```javascript
const ta = require('wickra');
const a = Array.from({ length: 40 }, (_, t) => 2 * t);
const b = Array.from({ length: 40 }, (_, t) => t);
console.log(new ta.BetaNeutralSpread(20).batch(a, b).at(-1).toFixed(6));
```

Output:

```
0.000000
```

## Interpretation

`BetaNeutralSpread` is the dollar-value dislocation of a hedged pair: long `a`,
short `β` units of `b`, and the spread is your mark-to-market deviation from
fair. Fade extremes — short the spread when it is large and positive, long when
large and negative — and exit near zero. Because the output is in price units it
is not directly comparable across pairs with different volatilities; standardise
with [PairSpreadZScore](/Indicators/Indicator-PairSpreadZScore) when ranking signals across
pairs.

## Common pitfalls

- **Leg order matters.** The regression is asymmetric: regressing `a` on `b`
  gives a different hedge ratio than `b` on `a`. Fix the dependent leg and keep
  it consistent.
- **Rolling β drifts.** The hedge ratio is refit every bar, so a structural
  break shows up as both a moving `β` and a spread that does not revert. Confirm
  the relationship is stable with [Cointegration](/Indicators/Indicator-Cointegration).

## References

Engle, R. F. & Granger, C. W. J. (1987), cointegration and error correction;
the OLS-residual spread is the Engle–Granger first-stage residual.

## See also

- [Indicator-PairSpreadZScore](/Indicators/Indicator-PairSpreadZScore) — standardised entry/exit timing.
- [Indicator-Cointegration](/Indicators/Indicator-Cointegration) — hedge ratio + ADF stationarity test.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
