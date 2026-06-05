# McClellanOscillator

> The McClellan Oscillator — the difference between a 19-period and a 39-period EMA
> of ratio-adjusted net advances. A breadth-momentum oscillator that crosses zero
> as participation shifts.

## Quick reference

| Item                | Value                                                       |
|---------------------|-------------------------------------------------------------|
| Family              | Market Breadth                                              |
| Input type          | `CrossSection` — the per-symbol state of the whole universe |
| Output type         | `f64` (oscillates around 0; may be negative)              |
| Output range        | unbounded; centred on 0                                    |
| Default parameters  | none (fixed 19/39 smoothing)                              |
| Warmup period       | `1`                                                         |
| Interpretation      | Breadth momentum                                          |

## Formula

```
rana     = (advancers - decliners) / max(advancers + decliners, 1) * 1000
ema_fast = ema_fast + 0.10 * (rana - ema_fast)   # 19-period: 2 / (19 + 1)
ema_slow = ema_slow + 0.05 * (rana - ema_slow)   # 39-period: 2 / (39 + 1)
osc      = ema_fast - ema_slow
```

Each tick is reduced to *ratio-adjusted net advances* (RANA): net advances divided
by participating issues, scaled by 1000. Dividing by the participating count makes
the reading independent of universe size, which matters for a ragged universe. Both
EMAs are seeded from the first tick's RANA (so the oscillator starts at `0.0` and is
defined from the first update) and use the classic McClellan smoothing constants
`0.10` and `0.05`. Stateful (two EMAs) and O(universe size) per tick. See
`crates/wickra-core/src/indicators/mcclellan_oscillator.rs`.

## Parameters

None — the 19/39 smoothing is fixed (classic McClellan). Construct with
`McClellanOscillator::new()`.

| Parameter | Type | Default | Source |
|-----------|------|---------|--------|
| —         | —    | —       | None.  |

## Inputs / Outputs

`Indicator<Input = CrossSection, Output = f64>`:

```rust
use wickra::{CrossSection, Indicator, McClellanOscillator};

const _: fn(&mut McClellanOscillator, CrossSection) -> Option<f64> =
    <McClellanOscillator as Indicator>::update;
```

The bindings pass a tick as four equal-length parallel arrays:

- **Python**: `update(change, volume, new_high, new_low)`; `batch(...)` returns a
  1-D `ndarray`.
- **Node**: `update(change, volume, newHigh, newLow)`; `batch` returns `number[]`.
- **WASM**: `update(change, volume, newHigh, newLow)` only; flag arrays are numeric.

## Warmup

`warmup_period() == 1`; both EMAs seed from the first tick, so the oscillator is
`0.0` on tick one and defined thereafter (tests `accessors_and_metadata`,
`seeds_to_zero_on_first_tick`).

## Edge cases

- **First tick.** Both EMAs seed to the same RANA, so the oscillator is exactly
  `0.0` (test `seeds_to_zero_on_first_tick`).
- **Momentum tracking.** After seeding, the fast EMA reacts faster than the slow
  one, so the spread tracks breadth momentum (test
  `tracks_breadth_momentum_after_seeding`, with worked values −50 then −67.5).
- **No participation.** A tick with no advancers or decliners yields a RANA of
  `0.0` (test `empty_participation_yields_zero_rana`).
- **Reset.** `reset()` clears both EMAs and re-seeds on the next tick (test
  `reset_clears_state`).
- **Invalid / empty universe.** Rejected at construction by `CrossSection::new`.

## Examples

### Rust

```rust
use wickra::{CrossSection, Indicator, McClellanOscillator, Member};

let mut osc = McClellanOscillator::new();
let tick = CrossSection::new(
    vec![
        Member::new(1.0, 10.0, false, false),
        Member::new(1.0, 10.0, false, false),
        Member::new(1.0, 10.0, false, false),
        Member::new(-1.0, 10.0, false, false),
    ],
    0,
)?;
// First tick seeds both EMAs to RANA 500 -> oscillator 0.
assert_eq!(osc.update(tick), Some(0.0));
```

### Python

```python
import wickra as ta

osc = ta.McClellanOscillator()
print(osc.update([1.0, 1.0, 1.0, -1.0], [10.0] * 4, [False] * 4, [False] * 4))
# 0.0   (seed)
```

### Node

```js
const { McClellanOscillator } = require('wickra');

const osc = new McClellanOscillator();
const flags = [false, false, false, false];
console.log(osc.update([1, 1, 1, -1], [10, 10, 10, 10], flags, flags));
// 0
```

### Streaming

```python
import wickra as ta

osc = ta.McClellanOscillator()
flags = [False] * 4
vol = [10.0] * 4
print(osc.update([1.0, 1.0, 1.0, -1.0], vol, flags, flags))    # 0.0   (RANA 500, seed)
print(osc.update([-1.0, -1.0, -1.0, 1.0], vol, flags, flags))  # -50.0 (RANA -500)
print(osc.update([1.0, 1.0, -1.0, -1.0], vol, flags, flags))   # -67.5 (RANA 0)
```

## Interpretation

The McClellan Oscillator is the breadth equivalent of a MACD on net advances.

1. **Zero-line crosses.** A rise through zero signals improving breadth momentum; a
   fall through zero, deteriorating.
2. **Overbought / oversold.** Readings beyond roughly ±100 (data-dependent) flag
   stretched breadth that often mean-reverts.
3. **Divergence.** Like any oscillator, divergence against the index warns of a
   waning move.

## Common pitfalls

- **Ratio-adjusted, not raw.** This implementation divides net advances by
  participating issues (RANA); a raw-net McClellan on a different universe size will
  not match value-for-value.
- **Seeded from first tick.** Early readings are damped while the EMAs settle; give
  it some history before trusting extremes.
- **Universe must be stable.** Changing membership distorts RANA.

## References

- McClellan, S. & McClellan, M. *Patterns for Profit* — the McClellan Oscillator
  and Summation Index.

## See also

- [Indicator-McClellanSummationIndex](/Indicators/Indicator-McClellanSummationIndex) — the
  running total of this oscillator.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
