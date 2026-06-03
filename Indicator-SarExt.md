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

`SarExt` is [`Psar`](Indicator-Psar) with TA-Lib's extended controls. Each bar the
stop advances toward the extreme point by the acceleration factor:

```
SAR_next = SAR + AF · (EP − SAR)        // clamped not to cross the last two bars
```

On a reversal the stop flips to the prior extreme point, the acceleration factor
resets, and an optional offset pushes the new stop further from price. Beyond
`Psar` it adds:

- **`start_value`** — the initial SAR. `0` auto-seeds long (like `Psar`); a
  positive value starts a long phase at that SAR, a negative value starts a short
  phase at its absolute value.
- **`offset_on_reverse`** — a fractional offset applied to the new SAR on each
  reversal (`0` disables it).
- **separate long / short acceleration** — independent `(init, step, max)`
  schedules.

The output is **signed**: positive during a long phase (SAR below price),
negative during a short phase (SAR above price), so the sign alone encodes the
current direction. See `crates/wickra-core/src/indicators/sar_ext.rs`.

## Parameters

| Name | Type | Default | Valid range | Description | Source |
|------|------|---------|-------------|-------------|--------|
| `start_value` | `f64` | `0.0` | finite | `0` auto-seeds long; `> 0` starts long at that SAR; `< 0` starts short at `|value|`. | `sar_ext.rs:110` |
| `offset_on_reverse` | `f64` | `0.0` | finite, `>= 0` | Fractional offset added to the new SAR on each reversal. | `sar_ext.rs:110` |
| `accel_init_long` / `accel_long` / `accel_max_long` | `f64` | `0.02 / 0.02 / 0.20` | `> 0`, finite, `init <= max` | Long-phase acceleration `(init, step, max)`. | `sar_ext.rs:23` |
| `accel_init_short` / `accel_short` / `accel_max_short` | `f64` | `0.02 / 0.02 / 0.20` | `> 0`, finite, `init <= max` | Short-phase acceleration `(init, step, max)`. | `sar_ext.rs:23` |

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

`SarExt::classic().warmup_period() == 2`. The first candle only seeds the trend
and the extreme point and returns `None`; the first signed stop is emitted on the
second candle. The unit tests `accessors_and_metadata` (pins
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

The first candle seeds a long phase at `SAR = low = 9`, `EP = high = 11`. The
second candle advances `SAR = 9 + 0.02·(11 − 9) = 9.04`, clamped not to exceed
the prior low (`9`), so the long-phase (positive) stop is `9.0`. This is the
`seed_returns_none_then_emits` contract; `uptrend_is_positive_and_below_lows`
pins the "positive and below the low" invariant.

### Python

```python
import numpy as np
import wickra as ta

s = ta.SarExt()  # Wilder defaults
high  = np.array([11.0, 12.0])
low   = np.array([9.0,  10.0])
close = np.array([10.0, 11.0])
print(s.batch(high, low, close))
```

Output:

```
[nan  9.]
```

### Node

```javascript
const ta = require('wickra');
const s = new ta.SarExt(0, 0, 0.02, 0.02, 0.2, 0.02, 0.02, 0.2);
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

Prefer plain [`Psar`](Indicator-Psar) when you want Wilder's original unsigned
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

- [Indicator-Psar](Indicator-Psar) — the classic unsigned Parabolic SAR.
- [Indicator-SuperTrend](Indicator-SuperTrend) — an ATR-based trailing stop.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
