# MidPoint

> Midpoint (`MIDPOINT`) — the average of the highest and lowest value of a
> single scalar series over the last `period` points.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Statistics |
| Input type | `f64` (single scalar stream, typically the close) |
| Output type | `f64` |
| Output range | unbounded; bounded by the input's own min/max over the window |
| Default parameters | `period` is required |
| Warmup period | `period` |
| Interpretation | The centre of the value's recent range — a slow, range-following reference level. |

## Formula

For `t >= period - 1` (after warmup):

```
MIDPOINT = (highest(value, period) + lowest(value, period)) / 2
```

where `highest` / `lowest` are the maximum and minimum of the last `period`
inputs. Where [`MidPrice`](Indicator-MidPrice) takes its extremes from a candle's
high/low, `MIDPOINT` works on one scalar stream and takes the max and min of
that stream over the window. See
`crates/wickra-core/src/indicators/mid_point.rs`.

## Parameters

| Name | Type | Default | Valid range | Description | Source |
|------|------|---------|-------------|-------------|--------|
| `period` | `usize` | none | `>= 1` | Window length over which the min and max are taken. `period = 0` errors with `Error::PeriodZero`. | `mid_point.rs:42` |

(The Python class `wickra.MidPoint(period)` requires the period explicitly.)

## Inputs / Outputs

From `crates/wickra-core/src/indicators/mid_point.rs`:

```rust
use wickra::{Indicator, MidPoint};
// MidPoint: Input = f64, Output = f64
const _: fn(&mut MidPoint, f64) -> Option<f64> = <MidPoint as Indicator>::update;
```

Python streams as `float | None`, batches as a 1-D `numpy.ndarray` (`NaN` for
warmup). Node streams as `number | null`, batches as `Array<number>` with `NaN`
placeholders.

## Warmup

`MidPoint::new(period).warmup_period() == period`. The first value is emitted
once `period` points have filled the rolling window; before that `update`
returns `None`. The unit tests `accessors_report_config` (pins
`warmup_period() == 7`) and `averages_window_min_and_max` (first two of three
inputs return `None`) pin this contract.

## Edge cases

- **Sliding window drops old extremes.** Once a spike leaves the trailing
  window the midpoint falls back to the remaining range. The unit test
  `window_slides_and_drops_old_values` pins this (a `30` spike followed by
  `{8, 12, 10}` returns `(12 + 8) / 2 = 10`).
- **Zero period.** `MidPoint::new(0)` returns `Err(Error::PeriodZero)`. The
  unit test `rejects_zero_period` pins this.
- **Reset.** `mp.reset()` clears the rolling window; the next `update` starts a
  fresh warmup countdown. The unit test `reset_clears_state` pins this.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, MidPoint};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut mp = MidPoint::new(3)?;
    let out: Vec<Option<f64>> = mp.batch(&[8.0, 12.0, 10.0]);
    println!("{:?}", out);
    Ok(())
}
```

Output:

```
[None, None, Some(10.0)]
```

Window `{8, 12, 10}`: highest `12`, lowest `8`, midpoint `(12 + 8) / 2 = 10`.
This matches the `averages_window_min_and_max` unit test in
`crates/wickra-core/src/indicators/mid_point.rs`.

### Python

```python
import numpy as np
import wickra as ta

mp = ta.MidPoint(3)
print(mp.batch(np.array([8.0, 12.0, 10.0])))
```

Output:

```
[nan nan 10.]
```

### Node

```javascript
const ta = require('wickra');
const mp = new ta.MidPoint(3);
for (const x of [8, 12, 10]) console.log(x, '->', mp.update(x));
```

Output:

```
8 -> null
12 -> null
10 -> 10
```

## Interpretation

`MidPoint` is a range-following reference level: it sits exactly halfway between
the highest and lowest of the recent series, so it lags both directional moves
and only shifts when a new extreme enters or an old one leaves the window. Read
price-vs-midpoint as a coarse regime gauge — sustained trading above the
midpoint marks the upper half of the recent range.

It is the scalar twin of [`MidPrice`](Indicator-MidPrice) (which reads candle
high/low) and is numerically the centre line of a [`Donchian`](Indicator-Donchian)
channel built on the same stream.

## Common pitfalls

- **Confusing it with a moving average.** `MidPoint` is driven only by the two
  extremes of the window; the values in between are ignored. A single outlier
  moves it as much as a sustained trend would.
- **Confusing it with `MidPrice`.** `MidPoint` consumes a scalar stream;
  `MidPrice` consumes candles and uses their high/low. They agree only when the
  scalar stream happens to equal the per-bar high/low extremes.

## References

The Midpoint `(max + min) / 2` over a window is TA-Lib's `MIDPOINT` function.

## See also

- [Indicator-MidPrice](Indicator-MidPrice) — the candle-input twin over high/low.
- [Indicator-Donchian](Indicator-Donchian) — the channel whose centre line this is.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
