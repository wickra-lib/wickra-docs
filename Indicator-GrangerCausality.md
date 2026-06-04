# GrangerCausality

> The Granger-causality F-statistic over a rolling window: does series `b` help
> predict series `a` beyond `a`'s own past?

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Statistics |
| Input type | `(f64, f64)` (a pair `a`, `b`) |
| Output type | `f64` (F-statistic) |
| Output range | `>= 0`; larger = stronger predictive causality |
| Default parameters | `period`, `lag` both required (`lag >= 1`, `period >= 3·lag + 2`) |
| Warmup period | `period` |
| Interpretation | Large F → `b` leads `a`; near `0` → `b` adds nothing. Predictive, not structural cause. |

## Formula

Each `update` takes one `(a, b)` pair. Over the trailing window of `period`
observations the indicator fits two autoregressions of `a` and compares them
with an F-test:

```
restricted:    aₜ = c + Σ φᵢ·aₜ₋ᵢ                       (a's own lags only)
unrestricted:  aₜ = c + Σ φᵢ·aₜ₋ᵢ + Σ ψᵢ·bₜ₋ᵢ          (+ b's lags)
F = ((RSSᵣ − RSSᵤ) / lag) / (RSSᵤ / (n − 2·lag − 1))
```

If adding `b`'s lags significantly reduces the residual sum of squares, `b`
**Granger-causes** `a`: past values of `b` carry information about the future of
`a` beyond what `a`'s own past holds. A **larger** F means stronger predictive
causality (lead–lag structure a stat-arb model can trade); a value near `0`
means `b` adds nothing. Note Granger causality is purely predictive — it is not
structural cause and effect. The statistic is `0` when a regression is
degenerate (a collinear or flat window makes the normal equations singular). The
output is always `>= 0`.

Source: `crates/wickra-core/src/indicators/granger_causality.rs`.

## Parameters

| Name     | Type    | Default | Valid range      | Source | Description |
|----------|---------|---------|------------------|--------|-------------|
| `period` | `usize` | none    | `>= 3·lag + 2`   | `granger_causality.rs:65` | Look-back window of observations. |
| `lag`    | `usize` | none    | `>= 1`           | `granger_causality.rs:65` | Number of autoregressive lags. Bad parameters error with `Error::InvalidPeriod`. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/granger_causality.rs`:

```rust
use wickra::{GrangerCausality, Indicator};
// GrangerCausality: Input = (f64, f64), Output = f64
const _: fn(&mut GrangerCausality, (f64, f64)) -> Option<f64> =
    <GrangerCausality as Indicator>::update;
```

Python streams as `update(a, b) -> float | None` and batches over two
equal-length arrays. Node streams as `update(a, b)` and batches over `a[]`,
`b[]`.

## Warmup

`warmup_period() == period`. The unit test `accessors_and_metadata` pins
`warmup_period() == 60` for `period = 60`; `warmup_returns_none` pins the first
`Some` at the `period`-th pair.

## Edge cases

- **`b` leads `a`.** When `a` is driven by `b`'s prior values, the F-statistic is
  large and positive; pinned by `b_leading_a_has_positive_statistic`.
- **Singular window.** A constant `b` makes its lag columns collinear with the
  intercept, so the unrestricted system is singular and the output is `0`; pinned
  by `constant_b_is_singular_and_returns_zero`.
- **Constant `a`.** A flat `a` makes the restricted regression singular and also
  returns `0`; pinned by `constant_a_restricted_singular_returns_zero`.
- **Reset.** `reset()` clears the window.

## Examples

### Rust

```rust
use wickra::{BatchExt, GrangerCausality, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut g = GrangerCausality::new(60, 1)?;
    // a today is driven by b yesterday (plus a little of its own past) -> b helps.
    let mut prev_drive = 0.0;
    let pairs: Vec<(f64, f64)> = (0..120)
        .map(|t| {
            let drive = (f64::from(t) * 0.3).sin() + 0.4 * (f64::from(t) * 0.11).cos();
            let a = 0.8 * prev_drive + 0.05 * (f64::from(t) * 0.7).sin();
            prev_drive = drive;
            (a, drive)
        })
        .collect();
    let last = g.batch(&pairs).into_iter().flatten().last().unwrap();
    println!("{last:.4}");
    Ok(())
}
```

Output:

```
1335.5963
```

### Python

```python
import numpy as np
import wickra as ta

t = np.arange(120)
drive = np.sin(t * 0.3) + 0.4 * np.cos(t * 0.11)
a = np.empty(120)
a[0] = 0.0
a[1:] = 0.8 * drive[:-1] + 0.05 * np.sin(t[1:] * 0.7)
print(round(ta.GrangerCausality(60, 1).batch(a, drive)[-1], 4))
```

Output:

```
1335.5963
```

### Node

```javascript
const ta = require('wickra');
const drive = Array.from({ length: 120 }, (_, t) => Math.sin(t * 0.3) + 0.4 * Math.cos(t * 0.11));
const a = drive.map((_, t) => (t === 0 ? 0 : 0.8 * drive[t - 1] + 0.05 * Math.sin(t * 0.7)));
console.log(new ta.GrangerCausality(60, 1).batch(a, drive).at(-1).toFixed(4));
```

Output:

```
1335.5963
```

## Interpretation

`GrangerCausality` quantifies lead–lag structure: a large F means `b`'s history
predicts `a`'s future, the asymmetry a stat-arb model trades by acting on the
leading leg. Run it both ways — `b → a` and `a → b` — to find the direction of
information flow; the larger statistic points to the leader. Because the test is
purely predictive, treat a high F as a tradeable forecasting edge, not proof of
an economic mechanism. Combine with [Cointegration](Indicator-Cointegration) to
confirm the legs share a long-run equilibrium, not just short-run predictability.

## Common pitfalls

- **Predictive, not causal.** Granger causality detects forecast usefulness, not
  structural cause. A confounding third series can produce a high F.
- **Lag and window tuning.** Too few lags miss the lead structure; too many
  inflate the window requirement and the variance of the estimate. Pick `lag`
  from the suspected lead time.

## References

Granger, C. W. J. (1969), *Investigating Causal Relations by Econometric Models
and Cross-spectral Methods*, Econometrica.

## See also

- [Indicator-Cointegration](Indicator-Cointegration) — long-run equilibrium between the legs.
- [Indicator-RollingCorrelation](Indicator-RollingCorrelation) — contemporaneous co-movement.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
