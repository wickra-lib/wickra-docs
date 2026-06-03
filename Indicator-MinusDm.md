# MinusDm

> Wilder's Minus Directional Movement (`MINUS_DM`) — the Wilder-smoothed running
> total of the raw `−DM` that feeds `Adx` and `MinusDi`, exposed standalone.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trend & Directional |
| Input type | `Candle` (uses `high`, `low`) |
| Output type | `f64` |
| Output range | `>= 0` (a smoothed sum of down-moves) |
| Default parameters | `period` is required |
| Warmup period | `period` (first value at candle index `period`) |
| Interpretation | The accumulated strength of downward directional movement over the window. |

## Formula

The raw minus directional movement of a bar is

```
up   = high − high_prev
down = low_prev − low
−DM  = down  if (down > up and down > 0)  else 0
```

`MinusDm` returns the **Wilder-smoothed** running total of that raw `−DM`. The
first `period` raw values seed the sum; from then on each update applies the
Wilder recursion:

```
smoothed = smoothed − smoothed / period + raw_minus_dm
```

This is the same `−DM` accumulation that drives [`Adx`](Indicator-Adx) and
[`MinusDi`](Indicator-MinusDi). The shared `directional_movement` helper lives in
`crates/wickra-core/src/indicators/adx.rs`; the smoothing wrapper is
`crates/wickra-core/src/indicators/minus_dm.rs`.

## Parameters

| Name | Type | Default | Valid range | Description | Source |
|------|------|---------|-------------|-------------|--------|
| `period` | `usize` | none | `>= 1` | Wilder smoothing length. `period = 0` errors with `Error::PeriodZero`. | `minus_dm.rs:49` |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/minus_dm.rs`:

```rust
use wickra::{Indicator, MinusDm, Candle};
// MinusDm: Input = Candle, Output = f64
const _: fn(&mut MinusDm, Candle) -> Option<f64> = <MinusDm as Indicator>::update;
```

`MinusDm` is a **candle-input** indicator that reads `high` and `low`. In Python
the streaming `update` accepts a candle; the batch helper takes `high`, `low`,
`close` numpy arrays and returns a 1-D `numpy.ndarray` (`NaN` for warmup). Node
and WASM expose `update(high, low, close)` and the matching `batch`.

## Warmup

`MinusDm::new(period).warmup_period() == period` (the `accessors_report_config`
unit test pins `warmup_period() == 7` for `period = 7`). Because a bar's
directional movement needs the previous bar, the **first emitted value** appears
at candle index `period` — the `(period + 1)`-th candle. The
`seeds_then_smooths_a_constant_minus_dm` test pins this: for `period = 3` the
first three outputs are `None` and the first value lands at index 3.

## Edge cases

- **Up moves contribute zero.** On a bar whose up-move dominates, the raw `−DM`
  is `0` and only the Wilder decay applies. The unit test
  `up_moves_contribute_zero` pins this.
- **Constant down-move.** A series with a steady down-move per bar seeds to the
  sum of three unit moves (`3.0`) and the Wilder step `3 − 3/3 + 1 = 3` holds it
  there. The unit test `seeds_then_smooths_a_constant_minus_dm` pins this.
- **Zero period.** `MinusDm::new(0)` returns `Err(Error::PeriodZero)`. The unit
  test `rejects_zero_period` pins this.
- **Reset.** `dm.reset()` restores the initial state (no previous bar, empty
  seed). The unit test `reset_restores_initial_state` pins this.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, MinusDm};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // low −1/bar, high −0.5/bar → −DM is a steady 1.0 per bar.
    let c = |h: f64, l: f64, cl: f64| Candle::new(cl, h, l, cl, 1.0, 0).unwrap();
    let candles: Vec<Candle> = (0..5)
        .map(|i| c(13.0 - 0.5 * i as f64, 11.0 - i as f64, 12.0 - i as f64))
        .collect();
    let mut dm = MinusDm::new(3)?;
    println!("{:?}", dm.batch(&candles));
    Ok(())
}
```

Output:

```
[None, None, None, Some(3.0), Some(3.0)]
```

The seed at index 3 is the sum of three unit `−DM` values (`3.0`); the Wilder
step at index 4 is `3 − 3/3 + 1 = 3`. This matches the
`seeds_then_smooths_a_constant_minus_dm` unit test in
`crates/wickra-core/src/indicators/minus_dm.rs`.

### Python

```python
import numpy as np
import wickra as ta

dm = ta.MinusDm(3)
high  = np.array([13.0, 12.5, 12.0, 11.5, 11.0])
low   = np.array([11.0, 10.0, 9.0,  8.0,  7.0])
close = np.array([12.0, 11.0, 10.0, 9.0,  8.0])
print(dm.batch(high, low, close))
```

Output:

```
[nan nan nan  3.  3.]
```

### Node

```javascript
const ta = require('wickra');
const dm = new ta.MinusDm(3);
const bars = [[13, 11], [12.5, 10], [12, 9], [11.5, 8], [11, 7]];
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

`MinusDm` measures how much *downward* directional pressure has accumulated. Like
its bullish twin it is rarely traded alone — it is normalised by true range into
[`MinusDi`](Indicator-MinusDi) and combined with [`PlusDi`](Indicator-PlusDi)
into the directional system behind [`Adx`](Indicator-Adx). Expose it standalone
when you want the un-normalised down-move accumulation as a feature.

## Common pitfalls

- **Sign confusion.** `−DM` is reported as a **non-negative magnitude**; the
  "minus" names the *direction* (down-moves), not the sign of the value.
- **Comparing magnitudes across instruments.** `−DM` is in raw price units; use
  [`MinusDi`](Indicator-MinusDi) (`0–100`) for cross-instrument comparison.

## References

J. Welles Wilder Jr., *New Concepts in Technical Trading Systems* (1978),
matching TA-Lib's `MINUS_DM`.

## See also

- [Indicator-PlusDm](Indicator-PlusDm) — the bullish counterpart.
- [Indicator-MinusDi](Indicator-MinusDi) — `−DM` normalised by true range.
- [Indicator-Dx](Indicator-Dx) / [Indicator-Adx](Indicator-Adx) — the full directional system.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
