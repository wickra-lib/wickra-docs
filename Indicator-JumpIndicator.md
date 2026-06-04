# JumpIndicator

> A discrete `{−1, 0, +1}` flag for whether the current log return is an outlier
> relative to the trailing volatility of returns.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Volatility & Bands |
| Input type | `f64` (price) |
| Output type | `f64` (one of `−1.0`, `0.0`, `+1.0`) |
| Output range | `{−1, 0, +1}` |
| Default parameters | `period` (`>= 2`) and `threshold` (`> 0`) are required |
| Warmup period | `period + 2` |
| Interpretation | `+1` up jump, `−1` down jump, `0` ordinary move. |

## Formula

```
rₜ   = ln(priceₜ / priceₜ₋₁)
μ, σ = sample mean and stddev of the `period` returns *before* rₜ (trailing)
flag = +1 if rₜ − μ >  threshold · σ
       −1 if rₜ − μ < −threshold · σ
        0 otherwise
```

The volatility baseline is measured over the trailing window and **excludes** the
current return, so a genuine jump cannot inflate the band it is tested against.
Measuring the deviation from the trailing mean `μ` (not the raw return) means a
steady drift is *not* flagged — only moves large relative to the recent return
distribution count. When the trailing window has zero dispersion (`σ = 0`) there
is no baseline and the indicator returns `0`.

Source: `crates/wickra-core/src/indicators/jump_indicator.rs`.

## Parameters

| Name        | Type    | Default | Valid range | Source | Description |
|-------------|---------|---------|-------------|--------|-------------|
| `period`    | `usize` | none    | `>= 2`      | `jump_indicator.rs:66` | Trailing window for the volatility baseline. `< 2` errors with `Error::InvalidPeriod`. |
| `threshold` | `f64`   | none    | finite `> 0` | `jump_indicator.rs:66` | Standard deviations a return must exceed. Non-finite / `<= 0` errors with `Error::InvalidParameter`. |

(The Python class is `wickra.JumpIndicator(period=20, threshold=3.0)`.)

## Inputs / Outputs

From `crates/wickra-core/src/indicators/jump_indicator.rs`:

```rust
use wickra::{Indicator, JumpIndicator};
// JumpIndicator: Input = f64, Output = f64
const _: fn(&mut JumpIndicator, f64) -> Option<f64> = <JumpIndicator as Indicator>::update;
```

Python streams as `float | None`, batches as a 1-D `numpy.ndarray`. Node streams
as `number | null`, batches as `Array<number>`.

## Warmup

`warmup_period() == period + 2`: one price seeds the previous-price reference,
`period` returns fill the trailing window, then the next return is the first one
classified. The unit test `accessors_and_metadata` pins `warmup_period() == 22`
for `period = 20`.

## Edge cases

- **Up / down jump.** A calm warmup followed by a large spike flags `+1` (or
  `−1` for a drop); pinned by `detects_upward_jump` and `detects_downward_jump`.
- **Calm series.** A smooth sinusoid produces no jumps; pinned by
  `calm_series_has_no_jumps`.
- **Zero volatility.** A constant price (zero trailing dispersion) returns `0`;
  pinned by `zero_trailing_volatility_returns_zero`.
- **Steady drift.** A near-constant drift is not flagged (deviation from the mean
  stays inside the band); pinned by `steady_drift_is_not_flagged`.
- **Non-finite / non-positive prices.** Skipped; pinned by
  `ignores_non_finite_and_non_positive`.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, JumpIndicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut ji = JumpIndicator::new(10, 3.0)?;
    let mut prices: Vec<f64> =
        (0..20).map(|i| 100.0 + (f64::from(i) * 0.7).sin() * 0.2).collect();
    let last_calm = *prices.last().unwrap();
    prices.push(last_calm * 1.2); // +20% spike
    println!("{:?}", ji.batch(&prices).into_iter().last().flatten());
    Ok(())
}
```

Output:

```
Some(1.0)
```

### Python

```python
import math
import wickra as ta

ji = ta.JumpIndicator(10, 3.0)
prices = [100.0 + math.sin(i * 0.7) * 0.2 for i in range(20)]
prices.append(prices[-1] * 1.2)
last = None
for p in prices:
    last = ji.update(p)
print(last)
```

Output:

```
1.0
```

### Node

```javascript
const ta = require('wickra');
const ji = new ta.JumpIndicator(10, 3.0);
const prices = Array.from({ length: 20 }, (_, i) => 100 + Math.sin(i * 0.7) * 0.2);
prices.push(prices[prices.length - 1] * 1.2);
let last = null;
for (const p of prices) last = ji.update(p);
console.log(last);
```

Output:

```
1
```

## Interpretation

`JumpIndicator` separates genuine discontinuities (news, liquidations) from
ordinary volatility: feed prices and read `±1` only when a return is far out of
line with its own recent distribution. Lower `threshold` flags more moves; raise
it for only the most extreme. It pairs naturally with
[RealizedVolatility](Indicator-RealizedVolatility) (the continuous variation) and
[RegimeLabel](Indicator-RegimeLabel) (the volatility regime context).

## Common pitfalls

- **Deviation, not raw return.** A constant-drift series is *not* a stream of
  jumps here — the test is on `r − μ`, so steady trends pass through as `0`.
- **Threshold tuning stays yours.** The generic detector exposes `threshold`;
  any regime-specific sensitivity is your responsibility.

## References

The volatility-threshold jump test relates to the Lee & Mykland (2008) and
Barndorff-Nielsen & Shephard bipower-variation jump literature.

## See also

- [Indicator-RealizedVolatility](Indicator-RealizedVolatility) — continuous variation.
- [Indicator-RegimeLabel](Indicator-RegimeLabel) — volatility regime context.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
