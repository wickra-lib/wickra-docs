# AdvanceDecline

> The Advance/Decline Line — the running cumulative sum of net advancing-minus-
> declining issues across a whole universe. The canonical breadth gauge: a rising
> line means the rally is broad, a falling line warns it is carried by fewer and
> fewer names.

## Quick reference

| Item                | Value                                                          |
|---------------------|----------------------------------------------------------------|
| Family              | Market Breadth                                                  |
| Input type          | `CrossSection` — the per-symbol state of the whole universe     |
| Output type         | `f64` (cumulative net-advance line)                           |
| Output range        | unbounded; may be negative                                     |
| Default parameters  | none                                                           |
| Warmup period       | `1`                                                            |
| Interpretation      | Market breadth / participation                                |

## Formula

```
net  = advancers - decliners          # per tick, by sign of each member's change
line = line + net                     # cumulative
```

where `advancers` is the count of symbols with a strictly positive `change`,
`decliners` the count with a strictly negative `change`, and unchanged symbols
(`change == 0`) are ignored. The line is a running total, so it is path-dependent
and its absolute level is meaningless — only its slope and divergences against a
price index matter. Stateless per tick and O(universe size). See
`crates/wickra-core/src/indicators/advance_decline.rs`.

## Parameters

None. Construct with `AdvanceDecline::new()`.

| Parameter | Type | Default | Source |
|-----------|------|---------|--------|
| —         | —    | —       | None.  |

## Inputs / Outputs

`Indicator<Input = CrossSection, Output = f64>`:

```rust
use wickra::{AdvanceDecline, CrossSection, Indicator};

const _: fn(&mut AdvanceDecline, CrossSection) -> Option<f64> =
    <AdvanceDecline as Indicator>::update;
```

A `CrossSection` is one tick carrying the per-symbol state of the universe as a
list of `Member`s, each with a signed `change`, a `volume`, and `new_high` /
`new_low` flags (the A/D Line reads only `change`). The bindings pass a tick as
four equal-length parallel arrays:

- **Python**: `update(change, volume, new_high, new_low)` over one universe;
  `batch(change, volume, new_high, new_low)` takes one such array group per tick
  (lists of lists) and returns a 1-D `ndarray`.
- **Node**: `update(change, volume, newHigh, newLow)`; `batch` takes the same
  arrays nested one level per tick and returns `number[]`.
- **WASM**: `update(change, volume, newHigh, newLow)` only — the universe is
  ragged across ticks, so there is no `batch`; the high/low flag arrays are
  numeric (non-zero is true).

## Warmup

`warmup_period() == 1`; the line is defined from the very first tick and the
indicator reports ready immediately after it (pinned by the unit tests
`accessors_and_metadata` and `first_tick_emits_net_breadth`).

## Edge cases

- **Unchanged symbols.** Members with `change == 0` count as neither advancing
  nor declining and leave the line flat (test `unchanged_symbols_are_ignored`).
- **Cumulative state.** The line accumulates across ticks and can go negative
  (test `line_accumulates_across_ticks`).
- **Reset.** `reset()` returns the line to zero and the indicator to not-ready,
  so it restarts from `0.0` rather than the pre-reset level (test
  `reset_clears_state`).
- **Empty universe.** `CrossSection::new` rejects an empty member list (test
  `new_rejects_empty`); the bindings surface this as a `ValueError` / `Error`.
- **Invalid members.** A non-finite `change` or a negative / non-finite `volume`
  is rejected at construction (tests `new_rejects_non_finite_change`,
  `new_rejects_negative_volume`, `new_rejects_non_finite_volume`).

## Examples

### Rust

```rust
use wickra::{AdvanceDecline, CrossSection, Indicator, Member};

let mut ad = AdvanceDecline::new();
// 3 advancers, 1 decliner -> net +2.
let tick = CrossSection::new(
    vec![
        Member::new(1.0, 10.0, false, false),
        Member::new(0.5, 10.0, false, false),
        Member::new(2.0, 10.0, false, false),
        Member::new(-1.0, 10.0, false, false),
    ],
    0,
)?;
assert_eq!(ad.update(tick), Some(2.0));
```

### Python

```python
import wickra as ta

ad = ta.AdvanceDecline()
# change sign classifies each symbol; 3 up, 1 down -> +2.
print(ad.update([1.0, 0.5, 2.0, -1.0], [10.0] * 4, [False] * 4, [False] * 4))
# 2.0
```

### Node

```js
const { AdvanceDecline } = require('wickra');

const ad = new AdvanceDecline();
const flags = [false, false, false, false];
console.log(ad.update([1.0, 0.5, 2.0, -1.0], [10, 10, 10, 10], flags, flags));
// 2
```

### Streaming

```python
import wickra as ta

ad = ta.AdvanceDecline()
flags = [False] * 4
vol = [10.0] * 4
# Cumulative line: +2 -> 0 -> 0.
print(ad.update([1.0, 0.5, 2.0, -1.0], vol, flags, flags))   # 2.0
print(ad.update([-1.0, -0.5, -2.0, 1.0], vol, flags, flags)) # 0.0  (net -2)
print(ad.update([0.0, 0.0, 1.0, -1.0], vol, flags, flags))   # 0.0  (net 0)
```

## Interpretation

The A/D Line is the oldest and most widely watched measure of market breadth. It
answers a question a price index cannot: *how many stocks are actually
participating?*

1. **Confirmation.** When an index makes a new high and the A/D Line makes a new
   high with it, the advance is broad and healthy.
2. **Divergence.** When the index makes a new high but the A/D Line rolls over,
   the rally is narrowing — fewer names are carrying it — a classic warning that
   often precedes a top.
3. **Trend.** The slope of the line is the breadth trend; a persistently rising
   line is accumulation across the universe, a falling line distribution.

Only the line's slope and its divergences against price are meaningful; the
absolute level depends on the (arbitrary) starting point.

## Common pitfalls

- **Level is arbitrary.** The line is a running sum from an arbitrary zero —
  never compare absolute levels across runs or universes, only slopes and
  divergences.
- **Universe must be stable.** A breadth reading only makes sense over a fixed
  universe; if the membership changes between ticks the net counts are no longer
  comparable.
- **Unchanged vs. missing.** Symbols you have no data for should be *omitted*
  from the cross-section, not passed with `change == 0` — an unchanged member is
  a real, counted "neither", not a missing one.

## References

- Colby, R. W. (2002). *The Encyclopedia of Technical Market Indicators* (2nd
  ed.) — Advance/Decline Line.
- Edwards, R. D., Magee, J., & Bassetti, W. H. C. *Technical Analysis of Stock
  Trends* — breadth and divergence analysis.

## See also

- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
- [Warmup-Periods](/Warmup-Periods) — verified warmup table.
