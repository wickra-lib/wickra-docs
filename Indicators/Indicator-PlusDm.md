# PlusDm

> Wilder's Plus Directional Movement (`PLUS_DM`) — the Wilder-smoothed running
> total of the raw `+DM` that feeds `Adx` and `PlusDi`, exposed standalone.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trend & Directional |
| Input type | `Candle` (uses `high`, `low`) |
| Output type | `f64` |
| Output range | `>= 0` (a smoothed sum of up-moves) |
| Default parameters | `period` is required |
| Warmup period | `period + 1` — the first candle only seeds the previous close (first value at candle index `period`) |
| Interpretation | The accumulated strength of upward directional movement over the window. |

## Formula

The raw plus directional movement of a bar is

```
up   = high − high_prev
down = low_prev − low
+DM  = up   if (up > down and up > 0)   else 0
```

`PlusDm` returns the **Wilder-smoothed** running total of that raw `+DM`. The
first `period` raw values seed the sum; from then on each update applies the
Wilder recursion:

```
smoothed = smoothed − smoothed / period + raw_plus_dm
```

This is the same `+DM` accumulation that drives [`Adx`](/Indicators/Indicator-Adx) and
[`PlusDi`](/Indicators/Indicator-PlusDi). The shared `directional_movement` helper lives in
`crates/wickra-core/src/indicators/adx.rs`; the smoothing wrapper is
`crates/wickra-core/src/indicators/plus_dm.rs`.

## Parameters

| Name | Type | Default | Valid range | Description | Source |
|------|------|---------|-------------|-------------|--------|
| `period` | `usize` | none | `>= 1` | Wilder smoothing length. `period = 0` errors with `Error::PeriodZero`. | `plus_dm.rs:49` |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/plus_dm.rs`:

```rust
use wickra::{Indicator, PlusDm, Candle};
// PlusDm: Input = Candle, Output = f64
const _: fn(&mut PlusDm, Candle) -> Option<f64> = <PlusDm as Indicator>::update;
```

`PlusDm` is a **candle-input** indicator that reads `high` and `low`. In Python
the streaming `update` accepts a candle; the batch helper takes `high`, `low`,
`close` numpy arrays and returns an `array.array('d')` (`NaN` for warmup). Node
and WASM expose `update(high, low, close)` and the matching `batch`.

## Warmup

`PlusDm::new(period).warmup_period() == period + 1` (the `accessors_report_config`
unit test pins `warmup_period() == 8` for `period = 7`). Because a bar's
directional movement needs the previous bar, the **first emitted value** appears
at candle index `period` — the `(period + 1)`-th candle. The
`seeds_then_smooths_a_constant_plus_dm` test pins this: for `period = 3` the
first three outputs are `None` and the first value lands at index 3.

## Edge cases

- **Down moves contribute zero.** On a bar whose down-move dominates, the raw
  `+DM` is `0` and only the Wilder decay applies. The unit test
  `down_moves_contribute_zero` pins this.
- **Constant up-move.** A series with a steady `+1` up-move per bar seeds to the
  sum of three unit moves (`3.0`) and the Wilder step `3 − 3/3 + 1 = 3` holds it
  there. The unit test `seeds_then_smooths_a_constant_plus_dm` pins this.
- **Zero period.** `PlusDm::new(0)` returns `Err(Error::PeriodZero)`. The unit
  test `rejects_zero_period` pins this.
- **Reset.** `dm.reset()` restores the initial state (no previous bar, empty
  seed). The unit test `reset_restores_initial_state` pins this.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, PlusDm};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // high +1/bar, low +0.5/bar → +DM is a steady 1.0 per bar.
    let c = |h: f64, l: f64, cl: f64| Candle::new(cl, h, l, cl, 1.0, 0).unwrap();
    let candles: Vec<Candle> = (0..5)
        .map(|i| c(11.0 + i as f64, 9.0 + 0.5 * i as f64, 10.0 + i as f64))
        .collect();
    let mut dm = PlusDm::new(3)?;
    println!("{:?}", dm.batch(&candles));
    Ok(())
}
```

Output:

```
[None, None, None, Some(3.0), Some(3.0)]
```

The seed at index 3 is the sum of three unit `+DM` values (`3.0`); the Wilder
step at index 4 is `3 − 3/3 + 1 = 3`. This matches the
`seeds_then_smooths_a_constant_plus_dm` unit test in
`crates/wickra-core/src/indicators/plus_dm.rs`.

### Python

```python
import numpy as np
import wickra as ta

dm = ta.PLUS_DM(3)
high  = np.array([11.0, 12.0, 13.0, 14.0, 15.0])
low   = np.array([9.0,  9.5,  10.0, 10.5, 11.0])
close = np.array([10.0, 11.0, 12.0, 13.0, 14.0])
print(dm.batch(high, low, close))
```

Output:

```
[nan nan nan  3.  3.]
```

### Node

```javascript
const ta = require('wickra');
const dm = new ta.PLUS_DM(3);
const bars = [[11, 9], [12, 9.5], [13, 10], [14, 10.5], [15, 11]];
for (const [h, l] of bars) console.log(dm.update(h, l, l));
```

Output:

```
null
null
null
3
3
```

## Interpretation

`PlusDm` measures how much *upward* directional pressure has accumulated. On its
own it is rarely traded — its purpose is to be normalised by true range into
[`PlusDi`](/Indicators/Indicator-PlusDi) and combined with [`MinusDi`](/Indicators/Indicator-MinusDi)
into the directional system behind [`Adx`](/Indicators/Indicator-Adx). Expose it standalone
when you want the un-normalised up-move accumulation as a feature, or to build a
custom directional ratio.

## Common pitfalls

- **Comparing magnitudes across instruments.** `+DM` is in raw price units, so
  it scales with the instrument's price and volatility. Use
  [`PlusDi`](/Indicators/Indicator-PlusDi) (normalised by true range, `0–100`) for
  cross-instrument comparison.
- **Expecting it before `period + 1` bars.** The first candle only records the
  previous bar; no `+DM` exists yet.

## References

J. Welles Wilder Jr., *New Concepts in Technical Trading Systems* (1978),
matching TA-Lib's `PLUS_DM`.

## See also

- [Indicator-MinusDm](/Indicators/Indicator-MinusDm) — the bearish counterpart.
- [Indicator-PlusDi](/Indicators/Indicator-PlusDi) — `+DM` normalised by true range.
- [Indicator-Dx](/Indicators/Indicator-Dx) / [Indicator-Adx](/Indicators/Indicator-Adx) — the full directional system.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
