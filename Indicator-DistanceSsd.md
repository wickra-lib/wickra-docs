# DistanceSsd

> The Gatev sum-of-squared-deviations distance between two price series,
> normalised to a common start — the classic pairs-selection screen.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Statistics |
| Input type | `(f64, f64)` (a pair of prices `a`, `b`) |
| Output type | `f64` |
| Output range | `>= 0`; small = tightly tracking, large = decoupled |
| Default parameters | `period` is required (`>= 2`) |
| Warmup period | `period` |
| Interpretation | Lower SSD → the two assets track each other more tightly (a tradeable pair). |

## Formula

Each `update` takes one `(a, b)` price pair. Over the trailing window of
`period` pairs each series is rebased to `1` at the window's first bar and the
squared gap between the two normalised paths is summed:

```
ãᵢ = aᵢ / a_first        b̃ᵢ = bᵢ / b_first
SSD = Σ (ãᵢ − b̃ᵢ)²
```

Rebasing puts the two series on the same scale (both start at `1`), so the
distance measures how far their *relative* paths drift apart — the screen Gatev,
Goetzmann and Rouwenhorst use to pick tradeable pairs. A small SSD means the two
assets track each other tightly; a large SSD means they have decoupled. The
output is always `>= 0`. If either series is `0` at the start of the window the
normalisation is undefined and the indicator returns `0`.

Source: `crates/wickra-core/src/indicators/distance_ssd.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= 2`      | `distance_ssd.rs:56` | Look-back window of pairs. `< 2` errors with `Error::InvalidPeriod`. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/distance_ssd.rs`:

```rust
use wickra::{Indicator, DistanceSsd};
// DistanceSsd: Input = (f64, f64), Output = f64
const _: fn(&mut DistanceSsd, (f64, f64)) -> Option<f64> =
    <DistanceSsd as Indicator>::update;
```

Python streams as `update(a, b) -> float | None` and batches over two
equal-length arrays. Node streams as `update(a, b)` and batches over `a[]`,
`b[]`.

## Warmup

`warmup_period() == period`. The unit test `accessors_and_metadata` pins
`warmup_period() == 20` for `period = 20`; `warmup_returns_none` pins the first
`Some` at the `period`-th pair.

## Edge cases

- **Identical paths.** Two series with the same normalised path have zero
  distance; pinned by `identical_normalised_paths_have_zero_distance`.
- **Diverging paths.** Decoupled series accumulate a positive distance; pinned
  by `diverging_paths_have_positive_distance`.
- **Zero start.** If either series is `0` at the window's first bar the
  normalisation is undefined and the output is `0`.
- **Reset.** `reset()` clears the window.

## Examples

### Rust

```rust
use wickra::{BatchExt, DistanceSsd, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut d = DistanceSsd::new(20)?;
    // Identical series -> identical normalised paths -> zero distance.
    let pairs: Vec<(f64, f64)> =
        (0..40).map(|t| (100.0 + f64::from(t), 100.0 + f64::from(t))).collect();
    let last = d.batch(&pairs).into_iter().flatten().last().unwrap();
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

t = np.arange(40)
a = 100.0 + t
b = 100.0 + t
print(round(ta.DistanceSsd(20).batch(a, b)[-1], 6))
```

Output:

```
0.0
```

### Node

```javascript
const ta = require('wickra');
const a = Array.from({ length: 40 }, (_, t) => 100 + t);
const b = Array.from({ length: 40 }, (_, t) => 100 + t);
console.log(new ta.DistanceSsd(20).batch(a, b).at(-1).toFixed(6));
```

Output:

```
0.000000
```

## Interpretation

`DistanceSsd` is a screen, not a trade trigger: it ranks candidate pairs by how
closely their normalised paths have tracked over the window. The classic Gatev
workflow forms a portfolio from the pairs with the **smallest** SSD, then trades
each with a separate divergence signal. A rising SSD on an existing pair is an
early warning that the relationship is breaking down. Combine with
[BetaNeutralSpread](Indicator-BetaNeutralSpread) or
[Cointegration](Indicator-Cointegration) for the entry signal once a pair is
selected.

## Common pitfalls

- **Scale dependence on the window start.** Because both series are rebased to
  the window's *first* bar, the SSD depends on which bar that is. Two windows
  ending on the same bar but starting differently are not directly comparable.
- **SSD is not directional.** It measures total path divergence, not which leg
  is rich or cheap. Use a signed spread indicator for the trade direction.

## References

Gatev, E., Goetzmann, W. N. & Rouwenhorst, K. G. (2006), *Pairs Trading:
Performance of a Relative-Value Arbitrage Rule*, Review of Financial Studies.

## See also

- [Indicator-BetaNeutralSpread](Indicator-BetaNeutralSpread) — the residual once a pair is chosen.
- [Indicator-Cointegration](Indicator-Cointegration) — ADF-style cointegration test.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
