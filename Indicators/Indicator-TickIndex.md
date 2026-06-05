# TickIndex

> The TICK Index — the instantaneous net of advancing minus declining issues
> across a universe. Unlike the cumulative A/D Line it is not accumulated: each
> tick reports the breadth of that snapshot alone.

## Quick reference

| Item                | Value                                                       |
|---------------------|-------------------------------------------------------------|
| Family              | Market Breadth                                              |
| Input type          | `CrossSection` — the per-symbol state of the whole universe |
| Output type         | `f64` (net issue count; may be negative)                   |
| Output range        | `-N..=N` for a universe of `N` symbols                     |
| Default parameters  | none                                                        |
| Warmup period       | `1`                                                         |
| Interpretation      | Instantaneous market breadth                               |

## Formula

```
tick = advancers - decliners   # per tick, by sign of each member's change; not cumulative
```

where `advancers` is the count of symbols with a positive `change` and `decliners`
the count with a negative `change`. The reading oscillates around zero. Stateless
per tick and O(universe size). See `crates/wickra-core/src/indicators/tick_index.rs`.

## Parameters

None. Construct with `TickIndex::new()`.

| Parameter | Type | Default | Source |
|-----------|------|---------|--------|
| —         | —    | —       | None.  |

## Inputs / Outputs

`Indicator<Input = CrossSection, Output = f64>`:

```rust
use wickra::{CrossSection, Indicator, TickIndex};

const _: fn(&mut TickIndex, CrossSection) -> Option<f64> =
    <TickIndex as Indicator>::update;
```

The bindings pass a tick as four equal-length parallel arrays:

- **Python**: `update(change, volume, new_high, new_low)`; `batch(...)` returns a
  1-D `ndarray`.
- **Node**: `update(change, volume, newHigh, newLow)`; `batch` returns `number[]`.
- **WASM**: `update(change, volume, newHigh, newLow)` only; flag arrays are numeric.

## Warmup

`warmup_period() == 1`; defined from the first tick (tests
`accessors_and_metadata`, `positive_when_advancers_lead`).

## Edge cases

- **Sign.** Positive when advancers lead, negative when decliners lead (tests
  `positive_when_advancers_lead`, `negative_when_decliners_lead`).
- **Not cumulative.** Each reading is independent of the previous one (test
  `does_not_accumulate`).
- **Reset.** `reset()` returns the indicator to not-ready (test
  `reset_clears_state`).
- **Invalid / empty universe.** Rejected at construction by `CrossSection::new`.

## Examples

### Rust

```rust
use wickra::{CrossSection, Indicator, Member, TickIndex};

let mut tick = TickIndex::new();
// 2 advancers, 5 decliners -> net -3.
let snapshot = CrossSection::new(
    vec![
        Member::new(1.0, 10.0, false, false),
        Member::new(1.0, 10.0, false, false),
        Member::new(-1.0, 10.0, false, false),
        Member::new(-1.0, 10.0, false, false),
        Member::new(-1.0, 10.0, false, false),
        Member::new(-1.0, 10.0, false, false),
        Member::new(-1.0, 10.0, false, false),
    ],
    0,
)?;
assert_eq!(tick.update(snapshot), Some(-3.0));
```

### Python

```python
import wickra as ta

tick = ta.TickIndex()
change = [1.0, 1.0, -1.0, -1.0, -1.0]
print(tick.update(change, [10.0] * 5, [False] * 5, [False] * 5))
# -1.0   (2 up, 3 down)
```

### Node

```js
const { TickIndex } = require('wickra');

const tick = new TickIndex();
const flags = [false, false, false, false, false];
console.log(tick.update([1, 1, -1, -1, -1], [10, 10, 10, 10, 10], flags, flags));
// -1
```

### Streaming

```python
import wickra as ta

tick = ta.TickIndex()
print(tick.update([1.0, 1.0, 1.0], [10.0] * 3, [False] * 3, [False] * 3))  # 3.0
print(tick.update([-1.0], [10.0], [False], [False]))                       # -1.0 (independent)
```

## Interpretation

The TICK is a real-time breadth oscillator, classically the count of NYSE issues on
an uptick minus those on a downtick.

1. **Extremes.** Strongly positive readings mark a broad surge of upticks (often an
   intraday overbought extreme), strongly negative a broad flush — traders fade
   extremes.
2. **Zero line.** Persistent readings above/below zero set the intraday bias.
3. **Snapshot, not trend.** Because it does not accumulate, the TICK measures the
   *moment*; pair it with the cumulative A/D Line for the trend.

## Common pitfalls

- **Not a line.** Do not expect the TICK to trend — it is a per-snapshot reading.
- **Universe-bounded.** The magnitude is capped by the universe size; compare
  readings only within a fixed universe.
- **Resolution matters.** The "change" is whatever interval you build the tick on;
  a 1-second TICK and a daily TICK are different animals.

## References

- Colby, R. W. (2002). *The Encyclopedia of Technical Market Indicators* (2nd ed.)
  — TICK / breadth oscillators.

## See also

- [Indicator-AbsoluteBreadthIndex](/Indicators/Indicator-AbsoluteBreadthIndex) — the magnitude
  of the same net.
- [Indicator-AdvanceDecline](/Indicators/Indicator-AdvanceDecline) — the cumulative line.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
