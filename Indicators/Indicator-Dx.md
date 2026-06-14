# Dx

> Wilder's Directional Movement Index (`DX`) — `100 · |+DI − −DI| / (+DI + −DI)`,
> the un-smoothed precursor to `Adx`.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trend & Directional |
| Input type | `Candle` (uses `high`, `low`, `close`) |
| Output type | `f64` |
| Output range | `[0, 100]` |
| Default parameters | `period` is required |
| Warmup period | `period` (first value at candle index `period`) |
| Interpretation | How one-sided the directional system is: high = strong trend, near zero = balanced range. |

## Formula

For each bar:

```
DX = 100 · |+DI − −DI| / (+DI + −DI)
```

where [`+DI`](/Indicators/Indicator-PlusDi) and [`−DI`](/Indicators/Indicator-MinusDi) are derived from
Wilder-smoothed `+DM`, `−DM` and true range over `period` bars. `DX` is the
*un-smoothed* directional index; [`Adx`](/Indicators/Indicator-Adx) is its Wilder average.
`DX` ranges over `[0, 100]`: high when one side of the directional system clearly
dominates (a strong trend) and near zero when `+DI` and `−DI` are balanced (a
range). When both directional indicators are zero — a perfectly flat market —
the index returns `0`. See `crates/wickra-core/src/indicators/dx.rs`.

## Parameters

| Name | Type | Default | Valid range | Description | Source |
|------|------|---------|-------------|-------------|--------|
| `period` | `usize` | none | `>= 1` | Wilder smoothing length for the underlying directional indicators (Wilder's default is `14`). `period = 0` errors with `Error::PeriodZero`. | `dx.rs:52` |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/dx.rs`:

```rust
use wickra::{Indicator, Dx, Candle};
// Dx: Input = Candle, Output = f64
const _: fn(&mut Dx, Candle) -> Option<f64> = <Dx as Indicator>::update;
```

`Dx` is a **candle-input** indicator that reads `high`, `low` and `close`. In
Python the streaming `update` accepts a candle; the batch helper takes `high`,
`low`, `close` numpy arrays and returns a 1-D `numpy.ndarray` (`NaN` for warmup).
Node and WASM expose `update(high, low, close)` and the matching `batch`.

## Warmup

`Dx::new(period).warmup_period() == period` (the `accessors_report_config` unit
test pins `warmup_period() == 7` for `period = 7`). Because the underlying
directional indicators need the previous bar, the **first emitted value** appears
at candle index `period`; `is_ready()` becomes true once the smoothed true range
exists. The `strong_trend_drives_dx_high` test pins `out[0] == None` and
`out[3].is_some()` for `period = 3`.

## Edge cases

- **Strong one-sided trend.** When one DI dominates and the other is zero, `DX`
  approaches `100`. The unit test `strong_trend_drives_dx_high` pins this.
- **Balanced directional movement.** When `+DI ≈ −DI` the numerator collapses and
  `DX` is near zero. The unit test `balanced_directional_movement_is_low` pins
  this.
- **Flat market.** With both DIs zero the index returns `0` (the `0/0` case is
  guarded). The unit test `flat_market_returns_zero` pins this.
- **Zero period.** `Dx::new(0)` returns `Err(Error::PeriodZero)`. The unit test
  `rejects_zero_period` pins this.
- **Reset.** `dx.reset()` restores the initial state. The unit test
  `reset_restores_initial_state` pins this.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, Dx};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Clean up-trend: +DM = 2, −DM = 0, TR = 4 → +DI = 50, −DI = 0 → DX = 100.
    let c = |h: f64, l: f64, cl: f64| Candle::new(cl, h, l, cl, 1.0, 0).unwrap();
    let candles: Vec<Candle> = (0..5)
        .map(|i| c(102.0 + 2.0 * i as f64, 98.0 + 2.0 * i as f64, 101.0 + 2.0 * i as f64))
        .collect();
    let mut dx = Dx::new(3)?;
    println!("{:?}", dx.batch(&candles));
    Ok(())
}
```

Output:

```
[None, None, None, Some(100.0), Some(100.0)]
```

In a perfectly one-sided up-trend `−DI = 0`, so `DX = 100 · |50 − 0| / (50 + 0) =
100`. (The `strong_trend_drives_dx_high` test pins the qualitative "high `DX` in
a strong trend" contract.)

### Python

```python
import numpy as np
import wickra as ta

dx = ta.DX(3)
i = np.arange(5.0)
print(dx.batch(102 + 2 * i, 98 + 2 * i, 101 + 2 * i))
```

Output:

```
[ nan  nan  nan 100. 100.]
```

### Node

```javascript
const ta = require('wickra');
const dx = new ta.DX(3);
for (let i = 0; i < 5; i++) console.log(dx.update(102 + 2 * i, 98 + 2 * i, 101 + 2 * i));
```

Output:

```
null
null
null
100
100
```

## Interpretation

`DX` is a single-bar trend-strength gauge: it ignores direction and reports only
how lopsided the directional system is. Because it is un-smoothed it is noisy —
which is exactly why Wilder averaged it into [`Adx`](/Indicators/Indicator-Adx). Use `DX`
when you want the raw, reactive strength signal (e.g. to detect the *onset* of a
trend before `Adx` catches up), and `Adx` when you want the stable version.

Pair `DX`/`Adx` (strength) with [`PlusDi`](/Indicators/Indicator-PlusDi) /
[`MinusDi`](/Indicators/Indicator-MinusDi) (direction) for the complete picture.

## Common pitfalls

- **Treating `DX` as directional.** `DX` is built from `|+DI − −DI|`; a reading
  of `100` says "strong trend" but not which way. Read the DIs for direction.
- **Expecting smooth output.** `DX` whipsaws bar to bar; that noise is by design.
  Use [`Adx`](/Indicators/Indicator-Adx) if you need a stable line.

## References

J. Welles Wilder Jr., *New Concepts in Technical Trading Systems* (1978),
matching TA-Lib's `DX`.

## See also

- [Indicator-Adx](/Indicators/Indicator-Adx) — the Wilder average of `DX`.
- [Indicator-PlusDi](/Indicators/Indicator-PlusDi) / [Indicator-MinusDi](/Indicators/Indicator-MinusDi) — the directional legs.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
