# Trendflex

> Ehlers' trend-sensitive companion to Reflex — averages how far the SuperSmoothed
> price sits above/below its recent values, then self-normalises.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Ehlers / Cycle (DSP) |
| Input type | `f64` |
| Output type | `f64` |
| Output range | self-normalised, roughly `[−3, +3]` |
| Default parameters | `(period = 20)` (Python) |
| Warmup period | `period + 1` |
| Interpretation | `> 0` uptrend, `< 0` downtrend; sign persistence = trend strength. |

## Formula

```
Filt      = SuperSmoother(price, period)
sum       = mean over i=1..period of ( Filt[0] − Filt[i] )
ms        = 0.04·sum² + 0.96·ms[−1]
Trendflex = sum / sqrt(ms)        (0 if ms == 0)
```

Trendflex measures the deviation of the SuperSmoothed price from its own past
values (not from a fitted line, as [`Reflex`](/Indicators/Indicator-Reflex)
does). That makes it trend-sensitive: it stays on one side of zero through a trend
and crosses zero in a range. The adaptive mean-square term keeps it near a `±3`
band on any instrument. Source:
`crates/wickra-core/src/indicators/trendflex.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `20` (Python) | `>= 1`      | `trendflex.rs:60` | Lookback for the prefilter and deviation average. `0` errors with `Error::PeriodZero`. |

The `period` getter returns the window; `value` returns the current output if
ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/trendflex.rs`:

```rust
use wickra::{Indicator, Trendflex};
// Trendflex: Input = f64, Output = f64
const _: fn(&mut Trendflex, f64) -> Option<f64> = <Trendflex as Indicator>::update;
```

An `f64` in, an `Option<f64>` out. The Python binding takes a scalar for `update`
and a 1-D numpy array for `batch` (NaN warmup); Node takes `update(value)` and
`batch(values[])`.

## Warmup

`warmup_period() == period + 1`. The SuperSmoother feeds a `period + 1`-deep
buffer before the first value (`first_emission_at_warmup_period` pins this).

## Edge cases

- **Flat input → 0.** A constant has no deviation from its past values
  (`constant_input_is_zero` pins this).
- **Uptrend → positive.** A steady rise keeps the reading above zero
  (`uptrend_is_positive` pins this).
- **Downtrend → negative.** A steady fall keeps it below zero
  (`downtrend_is_negative` pins this).
- **Non-finite input.** A NaN/∞ input is ignored and the last value returned
  (`ignores_non_finite` pins this).
- **Reset.** `t.reset()` clears the SuperSmoother, the buffer, the normaliser and
  the last value (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, Trendflex};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = Trendflex::new(10)?;
    // A clean uptrend stays positive.
    let out = t.batch(&(0..200).map(f64::from).collect::<Vec<_>>());
    println!("last > 0: {}", out.last().unwrap().unwrap() > 0.0);
    Ok(())
}
```

Output:

```
last > 0: true
```

### Python

```python
import numpy as np
import wickra as ta

t = ta.Trendflex(20)
x = np.arange(200, dtype=float)
print(t.batch(x)[-1] > 0)   # True (uptrend)
```

### Node

```javascript
const ta = require('wickra');

const t = new ta.Trendflex(20);
console.log('warmupPeriod:', t.warmupPeriod()); // 21
```

### Streaming

```rust
use wickra::{Indicator, Trendflex};

let mut t = Trendflex::new(20).unwrap();
let mut last = None;
for i in 0..120 {
    last = t.update(100.0 + f64::from(i));
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Trend gauge.** Persistent positive/negative readings confirm an up/down
   trend; rapid zero-crossings flag a range.
2. **Regime pair.** Run alongside [`Reflex`](/Indicators/Indicator-Reflex):
   Trendflex for trend strength, Reflex for cycle timing.
3. **Divergence.** Trendflex rolling toward zero while price extends warns the
   trend is losing push.

## Common pitfalls

- **Not bounded exactly.** The `±3` band is a target, not a clamp.
- **Confusing the pair.** Trendflex = trend, Reflex = cycle; do not swap their
  roles.
- **Period choice.** Longer `period` smooths the trend signal but adds lag.

## References

Ehlers, J. F. (2020), "Reflex: A New Zero-Lag Indicator", *Technical Analysis of
Stocks & Commodities*, February 2020 (Trendflex is introduced alongside Reflex).

## See also

- [Indicator-Reflex](/Indicators/Indicator-Reflex) — the cycle-sensitive sibling.
- [Indicator-SuperSmoother](/Indicators/Indicator-SuperSmoother) — the prefilter.
- [Indicator-TrendStrengthIndex](/Indicators/Indicator-TrendStrengthIndex) — OLS-based trend strength.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
