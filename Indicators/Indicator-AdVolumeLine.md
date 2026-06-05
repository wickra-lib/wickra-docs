# AdVolumeLine

> The Advance/Decline Volume Line — the running cumulative sum of net advancing
> volume across a universe. The volume-weighted analogue of the A/D Line: a rising
> line means volume is flowing into advancing issues.

## Quick reference

| Item                | Value                                                       |
|---------------------|-------------------------------------------------------------|
| Family              | Market Breadth                                              |
| Input type          | `CrossSection` — the per-symbol state of the whole universe |
| Output type         | `f64` (cumulative net-volume line)                         |
| Output range        | unbounded; may be negative                                 |
| Default parameters  | none                                                        |
| Warmup period       | `1`                                                         |
| Interpretation      | Volume-weighted market breadth                             |

## Formula

```
net  = advancing_volume - declining_volume   # per tick
line = line + net                            # cumulative
```

where `advancing_volume` is the total `volume` of symbols with a positive `change`
and `declining_volume` the total `volume` of symbols with a negative `change`
(unchanged symbols contribute to neither). The line is a running total, so only its
slope and divergences against price matter, not its absolute level. Stateless per
tick and O(universe size). See
`crates/wickra-core/src/indicators/ad_volume_line.rs`.

## Parameters

None. Construct with `AdVolumeLine::new()`.

| Parameter | Type | Default | Source |
|-----------|------|---------|--------|
| —         | —    | —       | None.  |

## Inputs / Outputs

`Indicator<Input = CrossSection, Output = f64>`:

```rust
use wickra::{AdVolumeLine, CrossSection, Indicator};

const _: fn(&mut AdVolumeLine, CrossSection) -> Option<f64> =
    <AdVolumeLine as Indicator>::update;
```

A `CrossSection` is one tick carrying the universe as a list of `Member`s. The
bindings pass a tick as four equal-length parallel arrays:

- **Python**: `update(change, volume, new_high, new_low)`; `batch(...)` takes one
  array group per tick and returns a 1-D `ndarray`.
- **Node**: `update(change, volume, newHigh, newLow)`; `batch` returns `number[]`.
- **WASM**: `update(change, volume, newHigh, newLow)` only; the flag arrays are
  numeric (non-zero is true).

## Warmup

`warmup_period() == 1`; defined from the first tick (tests
`accessors_and_metadata`, `first_tick_emits_net_volume`).

## Edge cases

- **Unchanged volume ignored.** Volume on symbols with `change == 0` counts toward
  neither bucket (test `unchanged_volume_is_ignored`).
- **Cumulative state.** The line accumulates and can go negative (test
  `line_accumulates_across_ticks`).
- **Reset.** `reset()` restarts the line from zero (test `reset_clears_state`).
- **Invalid / empty universe.** Rejected at construction by `CrossSection::new`;
  surfaced as `ValueError` / `Error` in the bindings.

## Examples

### Rust

```rust
use wickra::{AdVolumeLine, CrossSection, Indicator, Member};

let mut adv = AdVolumeLine::new();
// advancing volume 150, declining volume 50 -> net +100.
let tick = CrossSection::new(
    vec![
        Member::new(1.0, 150.0, false, false),
        Member::new(-1.0, 50.0, false, false),
    ],
    0,
)?;
assert_eq!(adv.update(tick), Some(100.0));
```

### Python

```python
import wickra as ta

adv = ta.AdVolumeLine()
print(adv.update([1.0, -1.0], [150.0, 50.0], [False, False], [False, False]))
# 100.0
```

### Node

```js
const { AdVolumeLine } = require('wickra');

const adv = new AdVolumeLine();
console.log(adv.update([1.0, -1.0], [150, 50], [false, false], [false, false]));
// 100
```

### Streaming

```python
import wickra as ta

adv = ta.AdVolumeLine()
print(adv.update([1.0, -1.0], [150.0, 50.0], [False, False], [False, False]))  # 100.0
print(adv.update([1.0, -1.0], [60.0, 60.0], [False, False], [False, False]))   # 100.0 (net 0)
print(adv.update([1.0], [30.0], [False], [False]))                             # 130.0
```

## Interpretation

The AD Volume Line answers "is volume confirming the breadth move?".

1. **Confirmation.** A price index and the AD Volume Line rising together mean
   volume is supporting the advance.
2. **Divergence.** A rising index with a flat or falling AD Volume Line warns that
   advancing issues are gaining on light volume — weak participation.
3. **Volume vs. issues.** Compared to the plain A/D Line (issue counts), the volume
   line weights each issue by how much actually traded, so a few heavily-traded
   names can dominate.

## Common pitfalls

- **Level is arbitrary.** Like any cumulative line, only slope and divergences
  matter, never the absolute level.
- **Secular volume growth.** Raw net volume grows with overall market activity; for
  a volume-growth-adjusted reading use `CumulativeVolumeIndex`.
- **Universe must be stable.** Changing membership between ticks makes the totals
  incomparable.

## References

- Colby, R. W. (2002). *The Encyclopedia of Technical Market Indicators* (2nd ed.)
  — Advance/Decline Volume Line.

## See also

- [Indicator-CumulativeVolumeIndex](/Indicators/Indicator-CumulativeVolumeIndex) — the
  volume-normalised variant.
- [Indicator-AdvanceDecline](/Indicators/Indicator-AdvanceDecline) — the issue-count A/D Line.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
