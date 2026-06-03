# MidPrice

> Midpoint Price (`MIDPRICE`) — the average of the highest high and the lowest
> low over the last `period` candles.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Statistics |
| Input type | `Candle` (uses `high`, `low`) |
| Output type | `f64` |
| Output range | unbounded; bounded by the window's high/low extremes |
| Default parameters | `period` is required |
| Warmup period | `period` |
| Interpretation | The centre of the recent high/low range — the Donchian channel centre line as a standalone scalar. |

## Formula

For `t >= period - 1` (after warmup):

```
MIDPRICE = (highest(high, period) + lowest(low, period)) / 2
```

Unlike [`MedianPrice`](Indicator-MedianPrice), which averages a single bar's own
high and low, `MIDPRICE` averages the **window** extremes — the highest high and
lowest low across the last `period` candles. It is numerically the centre line
of [`Donchian`](Indicator-Donchian) channels, exposed as a standalone scalar for
TA-Lib parity. See `crates/wickra-core/src/indicators/mid_price.rs`.

## Parameters

| Name | Type | Default | Valid range | Description | Source |
|------|------|---------|-------------|-------------|--------|
| `period` | `usize` | none | `>= 1` | Number of candles over which the highest high and lowest low are taken. `period = 0` errors with `Error::PeriodZero`. | `mid_price.rs:47` |

(The Python class `wickra.MidPrice(period)` requires the period explicitly.)

## Inputs / Outputs

From `crates/wickra-core/src/indicators/mid_price.rs`:

```rust
use wickra::{Indicator, MidPrice, Candle};
// MidPrice: Input = Candle, Output = f64
const _: fn(&mut MidPrice, Candle) -> Option<f64> = <MidPrice as Indicator>::update;
```

`MidPrice` is a **candle-input** indicator that reads `high` and `low`. In
Python the streaming `update` accepts a candle (dict or tuple); the batch helper
takes `high`, `low`, `close` numpy arrays and returns a 1-D `numpy.ndarray`
(`NaN` for warmup). Node and WASM expose `update(open, high, low, close)` and the
matching `batch`.

## Warmup

`MidPrice::new(period).warmup_period() == period`. The first value is emitted
once `period` candles have filled the rolling window. The unit tests
`accessors_report_config` (pins `warmup_period() == 7`) and
`averages_window_extremes` (first two of three candles return `None`) pin this
contract.

## Edge cases

- **Sliding window drops old extremes.** Once a spike candle leaves the trailing
  window the midprice falls back to the remaining range. The unit test
  `window_slides_and_drops_old_extremes` pins this.
- **Zero period.** `MidPrice::new(0)` returns `Err(Error::PeriodZero)`. The unit
  test `rejects_zero_period` pins this.
- **Reset.** `mp.reset()` clears the candle window; the next `update` starts a
  fresh warmup countdown. The unit test `reset_clears_state` pins this.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, MidPrice};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let c = |h: f64, l: f64, cl: f64| Candle::new(cl, h, l, cl, 1.0, 0).unwrap();
    let mut mp = MidPrice::new(3)?;
    let out: Vec<Option<f64>> = mp.batch(&[c(12.0, 8.0, 10.0), c(14.0, 9.0, 11.0), c(16.0, 10.0, 12.0)]);
    println!("{:?}", out);
    Ok(())
}
```

Output:

```
[None, None, Some(12.0)]
```

Window highs `{12, 14, 16}`, lows `{8, 9, 10}`: highest `16`, lowest `8`,
midprice `(16 + 8) / 2 = 12`. This matches the `averages_window_extremes` unit
test in `crates/wickra-core/src/indicators/mid_price.rs`.

### Python

```python
import numpy as np
import wickra as ta

mp = ta.MidPrice(3)
high  = np.array([12.0, 14.0, 16.0])
low   = np.array([8.0,  9.0,  10.0])
close = np.array([10.0, 11.0, 12.0])
print(mp.batch(high, low, close))
```

Output:

```
[nan nan 12.]
```

### Node

```javascript
const ta = require('wickra');
const mp = new ta.MidPrice(3);
const bars = [[12, 8, 10], [14, 9, 11], [16, 10, 12]];
for (const [h, l, c] of bars) console.log(mp.update(c, h, l, c));
```

Output:

```
null
null
12
```

## Interpretation

`MidPrice` tracks the centre of the recent trading range. Because it depends
only on the window's highest high and lowest low, it stays flat inside a range
and steps only when a new extreme prints or an old one rolls off — exactly the
behaviour of a [`Donchian`](Indicator-Donchian) channel midline. Use it as a
slow mean-reversion anchor or as the reference a breakout is measured against.

Prefer [`MedianPrice`](Indicator-MedianPrice) when you want each bar's own
`(H + L) / 2`; prefer [`MidPoint`](Indicator-MidPoint) when your input is a
single scalar stream rather than candles.

## Common pitfalls

- **Confusing window extremes with per-bar extremes.** `MidPrice` does **not**
  average one bar's high and low — it averages the highest high and lowest low
  across the whole window. For `period = 1` they coincide; for larger windows
  they do not.
- **Reading it as a moving average.** Only the two extreme candles in the window
  matter; everything between them is ignored.

## References

The Midpoint Price `(highest high + lowest low) / 2` is TA-Lib's `MIDPRICE`
function and the standard Donchian channel centre line.

## See also

- [Indicator-MidPoint](Indicator-MidPoint) — the scalar-input twin.
- [Indicator-MedianPrice](Indicator-MedianPrice) — per-bar `(H + L) / 2`.
- [Indicator-Donchian](Indicator-Donchian) — the channel whose centre line this is.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
