# PlusDi

> Wilder's Plus Directional Indicator (`PLUS_DI`) — `100 · smoothed(+DM) /
> smoothed(TR)`, the bullish half of the directional system behind `Adx`.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trend & Directional |
| Input type | `Candle` (uses `high`, `low`, `close`) |
| Output type | `f64` |
| Output range | `[0, 100]` |
| Default parameters | `period` is required |
| Warmup period | `period + 1` — the first candle only seeds the previous close (first value at candle index `period`) |
| Interpretation | Strength of upward directional movement, normalised by true range; `> −DI` marks an up-trend. |

## Formula

For each bar, with Wilder-smoothing over `period`:

```
+DI = 100 · smoothed(+DM) / smoothed(TR)
```

where `+DM` is the [plus directional movement](/Indicators/Indicator-PlusDm) and `TR` is the
true range. Both running sums are seeded over the first `period` raw values, then
advanced by the Wilder recursion `smoothed − smoothed / period + raw`. Dividing
`+DM` by true range normalises it to a `0–100` scale that is comparable across
instruments. When the smoothed true range is zero (a perfectly flat market) the
indicator returns `0`. See `crates/wickra-core/src/indicators/plus_di.rs`.

## Parameters

| Name | Type | Default | Valid range | Description | Source |
|------|------|---------|-------------|-------------|--------|
| `period` | `usize` | none | `>= 1` | Wilder smoothing length (Wilder's default is `14`). `period = 0` errors with `Error::PeriodZero`. | `plus_di.rs:52` |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/plus_di.rs`:

```rust
use wickra::{Indicator, PlusDi, Candle};
// PlusDi: Input = Candle, Output = f64
const _: fn(&mut PlusDi, Candle) -> Option<f64> = <PlusDi as Indicator>::update;
```

`PlusDi` is a **candle-input** indicator that reads `high`, `low` and `close`
(the last for true range). In Python the streaming `update` accepts a candle; the
batch helper takes `high`, `low`, `close` numpy arrays and returns a 1-D
`array.array('d')` (`NaN` for warmup). Node and WASM expose `update(high, low,
close)` and the matching `batch`.

## Warmup

`PlusDi::new(period).warmup_period() == period + 1` (the `accessors_report_config`
unit test pins `warmup_period() == 8` for `period = 7`). Because directional
movement and true range both need the previous bar, the **first emitted value**
appears at candle index `period`. The `uptrend_drives_plus_di_high` test pins
`out[0] == None` and `out[3].is_some()` for `period = 3`.

## Edge cases

- **Flat market.** With no range and no movement the smoothed true range is
  zero, so `+DI` is returned as `0` rather than `NaN`. The unit test
  `flat_market_returns_zero` pins this.
- **Strong up-trend.** In a clean up-trend `+DI` is large and bounded by `100`.
  The unit test `uptrend_drives_plus_di_high` pins `0 < last <= 100`.
- **Zero period.** `PlusDi::new(0)` returns `Err(Error::PeriodZero)`. The unit
  test `rejects_zero_period` pins this.
- **Reset.** `di.reset()` restores the initial state. The unit test
  `reset_restores_initial_state` pins this.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, PlusDi};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Each bar shifts up by 2 with a constant range of 4: +DM = 2, TR = 4 per bar.
    let c = |h: f64, l: f64, cl: f64| Candle::new(cl, h, l, cl, 1.0, 0).unwrap();
    let candles: Vec<Candle> = (0..5)
        .map(|i| c(102.0 + 2.0 * i as f64, 98.0 + 2.0 * i as f64, 101.0 + 2.0 * i as f64))
        .collect();
    let mut di = PlusDi::new(3)?;
    println!("{:?}", di.batch(&candles));
    Ok(())
}
```

Output:

```
[None, None, None, Some(50.0), Some(50.0)]
```

With a steady `+DM = 2` and `TR = 4` per bar, the seed gives
`100 · (3·2) / (3·4) = 50`, and the Wilder step holds it there. (The
`uptrend_drives_plus_di_high` test pins the qualitative `0 < +DI <= 100`
contract.)

### Python

```python
import numpy as np
import wickra as ta

di = ta.PLUS_DI(3)
i = np.arange(5.0)
print(di.batch(102 + 2 * i, 98 + 2 * i, 101 + 2 * i))
```

Output:

```
[nan nan nan 50. 50.]
```

### Node

```javascript
const ta = require('wickra');
const di = new ta.PLUS_DI(3);
for (let i = 0; i < 5; i++) console.log(di.update(102 + 2 * i, 98 + 2 * i, 101 + 2 * i));
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

`+DI` is the bullish leg of Wilder's directional system. Read it relative to
[`MinusDi`](/Indicators/Indicator-MinusDi): `+DI > −DI` marks an up-trending regime, and the
two lines crossing is a classic trend-change signal. The spread between them,
normalised, is [`Dx`](/Indicators/Indicator-Dx); the Wilder average of `DX` is
[`Adx`](/Indicators/Indicator-Adx), which measures trend *strength* regardless of direction.

Use `+DI`/`−DI` crossings for direction and `Adx` for whether the trend is strong
enough to trade.

## Common pitfalls

- **Reading `+DI` alone.** A high `+DI` is only meaningful against `−DI` and
  `Adx`; in a choppy market both DIs can be moderate with no tradeable trend.
- **Period mismatch with `Adx`.** `PlusDi`, `MinusDi` and `Adx` should share the
  same `period` to be comparable; mixing lengths breaks the crossover logic.

## References

J. Welles Wilder Jr., *New Concepts in Technical Trading Systems* (1978),
matching TA-Lib's `PLUS_DI`.

## See also

- [Indicator-MinusDi](/Indicators/Indicator-MinusDi) — the bearish counterpart.
- [Indicator-PlusDm](/Indicators/Indicator-PlusDm) — the un-normalised numerator.
- [Indicator-Dx](/Indicators/Indicator-Dx) / [Indicator-Adx](/Indicators/Indicator-Adx) — the spread and its smoothed average.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
