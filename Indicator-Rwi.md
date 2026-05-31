# RWI

> Mike Poulos' Random Walk Index — measures how many "random-walk
> standard deviations" the current move is away from noise. Higher RWI means
> the directional move is statistically more significant than a random walk.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trend & Directional |
| Input type | `Candle` (uses `high`, `low`, `close`) |
| Output type | `RwiOutput { high, low }` |
| Output range | `>= 0` (each line) |
| Default parameters | `period = 14` (must be `>= 2`) |
| Warmup period | `period` |
| Interpretation | `RWI_High > 1` and dominant = real uptrend; mirror for downtrend; both `< 1` = ranging. |

## Formula

For each lookback `i ∈ [2, period]`:

```
RWI_High_t(i) = (high_t       − low_{t-i+1})  / (ATR_i(t) · sqrt(i))
RWI_Low_t(i)  = (high_{t-i+1} − low_t)        / (ATR_i(t) · sqrt(i))
```

where `ATR_i(t)` is the simple mean of true range over the most recent `i`
bars. The per-bar emission is the maximum across all lookbacks:

```
RWI_High_t = max_{i ∈ [2, period]} RWI_High_t(i)
RWI_Low_t  = max_{i ∈ [2, period]} RWI_Low_t(i)
```

The `sqrt(i)` denominator comes from the expectation that a random walk of
`i` steps drifts a distance proportional to `sqrt(i)`; dividing the actual
displacement by it measures how far the real move exceeds random noise.

## Parameters

| Name     | Type    | Default | Constraint | Source |
|----------|---------|---------|------------|--------|
| `period` | `usize` | `14`    | `>= 2`     | `Rwi::new` (`rwi.rs:78`) |

`period == 0` returns [`Error::PeriodZero`]; `period < 2` returns
[`Error::InvalidPeriod`] (lookback `i = 2` is the shortest meaningful
comparison). Python default comes from `#[pyo3(signature = (period=14))]`;
the Node constructor takes `period` explicitly. The public class is `RWI` in
both bindings.

## Inputs / Outputs

```rust
use wickra::{Indicator, Rwi, Candle, RwiOutput};
// Rwi: Input = Candle, Output = RwiOutput
const _: fn(&mut Rwi, Candle) -> Option<RwiOutput> = <Rwi as Indicator>::update;
```

- **Python.** `update(candle)` returns `(high, low)` or `None`;
  `batch(high, low, close)` returns an `(n, 2)` `np.ndarray` with columns
  `[high, low]`; warmup rows are `NaN`.
- **Node.** `update(high, low, close)` returns a `{ high, low }` object or
  `null`; `batch(high, low, close)` returns a flat `Array<number>` of length
  `2n`, interleaved `[high0, low0, …]`.

## Warmup

`warmup_period()` returns `period`: the rolling window must hold `period`
candles before the lookbacks `i ∈ [2, period]` can be scanned, so the first
output lands on candle `period` (index `period − 1`). Pinned by
`first_emission_at_warmup_period`.

## Edge cases

- **Flat market.** Zero ATR short-circuits every lookback (denominator guard),
  so RWI reports `(0, 0)` (test `constant_series_yields_zero_outputs`).
- **Pure uptrend.** `RWI_High` dominates `RWI_Low` and exceeds `1` (test
  `pure_uptrend_high_dominates_low`); the downtrend mirror holds (test
  `pure_downtrend_low_dominates_high`).
- **Non-negative & finite.** Both lines are always `>= 0` and finite (test
  `outputs_non_negative`).
- **Reset.** `reset()` clears the candle and true-range windows.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, Rwi};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..40)
        .map(|i| {
            let base = 100.0 + f64::from(i) * 2.0; // clean uptrend
            Candle::new(base, base + 1.0, base - 0.5, base + 0.5, 1.0, i64::from(i)).unwrap()
        })
        .collect();
    let mut r = Rwi::new(14)?;
    if let Some(o) = r.batch(&candles).into_iter().flatten().last() {
        println!("high={:.3} low={:.3}", o.high, o.low); // high >> low on an uptrend
    }
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

r = ta.RWI(14)
out = r.batch(high, low, close)  # shape (n, 2): [high, low]
rwi_high, rwi_low = out[:, 0], out[:, 1]
```

### Node

```javascript
const ta = require('wickra');
const r = new ta.RWI(14);
const o = r.update(102, 98, 101); // high, low, close → { high, low } or null
```

## Interpretation

RWI asks, for the strongest lookback, "is this move bigger than a random walk
would produce?":

1. **Trend confirmation.** `RWI_High` above `RWI_Low` *and* above `1` marks a
   statistically real uptrend; the mirror marks a downtrend. Poulos' strong-
   trend threshold is `> 2`.
2. **Range filter.** Both lines below `1` mean neither direction beats noise —
   treat the market as ranging and suppress trend-following signals.

## Common pitfalls

- **Reading the two lines as a single oscillator.** They are independent
  bull/bear strengths; the *relationship* (which is larger, and whether it
  clears `1`) is the signal, not either value alone.
- **Using `period = 1`.** The shortest lookback is `i = 2`, so the
  constructor rejects it.

## References

- E. Michael Poulos, "Of Trends and Random Walks", *Technical Analysis of
  Stocks & Commodities*, February 1991.

## See also

- [Adx](Indicator-Adx) — smoothed trend-strength gauge.
- [Adxr](Indicator-Adxr) — averaged ADX.
- [ChoppinessIndex](Indicator-ChoppinessIndex) — log-scaled trend-vs-range
  complement.
