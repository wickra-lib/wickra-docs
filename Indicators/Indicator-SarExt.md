# SarExt

> Parabolic SAR Extended (`SAREXT`) — Wilder's Parabolic SAR with a start value,
> a reversal offset, independent long/short acceleration, and a **signed** output.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trailing Stops |
| Input type | `Candle` (uses `high`, `low`) |
| Output type | `f64` (signed: `> 0` long, `< 0` short) |
| Output range | price scale; sign encodes trade direction |
| Default parameters | Wilder's `(0.02, 0.02, 0.20)` both directions, no start value or offset |
| Warmup period | `2` (the first candle only seeds the trend) |
| Interpretation | A trailing stop whose **sign** is the position: positive (below price) in a long, negative (above price) in a short. |

## Formula

`SarExt` is [`Psar`](/Indicators/Indicator-Psar) with TA-Lib's extended controls. Each bar the
stop advances toward the extreme point by the acceleration factor:

```
SAR_t = SAR_{t-1} + AF · (EP − SAR_{t-1})
long:  SAR_t = min(SAR_t, low_{t-1},  low_{t-2})     // clamp with the two PREVIOUS bars
short: SAR_t = max(SAR_t, high_{t-1}, high_{t-2})
reversal if long and low_t <= SAR_t, or short and high_t >= SAR_t
```

The clamp uses the two bars *before* bar `t` (never bar `t`'s own low/high);
only then is bar `t` tested for a reversal. This is Wilder's rule and TA-Lib's
(which clamps tomorrow's SAR with today's and yesterday's extremes — the same
rule one bar earlier).

**Seed.** The first candle only records its high and low; the first stop is
emitted on the second candle, following TA-Lib:

```
start_value == 0  (automatic direction):
    down_move = low_0 - low_1,  up_move = high_1 - high_0
    short if down_move > 0 and down_move > up_move, else long
    long:  SAR = low_0     short: SAR = high_0
start_value  > 0:  long,  SAR = start_value
start_value  < 0:  short, SAR = |start_value|
EP = high_1 (long) or low_1 (short)
```

As in TA-Lib, the first step treats the second candle as both "today" and
"yesterday", so the next clamp uses its range twice.

On a reversal the stop flips to the prior extreme point, moved outside this
bar's and the previous bar's range — `max(EP, high_{t-1}, high_t)` when flipping
short, `min(EP, low_{t-1}, low_t)` when flipping long — the acceleration factor
resets, and then `offset_on_reverse` pushes the new stop further from price.
Beyond `Psar` it adds:

- **`start_value`** — the initial SAR. `0` picks the direction automatically
  from the first two candles (as above, identical to `Psar`); a positive value
  forces a long start at that SAR, a negative value forces a short start at its
  absolute value.
- **`offset_on_reverse`** — a fractional offset applied to the new SAR on each
  reversal (`0` disables it).
- **separate long / short acceleration** — independent `(init, step, max)`
  schedules.

The output is **signed**: positive during a long phase (SAR below price),
negative during a short phase (SAR above price), so the sign alone encodes the
current direction. See `crates/wickra-core/src/indicators/sar_ext.rs`.

**TA-Lib parity.** `SarExt` matches TA-Lib `SAREXT` exactly from the first
output bar (to `1e-9`, verified by the TA-Lib reference test suite), including
the sign convention of the output.

## Parameters

| Name | Type | Default | Valid range | Description | Source |
|------|------|---------|-------------|-------------|--------|
| `start_value` | `f64` | `0.0` | finite | `0` picks the direction from the first two candles; `> 0` forces a long start at that SAR; `< 0` forces a short start at its absolute value. | `sar_ext.rs:102` |
| `offset_on_reverse` | `f64` | `0.0` | finite, `>= 0` | Fractional offset added to the new SAR on each reversal. | `sar_ext.rs:102` |
| `accel_init_long` / `accel_long` / `accel_max_long` | `f64` | `0.02 / 0.02 / 0.20` | `> 0`, finite, `init <= max` | Long-phase acceleration `(init, step, max)`. | `sar_ext.rs:22` |
| `accel_init_short` / `accel_short` / `accel_max_short` | `f64` | `0.02 / 0.02 / 0.20` | `> 0`, finite, `init <= max` | Short-phase acceleration `(init, step, max)`. | `sar_ext.rs:22` |

Non-positive or non-finite acceleration terms error with
`Error::NonPositiveMultiplier`; an `init` above its `max` errors with
`Error::InvalidPeriod`. `SarExt::classic()` builds the Wilder defaults.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/sar_ext.rs`:

```rust
use wickra::{Indicator, SarExt, Candle};
// SarExt: Input = Candle, Output = f64
const _: fn(&mut SarExt, Candle) -> Option<f64> = <SarExt as Indicator>::update;
```

`SarExt` is a **candle-input** indicator that reads `high` and `low`. In Python
the constructor takes the eight parameters with defaults (so `wickra.SarExt()`
gives the Wilder configuration); `update` accepts a candle and `batch` the
`high`/`low`/`close` columns. Node and WASM expose `update(high, low, close)` and
the matching `batch`.

## Warmup

`SarExt::classic().warmup_period() == 2`. The first candle only records its high
and low and returns `None`; the second candle fixes the direction, the starting
SAR and the extreme point and emits the first signed stop. The unit tests `accessors_and_metadata` (pins
`warmup_period() == 2`) and `seed_returns_none_then_emits` pin this.

## Edge cases

- **Long phase stays positive and below the low.** Every emitted value in a clean
  up-trend is positive and `<= the bar's low`. The unit test
  `uptrend_is_positive_and_below_lows` pins this.
- **Short phase stays negative and above the high.** The unit test
  `downtrend_is_negative_and_above_highs` pins the mirror image.
- **Explicit start direction.** A positive `start_value` forces a long start, a
  negative one a short start. The unit tests `positive_start_value_begins_long`
  and `negative_start_value_begins_short` pin this.
- **Invalid parameters.** Non-positive, non-finite, or `init > max` acceleration
  terms — and a non-finite `start_value` or negative `offset_on_reverse` — are
  rejected at construction. The unit test `rejects_invalid_params` pins this.
- **Reset.** `s.reset()` returns the indicator to its un-seeded state. The unit
  test `reset_allows_clean_reuse` pins this.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, SarExt};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let c = |h: f64, l: f64, cl: f64| Candle::new(cl, h, l, cl, 1.0, 0).unwrap();
    let mut s = SarExt::classic();
    let out: Vec<Option<f64>> = s.batch(&[c(11.0, 9.0, 10.0), c(12.0, 10.0, 11.0)]);
    println!("{:?}", out);
    Ok(())
}
```

Output:

```
[None, Some(9.0)]
```

With `start_value = 0` the direction comes from the first two candles: the
up move is `12 − 11 = 1` and the down move `9 − 10 = −1`, so the seed is long.
The SAR starts at the first candle's low (`9`) and the EP at the second
candle's high (`12`); the second bar's low (`10`) stays above the stop, so
there is no reversal and the long-phase (positive) stop is `9.0`. This is the
`seed_returns_none_then_emits` contract; `uptrend_is_positive_and_below_lows`
pins the "positive and below the low" invariant.

### Python

```python
import numpy as np
import wickra as ta

s = ta.SAREXT()  # Wilder defaults
high  = np.array([11.0, 12.0])
low   = np.array([9.0,  10.0])
close = np.array([10.0, 11.0])
print(s.batch(high, low, close))
```

Output:

```
array('d', [nan, 9.0])
```

### Node

```javascript
const ta = require('wickra');
const s = new ta.SAREXT(0, 0, 0.02, 0.02, 0.2, 0.02, 0.02, 0.2);
console.log(s.update(11, 9, 10));   // null  (seeds)
console.log(s.update(12, 10, 11));  // 9
```

Output:

```
null
9
```

## Interpretation

`SarExt` is a stop-and-reverse trailing stop: as long as the trend holds the stop
ratchets toward price, accelerating the longer the trend runs; when price touches
the stop the position flips. The signed output makes it directly usable as a
position signal — read the **sign** for direction and the **magnitude** for the
stop level. The extended controls let you (a) seed an existing position with
`start_value`, (b) widen post-reversal stops with `offset_on_reverse` to avoid
immediate whipsaw, and (c) tune long and short aggressiveness independently for
asymmetric markets.

Prefer plain [`Psar`](/Indicators/Indicator-Psar) when you want Wilder's original unsigned
behaviour; reach for `SarExt` when you need the signed output or the extra knobs.

## Common pitfalls

- **Ignoring the sign.** Unlike `Psar`, `SarExt` returns a **signed** value;
  taking the absolute value discards the direction it encodes.
- **`init` above `max`.** The acceleration `init` must not exceed its `max`, or
  construction fails — an easy mistake when tuning aggressive schedules.
- **Whipsaw in ranges.** Like every SAR, it performs poorly in sideways markets;
  the `offset_on_reverse` knob mitigates but does not eliminate this.

## References

J. Welles Wilder Jr., *New Concepts in Technical Trading Systems* (1978) for the
base SAR; the extended controls match TA-Lib's `SAREXT`.

## See also

- [Indicator-Psar](/Indicators/Indicator-Psar) — the classic unsigned Parabolic SAR.
- [Indicator-SuperTrend](/Indicators/Indicator-SuperTrend) — an ATR-based trailing stop.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
