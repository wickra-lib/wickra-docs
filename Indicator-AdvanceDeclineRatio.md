# AdvanceDeclineRatio

> The Advance/Decline Ratio — advancing issues divided by declining issues across
> a whole universe. A size-independent breadth gauge: above one means advancers
> outnumber decliners (broad strength), below one means broad weakness.

## Quick reference

| Item                | Value                                                       |
|---------------------|-------------------------------------------------------------|
| Family              | Market Breadth                                              |
| Input type          | `CrossSection` — the per-symbol state of the whole universe |
| Output type         | `f64` (a ratio, ≥ 0)                                        |
| Output range        | `0..` (unbounded above)                                     |
| Default parameters  | none                                                        |
| Warmup period       | `1`                                                         |
| Interpretation      | Market breadth / participation                             |

## Formula

```
ratio = advancers / max(decliners, 1)   # per tick, by sign of each member's change
```

where `advancers` is the count of symbols with a strictly positive `change` and
`decliners` the count with a strictly negative `change` (unchanged symbols are
ignored). Unlike the Advance/Decline *Line*, the ratio is not cumulative — each
tick stands alone — and because it is a ratio it is comparable across universes
of different sizes. When a tick has no decliners the denominator is floored to one,
so the ratio degrades to the advancer count instead of dividing by zero. Stateless
per tick and O(universe size). See
`crates/wickra-core/src/indicators/advance_decline_ratio.rs`.

## Parameters

None. Construct with `AdvanceDeclineRatio::new()`.

| Parameter | Type | Default | Source |
|-----------|------|---------|--------|
| —         | —    | —       | None.  |

## Inputs / Outputs

`Indicator<Input = CrossSection, Output = f64>`:

```rust
use wickra::{AdvanceDeclineRatio, CrossSection, Indicator};

const _: fn(&mut AdvanceDeclineRatio, CrossSection) -> Option<f64> =
    <AdvanceDeclineRatio as Indicator>::update;
```

A `CrossSection` is one tick carrying the universe as a list of `Member`s (each a
signed `change`, a `volume`, and `new_high` / `new_low` flags; the ratio reads only
`change`). The bindings pass a tick as four equal-length parallel arrays:

- **Python**: `update(change, volume, new_high, new_low)`; `batch(...)` takes one
  array group per tick (lists of lists) and returns a 1-D `ndarray`.
- **Node**: `update(change, volume, newHigh, newLow)`; `batch` nests the arrays one
  level per tick and returns `number[]`.
- **WASM**: `update(change, volume, newHigh, newLow)` only (the universe is ragged
  across ticks, so no `batch`); the flag arrays are numeric (non-zero is true).

## Warmup

`warmup_period() == 1`; the ratio is defined from the first tick and the indicator
reports ready immediately after it (tests `accessors_and_metadata`,
`first_tick_emits_ratio`).

## Edge cases

- **No decliners.** The denominator is floored to one, so a tick with only
  advancers returns the advancer count rather than dividing by zero (test
  `zero_decliners_floors_denominator`).
- **No advancers.** Returns `0.0` (test `no_advancers_yields_zero`).
- **Not cumulative.** Each tick is independent of the last (covered by
  `batch_equals_streaming`).
- **Reset.** `reset()` returns the indicator to not-ready (test
  `reset_clears_state`).
- **Invalid / empty universe.** `CrossSection::new` rejects an empty member list or
  a non-finite `change` / negative `volume`; the bindings surface this as a
  `ValueError` / `Error`.

## Examples

### Rust

```rust
use wickra::{AdvanceDeclineRatio, CrossSection, Indicator, Member};

let mut adr = AdvanceDeclineRatio::new();
// 3 advancers, 1 decliner -> 3.0.
let tick = CrossSection::new(
    vec![
        Member::new(1.0, 10.0, false, false),
        Member::new(0.5, 10.0, false, false),
        Member::new(2.0, 10.0, false, false),
        Member::new(-1.0, 10.0, false, false),
    ],
    0,
)?;
assert_eq!(adr.update(tick), Some(3.0));
```

### Python

```python
import wickra as ta

adr = ta.AdvanceDeclineRatio()
print(adr.update([1.0, 0.5, 2.0, -1.0], [10.0] * 4, [False] * 4, [False] * 4))
# 3.0
```

### Node

```js
const { AdvanceDeclineRatio } = require('wickra');

const adr = new AdvanceDeclineRatio();
const flags = [false, false, false, false];
console.log(adr.update([1.0, 0.5, 2.0, -1.0], [10, 10, 10, 10], flags, flags));
// 3
```

### Streaming

```python
import wickra as ta

adr = ta.AdvanceDeclineRatio()
flags = [False] * 4
vol = [10.0] * 4
print(adr.update([1.0, 1.0, 1.0, -1.0], vol, flags, flags))     # 3.0  (3 up / 1 down)
print(adr.update([-1.0, -1.0, -1.0, -1.0], vol, flags, flags))  # 0.0  (no advancers)
```

## Interpretation

The A/D Ratio normalises breadth so it can be compared over time and across
universes of different sizes.

1. **Above / below one.** A reading above `1.0` means advancing issues outnumber
   declining ones; below `1.0` is broad weakness.
2. **Extremes.** Very high readings can mark broad, possibly exhausted, thrusts;
   very low readings mark washouts.
3. **Smoothing.** Because the raw ratio is noisy tick-to-tick, it is usually read
   through a moving average (see `BreadthThrust`, which smooths the closely-related
   advancing share).

## Common pitfalls

- **Floored denominator.** When there are no decliners the ratio equals the
  advancer count; do not read that single value as an unbounded spike.
- **Universe must be stable.** A breadth ratio only makes sense over a fixed
  universe; changing membership between ticks makes the counts incomparable.
- **Not a line.** Unlike the A/D Line the ratio does not accumulate — do not expect
  it to trend.

## References

- Colby, R. W. (2002). *The Encyclopedia of Technical Market Indicators* (2nd ed.)
  — Advance/Decline Ratio.

## See also

- [Indicator-AdvanceDecline](Indicator-AdvanceDecline) — the cumulative A/D Line.
- [Indicator-BreadthThrust](Indicator-BreadthThrust) — smoothed advancing share.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
