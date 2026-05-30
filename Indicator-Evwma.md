# EVWMA

> Elastic Volume-Weighted Moving Average — Fries' "elastic" recurrence whose
> smoothing weight is the bar's volume relative to the running window-volume.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Moving Averages |
| Input type | `Candle` (uses `close` and `volume`) |
| Output type | `f64` |
| Output range | unbounded; tracks the input price scale |
| Default parameters | `period = 20` |
| Warmup period | `period` |
| Interpretation | Volume-mass adaptive average: dominant-volume bars pull the average toward their close. |

## Formula

```
V_sum_t  = Σ volume_i over the last `period` candles
EVWMA_t  = ((V_sum_t − volume_t) · EVWMA_{t-1} + volume_t · close_t) / V_sum_t
```

A bar whose volume is small compared to `V_sum` barely moves the average; a
bar whose volume dominates the window pulls EVWMA strongly toward that bar's
close. Unlike [Vwma](Indicator-Vwma) (a per-bar weighted *mean*), EVWMA's
recurrence makes the weighting *elastic* over time — past bars keep mattering
through the running `EVWMA_{t-1}` term.

## Parameters

| Name     | Type    | Default | Constraint | Source |
|----------|---------|---------|------------|--------|
| `period` | `usize` | `20`    | `>= 1`     | `Evwma::new` (`evwma.rs:56`) |

`period == 0` returns [`Error::PeriodZero`]. Python default comes from
`#[pyo3(signature = (period=20))]`; the Node constructor takes `period`
explicitly. The public class is `EVWMA` in both bindings.

## Inputs / Outputs

```rust
impl Indicator for Evwma {
    type Input  = Candle;
    type Output = f64;
    fn update(&mut self, candle: Candle) -> Option<f64>;
}
```

Only `close` and `volume` are read.

- **Python.** `update(candle)` returns `float | None`; `batch(close, volume)`
  returns a 1-D `float64` `np.ndarray` with `NaN` warmup.
- **Node.** `update(close, volume)` returns `number | null`;
  `batch(close, volume)` returns an `Array<number>` with `NaN` warmup.

## Warmup

`warmup_period()` returns `period`. The volume window must fill before the
recurrence is defined, so the first output lands on candle `period` (index
`period − 1`), seeded with that candle's close. Pinned by
`warmup_emits_first_value_at_period`.

## Edge cases

- **Constant close.** `((V_sum − v)·c + v·c) / V_sum = c` for any volume, so a
  flat close is reproduced exactly regardless of the volume distribution
  (test `constant_series_yields_the_constant`).
- **Zero-volume window.** If every bar in the window has `volume == 0`,
  `V_sum = 0` and the recurrence is undefined; EVWMA seeds to the first such
  close and holds it until non-zero volume arrives (test
  `zero_volume_window_holds_value`).
- **Reference.** EVWMA(2) on `(10,1), (20,3), (30,1)` → `None`, `20.0`, `22.5`
  (test `reference_value_period_2`).
- **Reset.** `reset()` clears the window, volume sum and running value.

## Examples

### Rust

```rust
use wickra::{Candle, Evwma, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // EVWMA(2): (close, volume) = (10, 1), (20, 3), (30, 1).
    let mk = |c: f64, v: f64, ts: i64| Candle::new(c, c, c, c, v, ts).unwrap();
    let mut e = Evwma::new(2)?;
    println!("{:?}", e.update(mk(10.0, 1.0, 0))); // None  (window not full)
    println!("{:?}", e.update(mk(20.0, 3.0, 1))); // Some(20.0)
    println!("{:?}", e.update(mk(30.0, 1.0, 2))); // Some(22.5)
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

e = ta.EVWMA(2)
close  = np.array([10.0, 20.0, 30.0])
volume = np.array([1.0, 3.0, 1.0])
print(e.batch(close, volume))  # [nan 20.  22.5]
```

### Node

```javascript
const ta = require('wickra');
const e = new ta.EVWMA(2);
e.update(10, 1);
console.log(e.update(20, 3)); // 20
console.log(e.update(30, 1)); // 22.5
```

## Interpretation

EVWMA folds participation into the average: it advances toward the latest
close in proportion to how much of the window's volume that bar carried.

1. **Volume-confirmed trend.** EVWMA only moves decisively when the move
   comes with volume — a high-volume breakout pulls it sharply, a low-volume
   drift barely shifts it.
2. **As a dynamic support/resistance.** Because heavy-volume bars anchor it,
   EVWMA tends to track the "fair value" the bulk of traded volume agreed on,
   making it a natural mean-reversion reference.

## Common pitfalls

- **Comparing it to [Vwma](Indicator-Vwma) one-for-one.** VWMA is a windowed
  weighted *mean*; EVWMA is a *recurrence* with memory through its prior
  value — they diverge whenever volume is uneven.
- **Feeding zero-volume synthetic bars.** They contribute nothing; on an
  all-zero-volume window EVWMA simply holds.

## References

- Christian P. Fries, "Elastic Volume Weighted Moving Average", *Wilmott
  Magazine*, 2001.

## See also

- [Vwma](Indicator-Vwma) — windowed volume-weighted mean.
- [Vwap](Indicator-Vwap) — cumulative volume-weighted average price.
- [Sma](Indicator-Sma) / [Ema](Indicator-Ema) — volume-agnostic baselines.
