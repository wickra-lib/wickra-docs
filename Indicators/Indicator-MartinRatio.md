# MartinRatio

> The Ulcer Performance Index — mean return over the Ulcer Index (the RMS of
> percentage drawdowns).

## Quick reference

| Field | Value |
|-------|-------|
| Family | Risk / Performance |
| Input type | `f64` (per-period returns) |
| Output type | `f64` |
| Output range | unbounded (negative for net-losing windows) |
| Default parameters | `(period = 14)` (Python) |
| Warmup period | `period` |
| Interpretation | Higher = more return per unit of underwater stress. |

## Formula

```
equity_t = Π_{i<=t} (1 + return_i)               (compounded curve)
peak_t   = max_{s<=t} equity_s
dd_t%    = 100 · (peak_t − equity_t) / peak_t      (percentage drawdown)
UlcerIdx = sqrt( mean( dd_t%² ) )
Martin   = mean(returns) / UlcerIdx
```

The Martin Ratio (a.k.a. Ulcer Performance Index, UPI) divides the average
per-period return by the **Ulcer Index** — the root-mean-square of the *percentage*
drawdowns. The Ulcer Index captures both the depth and the *duration* of time spent
underwater, so a long shallow slump and a short deep one can score alike. Versus
Wickra's other drawdown ratios, Martin uses the RMS (not the plain average of the
[`SterlingRatio`](/Indicators/Indicator-SterlingRatio), nor the un-normalised sum-norm
of the [`BurkeRatio`](/Indicators/Indicator-BurkeRatio)) and expresses drawdowns in
**percent**, so its denominator lives on a `0..100` scale and its output is
numerically smaller than the fractional-drawdown ratios. A window that never draws
down has an Ulcer Index of zero and reports `0.0`. Source:
`crates/wickra-core/src/indicators/martin_ratio.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `14` (Python) | `>= 2`      | `martin_ratio.rs:50` | Window of returns (14 is the classic Ulcer Index window). `< 2` errors with `Error::InvalidPeriod`. |

The `period` getter returns the window.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/martin_ratio.rs`:

```rust
use wickra::{Indicator, MartinRatio};
// MartinRatio: Input = f64, Output = f64
const _: fn(&mut MartinRatio, f64) -> Option<f64> = <MartinRatio as Indicator>::update;
```

An `f64` return in, an `Option<f64>` out. Python `update(ret)` / `batch(returns)`
(NaN warmup); Node `update(ret)` / `batch(returns[])` (null warmup).

## Warmup

`warmup_period() == period`. The first value lands once `period` returns are seen
(`reference_value` exercises the emission at index `period − 1`).

## Edge cases

- **Reference value.** `[0.1, −0.1, 0.1]` → drawdowns% `[0, 10, 1]`,
  Ulcer Index `sqrt(101/3)`, Martin `(0.1/3) / sqrt(101/3)` (`reference_value` pins this).
- **No drawdown.** A monotonically rising window has a zero Ulcer Index and reports
  `0.0` (`no_drawdown_is_zero` pins this).
- **Losing window.** A net-losing window gives a negative ratio
  (`losing_window_is_negative` pins this).
- **Non-finite input.** A NaN/∞ return is skipped (`ignores_non_finite_input`).
- **Reset.** `mr.reset()` clears the window (`reset_clears_state` pins this).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, MartinRatio};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut mr = MartinRatio::new(3)?;
    let out = mr.batch(&[0.1, -0.1, 0.1]);
    println!("{:?}", out[2]); // Some(0.00574...)
    Ok(())
}
```

Output:

```
Some(0.005744817400227442)
```

### Python

```python
import numpy as np
import wickra as ta

mr = ta.MartinRatio(14)
returns = np.random.randn(60) * 0.05
print(mr.batch(returns)[-1])
```

### Node

```javascript
const ta = require('wickra');
const mr = new ta.MartinRatio(3);
console.log(mr.batch([0.1, -0.1, 0.1]).at(-1)); // ~0.00574
```

### Streaming

```rust
use wickra::{Indicator, MartinRatio};

let mut mr = MartinRatio::new(14).unwrap();
let daily_returns: Vec<f64> = Vec::new(); // your live stream
for r in daily_returns {
    if let Some(upi) = mr.update(r) {
        // a falling UPI means rising underwater stress
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Stress-adjusted return.** The Ulcer Index penalises *time underwater*, so the
   Martin Ratio rewards strategies that recover quickly from drawdowns.
2. **Scale awareness.** Because drawdowns are in percent, Martin Ratios are an order
   of magnitude smaller than the fractional Sterling/Burke ratios — never compare
   raw values across the three.
3. **Family triangulation.** A high Martin but low [`BurkeRatio`](/Indicators/Indicator-BurkeRatio)
   says the underwater periods are shallow on average even if one is deep.

## Common pitfalls

- **No-drawdown anomaly.** A window that only rises reports `0.0` (undefined), not
  infinity.
- **Percent scale.** Do not mix Martin values with Sterling/Burke values — the
  denominator units differ (percent vs fraction).
- **Risk-free omitted.** This rolling form uses the raw mean return; subtract the
  risk-free rate from your inputs first if you want an excess-return Martin Ratio.

## References

Martin, P. G., & McCann, B. B. (1989), *The Investor's Guide to Fidelity Funds* —
the Ulcer Index and the Ulcer Performance Index (Martin Ratio).

## See also

- [Indicator-SterlingRatio](/Indicators/Indicator-SterlingRatio) — average drawdown.
- [Indicator-BurkeRatio](/Indicators/Indicator-BurkeRatio) — sum of squared drawdowns.
- [Indicator-SharpeRatio](/Indicators/Indicator-SharpeRatio) — mean over total volatility.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
