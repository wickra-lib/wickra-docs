# RollingCorrelation

> Rolling Pearson correlation of the period-over-period *returns* of two series
> — the quantity that matters for hedging and portfolio risk.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Statistics |
| Input type | `(f64, f64)` (a pair of levels `x`, `y`) |
| Output type | `f64` |
| Output range | `[−1, +1]` (clamped) |
| Default parameters | `period` is required (`>= 2`) |
| Warmup period | `period + 1` |
| Interpretation | `+1` returns move together; `0` independent; `−1` move opposite. |

## Formula

Where [PearsonCorrelation](Indicator-PearsonCorrelation) correlates the raw
*levels*, this indicator first differences each channel into a one-step return
and correlates those returns over the trailing window:

```
rxₜ  = xₜ − xₜ₋₁          ryₜ = yₜ − yₜ₋₁
corr = cov(rx, ry) / √(var(rx) · var(ry))
```

Return correlation is what matters for hedging: two assets can trend together
(high level correlation) while their day-to-day moves are nearly independent
(low return correlation). The output is in `[−1, +1]`; a flat return channel
makes the ratio undefined and the indicator reports `0` rather than `NaN`. The
value is clamped to `[−1, +1]` to absorb tiny floating-point overshoots near the
boundaries.

Source: `crates/wickra-core/src/indicators/rolling_correlation.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= 2`      | `rolling_correlation.rs:63` | Look-back window of return pairs. `< 2` errors with `Error::InvalidPeriod`. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/rolling_correlation.rs`:

```rust
use wickra::{Indicator, RollingCorrelation};
// RollingCorrelation: Input = (f64, f64), Output = f64
const _: fn(&mut RollingCorrelation, (f64, f64)) -> Option<f64> =
    <RollingCorrelation as Indicator>::update;
```

Python streams as `update(x, y) -> float | None` and batches over two
equal-length arrays. Node streams as `update(x, y)` and batches over `x[]`,
`y[]`.

## Warmup

`warmup_period() == period + 1`. The first level in each channel produces no
return, so a `period`-pair correlation needs one extra observation. The unit
test `accessors_and_metadata` pins `warmup_period() == 15` for `period = 14`;
`warmup_needs_period_plus_one` pins the first `Some` at the `period + 1`-th pair.

## Edge cases

- **Perfectly correlated returns.** When one channel is an affine function of
  the other (`y = m·x + c`), the return correlation is `+1`; pinned by the
  module's perfect-correlation test.
- **Flat returns.** A channel with constant returns has zero return variance, so
  the correlation is undefined and the output is `0`.
- **Clamping.** Floating-point overshoot just past `±1` is clamped back into
  `[−1, +1]`.
- **Reset.** `reset()` clears the return window and the previous levels.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, RollingCorrelation};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut rc = RollingCorrelation::new(14)?;
    // y = 3*x with varying x -> returns perfectly correlated -> +1.
    let pairs: Vec<(f64, f64)> = (0..40)
        .map(|t| {
            let x = 100.0 + (f64::from(t) * 0.7).sin();
            (x, 3.0 * x)
        })
        .collect();
    let last = rc.batch(&pairs).into_iter().flatten().last().unwrap();
    println!("{last:.6}");
    Ok(())
}
```

Output:

```
1.000000
```

### Python

```python
import numpy as np
import wickra as ta

t = np.arange(40)
x = 100.0 + np.sin(t * 0.7)
y = 3.0 * x
print(round(ta.RollingCorrelation(14).batch(x, y)[-1], 6))
```

Output:

```
1.0
```

### Node

```javascript
const ta = require('wickra');
const x = Array.from({ length: 40 }, (_, t) => 100 + Math.sin(t * 0.7));
const y = x.map((v) => 3 * v);
console.log(new ta.RollingCorrelation(14).batch(x, y).at(-1).toFixed(6));
```

Output:

```
1.000000
```

## Interpretation

Use `RollingCorrelation` to monitor how tightly two return streams co-move —
the input to hedge sizing, diversification and regime detection. A correlation
drifting from `+0.9` toward `0` warns that a hedge is decaying; a flip toward
negative territory signals a regime change. Because it is computed on returns,
not levels, it does not get fooled by two assets that merely share a long-run
trend. For the unnormalised building block use
[RollingCovariance](Indicator-RollingCovariance).

## Common pitfalls

- **Returns, not levels.** This is return correlation. If you want correlation
  of price *levels* use [PearsonCorrelation](Indicator-PearsonCorrelation) — the
  two can disagree sharply.
- **`0` is ambiguous.** A flat channel also returns `0`. Distinguish "truly
  uncorrelated" from "degenerate flat" via the channels' own variances.

## References

Pearson, K. (1895), the product-moment correlation coefficient.

## See also

- [Indicator-RollingCovariance](Indicator-RollingCovariance) — the unnormalised return co-movement.
- [Indicator-PearsonCorrelation](Indicator-PearsonCorrelation) — correlation of raw levels.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
