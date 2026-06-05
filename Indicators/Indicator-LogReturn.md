# LogReturn

> Logarithmic return over a fixed lag: `ln(price_t / price_{t−period})` — the
> additive, scale-free return basis for volatility and statistical models.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Statistics |
| Input type | `f64` (single price) |
| Output type | `f64` |
| Output range | unbounded; signed (positive = up move) |
| Default parameters | `period` is required (the lag in bars) |
| Warmup period | `period + 1` |
| Interpretation | Additive return: the `k`-bar log return is the sum of the `k` one-bar log returns. |

## Formula

```
r_t = ln(price_t / price_{t−period})
```

The natural-log analogue of [Roc](/Indicators/Indicator-Roc) (which reports the simple
percentage change `(p_t − p_{t−period}) / p_{t−period} · 100`). Log returns are
*additive across time* — the return over `k` bars equals the sum of the `k`
one-bar log returns — and symmetric around zero, which is why they are the
canonical input for volatility estimators and statistical models.

Source: `crates/wickra-core/src/indicators/log_return.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= 1`      | `log_return.rs:52` | Lag in bars. `period = 0` errors with `Error::PeriodZero`. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/log_return.rs`:

```rust
use wickra::{Indicator, LogReturn};
// LogReturn: Input = f64, Output = f64
const _: fn(&mut LogReturn, f64) -> Option<f64> = <LogReturn as Indicator>::update;
```

Python streams as `float | None`, batches as a 1-D `numpy.ndarray` (`NaN` for
warmup). Node streams as `number | null`, batches as `Array<number>` with `NaN`
placeholders.

## Warmup

`LogReturn::new(period).warmup_period() == period + 1`: the window must hold the
current price plus the `period`-bar-ago price. The unit test
`accessors_and_metadata` pins `warmup_period() == 6` for `period = 5`, and
`multi_bar_lag` pins that the first emission lands at index `period`.

## Edge cases

- **Constant series.** A flat series has zero log return on every bar. The unit
  test `constant_series_yields_zero` pins this.
- **Additivity.** The 2-bar log return equals the sum of the two 1-bar log
  returns; the unit test `additive_across_time` pins it.
- **Non-finite inputs.** NaN / ±inf are ignored: state is untouched and the last
  value is returned. The unit test `ignores_non_finite_input` pins this.
- **Non-positive prices.** `ln` is undefined for `price <= 0`, so such ticks are
  skipped (the previous valid price is kept as the reference). The unit test
  `skips_non_positive_prices` pins this.
- **Reset.** `reset()` clears the window; the next `update` restarts warmup.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, LogReturn};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut lr = LogReturn::new(1)?;
    let out: Vec<Option<f64>> = lr.batch(&[100.0, 110.0]);
    println!("{:?}", out);
    Ok(())
}
```

Output:

```
[None, Some(0.09531017980432486)]
```

`ln(110 / 100) = ln(1.1) ≈ 0.0953`. This matches the `known_value` unit test.

### Python

```python
import wickra as ta

lr = ta.LogReturn(1)
for x in [100.0, 110.0]:
    print(x, '->', lr.update(x))
```

Output:

```
100.0 -> None
110.0 -> 0.09531017980432486
```

### Node

```javascript
const ta = require('wickra');
const lr = new ta.LogReturn(1);
for (const x of [100, 110]) console.log(x, '->', lr.update(x));
```

Output:

```
100 -> null
110 -> 0.09531017980432486
```

## Interpretation

Use `LogReturn` when you need a return series for downstream statistics
(volatility, autocorrelation, regression) rather than a percentage for display:
log returns add across time and are symmetric, so a `+x` move and the reverse
`−x` move cancel exactly. For a human-facing percentage change prefer
[Roc](/Indicators/Indicator-Roc); for the realised volatility built on these returns see
[RealizedVolatility](/Indicators/Indicator-RealizedVolatility) and
[HistoricalVolatility](/Indicators/Indicator-HistoricalVolatility).

## Common pitfalls

- **Confusing it with simple return.** `LogReturn` is `ln(p_t / p_{t−k})`, not
  `(p_t − p_{t−k}) / p_{t−k}`. The two agree only for small moves; they diverge
  for large ones. Use [Roc](/Indicators/Indicator-Roc) if you specifically want the simple
  percentage.
- **Feeding non-positive prices.** Spreads or detrended series that can go
  non-positive are silently skipped here (the log is undefined). Difference such
  series with a plain subtraction, not a log return.

## References

Log returns (continuously-compounded returns) are standard in quantitative
finance; see Campbell, Lo & MacKinlay, *The Econometrics of Financial Markets*
(1997), for the additive-return treatment.

## See also

- [Indicator-Roc](/Indicators/Indicator-Roc) — the simple-percentage analogue.
- [Indicator-RealizedVolatility](/Indicators/Indicator-RealizedVolatility) — built on these returns.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
