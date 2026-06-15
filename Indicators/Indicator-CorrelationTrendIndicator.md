# CorrelationTrendIndicator

> Ehlers' CTI — the Pearson correlation of price against a straight time ramp;
> `+1` is a clean uptrend, `−1` a clean downtrend, `0` no linear trend.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Ehlers / Cycle (DSP) |
| Input type | `f64` |
| Output type | `f64` |
| Output range | `[−1, +1]` |
| Default parameters | `(period = 20)` (Python) |
| Warmup period | `period` |
| Interpretation | `+1` linear uptrend, `−1` linear downtrend, `~0` range. |

## Formula

```
CTI = corr( price over the window , [0, 1, …, period−1] )
```

The Correlation Trend Indicator measures how closely recent price tracks a
straight line by correlating the windowed prices with the time index. Because
correlation is scale- and offset-invariant, the *slope* does not matter — only how
**linear** the move is — giving a clean trend/range classifier bounded in
`[−1, +1]`. It differs from [`Autocorrelation`](/Indicators/Indicator-Autocorrelation),
which correlates price with a lagged copy of itself. Source:
`crates/wickra-core/src/indicators/correlation_trend_indicator.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `20` (Python) | `>= 2`      | `correlation_trend_indicator.rs:55` | Lookback window. `< 2` errors with `Error::InvalidPeriod`. |

The `period` getter returns the window; `value` returns the current output if
ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/correlation_trend_indicator.rs`:

```rust
use wickra::{Indicator, CorrelationTrendIndicator};
// CorrelationTrendIndicator: Input = f64, Output = f64
const _: fn(&mut CorrelationTrendIndicator, f64) -> Option<f64> =
    <CorrelationTrendIndicator as Indicator>::update;
```

An `f64` in, an `Option<f64>` out. The Python binding takes a scalar for `update`
and a 1-D numpy array for `batch` (NaN warmup); Node takes `update(value)` and
`batch(values[])`.

## Warmup

`warmup_period() == period`. The first value lands once the window is full
(`first_emission_at_warmup_period` pins this).

## Edge cases

- **Clean uptrend → +1.** A linear rise correlates perfectly with time
  (`clean_uptrend_is_one` pins this).
- **Clean downtrend → −1.** A linear fall gives `−1` (`clean_downtrend_is_minus_one`
  pins this).
- **Flat window → 0.** Zero price variance returns `0`
  (`flat_window_is_zero` pins this).
- **Bounded.** The reading stays within `[−1, +1]` (`output_in_range` pins this).
- **Non-finite input.** A NaN/∞ input is ignored and the last value returned
  (`ignores_non_finite` pins this).
- **Reset.** `cti.reset()` clears the window and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, CorrelationTrendIndicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut cti = CorrelationTrendIndicator::new(10)?;
    let out = cti.batch(&(0..40).map(f64::from).collect::<Vec<_>>());
    println!("{:?}", out.last().unwrap()); // Some(1.0)
    Ok(())
}
```

Output:

```
Some(1.0)
```

### Python

```python
import numpy as np
import wickra as ta

cti = ta.CTI(20)
x = np.arange(40, dtype=float)
print(cti.batch(x)[-1])   # 1.0
```

### Node

```javascript
const ta = require('wickra');

const cti = new ta.CTI(20);
console.log('warmupPeriod:', cti.warmupPeriod()); // 20
```

### Streaming

```rust
use wickra::{Indicator, CorrelationTrendIndicator};

let mut cti = CorrelationTrendIndicator::new(20).unwrap();
let mut last = None;
for i in 0..40 {
    last = cti.update(100.0 + f64::from(i));
}
println!("{last:?}"); // Some(1.0)
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Trend/range switch.** `|CTI|` near `1` = trade with the trend; near `0` =
   favour mean reversion.
2. **Early turns.** CTI flipping sign often leads price-based trend filters because
   it reacts to loss of linearity, not just to a moving-average cross.
3. **Confluence.** Combine high `|CTI|` with momentum to confirm a directional
   regime.

## Common pitfalls

- **Linearity, not slope.** A shallow but perfectly straight drift reads `±1`; a
  steep but choppy move reads lower. CTI rates *cleanliness*, not speed.
- **Window choice.** Short windows are jumpy; long windows lag regime changes.
- **Not autocorrelation.** It correlates with time, not with lagged price.

## References

Ehlers, J. F. (2020), *Correlation as a Trend Indicator* / *Cycle Analytics for
Traders*, Wiley.

## See also

- [Indicator-Autocorrelation](/Indicators/Indicator-Autocorrelation) — price vs. lagged price.
- [Indicator-RSquared](/Indicators/Indicator-RSquared) — goodness of linear fit.
- [Indicator-TrendStrengthIndex](/Indicators/Indicator-TrendStrengthIndex) — signed r² trend strength.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
