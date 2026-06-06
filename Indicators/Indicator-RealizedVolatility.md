# RealizedVolatility

> The square root of the sum of squared log returns over a window — raw,
> un-annualised quadratic variation, the high-frequency volatility estimator.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Statistics |
| Input type | `f64` (single price) |
| Output type | `f64` |
| Output range | `>= 0` |
| Default parameters | `period` is required |
| Warmup period | `period + 1` |
| Interpretation | Higher = more realised variation over the window. Multiply by `√trading_periods` to annualise. |

## Formula

```
r_t = ln(price_t / price_{t−1})
RV  = √( Σ r_t²  over the last `period` returns )
```

Unlike [HistoricalVolatility](/Indicators/Indicator-HistoricalVolatility) — which reports the
*annualised sample standard deviation* of log returns (mean-centred, divided by
`n − 1`, scaled by `√trading_periods`, ×100) — realized volatility is the **raw,
un-centred, un-annualised** quadratic-variation estimator from high-frequency
econometrics. It makes no Gaussian assumption and no mean subtraction: it simply
accumulates squared returns, converging to the integrated variance of the price
path as the sampling frequency rises.

Source: `crates/wickra-core/src/indicators/realized_volatility.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= 1`      | `realized_volatility.rs:62` | Number of squared log returns summed. `period = 0` errors with `Error::PeriodZero`. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/realized_volatility.rs`:

```rust
use wickra::{Indicator, RealizedVolatility};
// RealizedVolatility: Input = f64, Output = f64
const _: fn(&mut RealizedVolatility, f64) -> Option<f64> =
    <RealizedVolatility as Indicator>::update;
```

Python streams as `float | None`, batches as a 1-D `numpy.ndarray`. Node streams
as `number | null`, batches as `Array<number>`.

## Warmup

`warmup_period() == period + 1`: one price seeds the previous-price reference,
then `period` returns fill the window. The unit test `accessors_and_metadata`
pins `warmup_period() == 21` for `period = 20`; `first_emission_at_warmup_period`
pins the first `Some` at index `period`.

## Edge cases

- **Constant series.** Flat prices give zero returns, so `RV = 0`. The unit test
  `constant_series_yields_zero` pins this.
- **Non-negativity.** `RV` is a square root of a non-negative sum; the unit test
  `output_is_non_negative` pins `v >= 0` over a noisy path.
- **Non-finite / non-positive prices.** Skipped (the log return is undefined);
  state is untouched and the last value returned. Pinned by
  `ignores_non_finite_input` and `skips_non_positive_prices`.
- **Reset.** `reset()` clears the window and the previous-price reference.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, RealizedVolatility};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut rv = RealizedVolatility::new(2)?;
    let out: Vec<Option<f64>> = rv.batch(&[100.0, 110.0, 121.0]);
    println!("{:?}", out);
    Ok(())
}
```

Output:

```
[None, None, Some(0.13478635600636957)]
```

Two equal `+10%` steps give `r = ln(1.1)` each, so `RV = √(2 · ln(1.1)²) ≈
0.1348`. This matches the `known_value` unit test.

### Python

```python
import wickra as ta

rv = ta.RealizedVolatility(2)
for x in [100.0, 110.0, 121.0]:
    print(x, '->', rv.update(x))
```

Output:

```
100.0 -> None
110.0 -> None
121.0 -> 0.13478635600636957
```

### Node

```javascript
const ta = require('wickra');
const rv = new ta.RealizedVolatility(2);
for (const x of [100, 110, 121]) console.log(x, '->', rv.update(x));
```

Output:

```
100 -> null
110 -> null
121 -> 0.13478635600636957
```

## Interpretation

`RealizedVolatility` is the model-free volatility measure for intrabar / tick
data: feed high-frequency prices and read off the realised variation of the
path. Because it is un-annualised, compare readings only at the same sampling
frequency, or multiply by `√trading_periods` for an annual figure. When you want
the classical annualised, mean-centred, percentage volatility for options /
risk, use [HistoricalVolatility](/Indicators/Indicator-HistoricalVolatility) instead.

## Common pitfalls

- **Treating it as annualised.** The output is raw `√Σr²`; it scales with
  `√period`. Two `RealizedVolatility` instances of different periods are not
  directly comparable without normalising.
- **Comparing to `HistoricalVolatility`.** The two use different definitions
  (un-centred sum vs mean-centred sample variance, un-annualised vs ×√252×100).
  They will not match numerically; pick the one matching your convention.

## References

Andersen, Bollerslev, Diebold & Labys, "The Distribution of Realized Exchange
Rate Volatility" (2001); Barndorff-Nielsen & Shephard on realised variance and
quadratic variation.

## See also

- [Indicator-HistoricalVolatility](/Indicators/Indicator-HistoricalVolatility) — annualised sample-stddev volatility.
- [Indicator-LogReturn](/Indicators/Indicator-LogReturn) — the returns summed here.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
