# RollingMinMaxScaler

> The streaming `MinMaxScaler` — maps the current value onto `[0, 1]` against the
> min and max of the trailing window.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Statistics |
| Input type | `f64` |
| Output type | `f64` |
| Output range | `[0, 1]` (0 = window low, 1 = window high) |
| Default parameters | `(period = 14)` (Python) |
| Warmup period | `period` |
| Interpretation | Position of the latest value within its recent range. |

## Formula

```
scaled = (x − min(window)) / (max(window) − min(window))
```

A sliding-window version of scikit-learn's `MinMaxScaler`: `0` is the lowest value
in the window, `1` the highest, `0.5` the midpoint. It is the normalisation at the
heart of the Stochastic %K and a convenient way to bound any series for a model
input. Because it scales to the window's own range, the output is comparable across
instruments and price levels. Source:
`crates/wickra-core/src/indicators/rolling_min_max_scaler.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `14` (Python) | `>= 2`      | `rolling_min_max_scaler.rs:53` | Rolling window length. `0` errors with `Error::PeriodZero`; `< 2` errors with `Error::InvalidPeriod`. |

The `period` getter returns the window; `value` returns the current output if
ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/rolling_min_max_scaler.rs`:

```rust
use wickra::{Indicator, RollingMinMaxScaler};
// RollingMinMaxScaler: Input = f64, Output = f64
const _: fn(&mut RollingMinMaxScaler, f64) -> Option<f64> =
    <RollingMinMaxScaler as Indicator>::update;
```

An `f64` in, an `Option<f64>` out. The Python binding takes a scalar for `update`
and a 1-D numpy array for `batch` (NaN warmup); Node takes `update(value)` and
`batch(values[])`.

## Warmup

`warmup_period() == period`. The first value lands once the window is full
(`first_emission_at_warmup_period` pins this).

## Edge cases

- **Window high → 1.** The current value being the window maximum scales to `1`
  (`highest_in_window_is_one` pins this).
- **Window low → 0.** Being the window minimum scales to `0`
  (`lowest_in_window_is_zero` pins this).
- **Midpoint → 0.5.** A value at the centre of the range scales to `0.5`
  (`midpoint_is_half` pins this).
- **Flat window → 0.5.** A zero-range window returns the neutral `0.5` rather than
  dividing by zero (`flat_window_is_half` pins this).
- **Bounded.** The reading stays within `[0, 1]` (`output_in_range` pins this).
- **Non-finite input.** A NaN/∞ input is ignored and the last value returned
  (`ignores_non_finite` pins this).
- **Reset.** `s.reset()` clears the window and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, RollingMinMaxScaler};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut s = RollingMinMaxScaler::new(4)?;
    // The last value is the window maximum -> 1.0.
    let out = s.batch(&[1.0, 2.0, 3.0, 4.0]);
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

s = ta.ROLLINGMINMAX(14)
x = np.sin(np.arange(200) * 0.3) * 10.0
print(s.batch(x)[-1])   # in [0, 1]
```

### Node

```javascript
const ta = require('wickra');

const s = new ta.ROLLINGMINMAX(4);
console.log(s.batch([1, 2, 3, 4]).at(-1)); // 1
```

### Streaming

```rust
use wickra::{Indicator, RollingMinMaxScaler};

let mut s = RollingMinMaxScaler::new(14).unwrap();
let mut last = None;
for i in 0..40 {
    last = s.update(100.0 + (f64::from(i) * 0.3).sin() * 5.0);
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Range position.** Read it as "where in its recent range is price?" — high
   readings are near resistance, low near support.
2. **Feature normalisation.** Bound any raw indicator into `[0, 1]` before feeding
   a model that expects scaled inputs.
3. **Stochastic core.** Apply it to close over a window and you have %K; smooth the
   result for %D.

## Common pitfalls

- **Window-relative, not absolute.** A reading of `1.0` only means "highest in the
  last `period`", not an all-time high.
- **Flat-window neutral.** A dead-flat window returns `0.5`; do not interpret that
  as a midrange breakout.
- **Lookahead-free.** The scaler uses only the trailing window — never the full
  series — so it is safe for streaming/back-test parity.

## References

The min-max normalisation is standard; see Pedregosa et al. (2011),
*scikit-learn*, `MinMaxScaler`. Its windowed form underlies Lane's Stochastic
oscillator (Lane, G., 1984).

## See also

- [Indicator-Stochastic](/Indicators/Indicator-Stochastic) — %K/%D built on this normalisation.
- [Indicator-RollingPercentileRank](/Indicators/Indicator-RollingPercentileRank) — rank within the window.
- [Indicator-ZScore](/Indicators/Indicator-ZScore) — standardisation by mean and σ.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
