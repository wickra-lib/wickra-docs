# MinusDi

> Wilder's Minus Directional Indicator (`MINUS_DI`) — `100 · smoothed(−DM) /
> smoothed(TR)`, the bearish half of the directional system behind `Adx`.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trend & Directional |
| Input type | `Candle` (uses `high`, `low`, `close`) |
| Output type | `f64` |
| Output range | `[0, 100]` |
| Default parameters | `period` is required |
| Warmup period | `period + 1` — the first candle only seeds the previous close (first value at candle index `period`) |
| Interpretation | Strength of downward directional movement, normalised by true range; `> +DI` marks a down-trend. |

## Formula

For each bar, with Wilder-smoothing over `period`:

```
−DI = 100 · smoothed(−DM) / smoothed(TR)
```

where `−DM` is the [minus directional movement](/Indicators/Indicator-MinusDm) and `TR` is
the true range. Both running sums are seeded over the first `period` raw values,
then advanced by the Wilder recursion `smoothed − smoothed / period + raw`.
Dividing `−DM` by true range normalises it to a `0–100` scale comparable across
instruments. When the smoothed true range is zero (a perfectly flat market) the
indicator returns `0`. See `crates/wickra-core/src/indicators/minus_di.rs`.

## Parameters

| Name | Type | Default | Valid range | Description | Source |
|------|------|---------|-------------|-------------|--------|
| `period` | `usize` | none | `>= 1` | Wilder smoothing length (Wilder's default is `14`). `period = 0` errors with `Error::PeriodZero`. | `minus_di.rs:52` |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/minus_di.rs`:

```rust
use wickra::{Indicator, MinusDi, Candle};
// MinusDi: Input = Candle, Output = f64
const _: fn(&mut MinusDi, Candle) -> Option<f64> = <MinusDi as Indicator>::update;
```

`MinusDi` is a **candle-input** indicator that reads `high`, `low` and `close`.
In Python the streaming `update` accepts a candle; the batch helper takes `high`,
`low`, `close` numpy arrays and returns a 1-D `numpy.ndarray` (`NaN` for warmup).
Node and WASM expose `update(high, low, close)` and the matching `batch`.

## Warmup

`MinusDi::new(period).warmup_period() == period + 1` (the `accessors_report_config`
unit test pins `warmup_period() == 8` for `period = 7`). Because directional
movement and true range both need the previous bar, the **first emitted value**
appears at candle index `period`. The `downtrend_drives_minus_di_high` test pins
`out[0] == None` and `out[3].is_some()` for `period = 3`.

## Edge cases

- **Flat market.** With no range and no movement the smoothed true range is
  zero, so `−DI` is returned as `0`. The unit test `flat_market_returns_zero`
  pins this.
- **Strong down-trend.** In a clean down-trend `−DI` is large and bounded by
  `100`. The unit test `downtrend_drives_minus_di_high` pins
  `0 < last <= 100`.
- **Zero period.** `MinusDi::new(0)` returns `Err(Error::PeriodZero)`. The unit
  test `rejects_zero_period` pins this.
- **Reset.** `di.reset()` restores the initial state. The unit test
  `reset_restores_initial_state` pins this.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, MinusDi};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Each bar shifts down by 2 with a constant range of 4: −DM = 2, TR = 4 per bar.
    let c = |h: f64, l: f64, cl: f64| Candle::new(cl, h, l, cl, 1.0, 0).unwrap();
    let candles: Vec<Candle> = (0..5)
        .map(|i| c(102.0 - 2.0 * i as f64, 98.0 - 2.0 * i as f64, 99.0 - 2.0 * i as f64))
        .collect();
    let mut di = MinusDi::new(3)?;
    println!("{:?}", di.batch(&candles));
    Ok(())
}
```

Output:

```
[None, None, None, Some(50.0), Some(50.0)]
```

With a steady `−DM = 2` and `TR = 4` per bar, the seed gives
`100 · (3·2) / (3·4) = 50`, held there by the Wilder step. (The
`downtrend_drives_minus_di_high` test pins the qualitative `0 < −DI <= 100`
contract.)

### Python

```python
import numpy as np
import wickra as ta

di = ta.MINUS_DI(3)
i = np.arange(5.0)
print(di.batch(102 - 2 * i, 98 - 2 * i, 99 - 2 * i))
```

Output:

```
[nan nan nan 50. 50.]
```

### Node

```javascript
const ta = require('wickra');
const di = new ta.MINUS_DI(3);
for (let i = 0; i < 5; i++) console.log(di.update(102 - 2 * i, 98 - 2 * i, 99 - 2 * i));
```

Output:

```
null
null
null
50
50
```

## Interpretation

`−DI` is the bearish leg of Wilder's directional system. Read it relative to
[`PlusDi`](/Indicators/Indicator-PlusDi): `−DI > +DI` marks a down-trending regime, and a
`−DI`/`+DI` cross is a trend-change signal. The normalised spread between the two
is [`Dx`](/Indicators/Indicator-Dx); its Wilder average is [`Adx`](/Indicators/Indicator-Adx), which
gauges trend strength without direction.

## Common pitfalls

- **Sign confusion.** `−DI` is a **non-negative** magnitude on a `0–100` scale;
  the "minus" labels the *direction* it measures, not the value's sign.
- **Reading `−DI` alone.** It is only meaningful against `+DI` and `Adx`.

## References

J. Welles Wilder Jr., *New Concepts in Technical Trading Systems* (1978),
matching TA-Lib's `MINUS_DI`.

## See also

- [Indicator-PlusDi](/Indicators/Indicator-PlusDi) — the bullish counterpart.
- [Indicator-MinusDm](/Indicators/Indicator-MinusDm) — the un-normalised numerator.
- [Indicator-Dx](/Indicators/Indicator-Dx) / [Indicator-Adx](/Indicators/Indicator-Adx) — the spread and its smoothed average.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
