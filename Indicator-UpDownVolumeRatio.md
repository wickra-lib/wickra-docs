# UpDownVolumeRatio

> The Up/Down Volume Ratio — total advancing volume divided by total declining
> volume across a universe. Above one is accumulation, below one is distribution.

## Quick reference

| Item                | Value                                                       |
|---------------------|-------------------------------------------------------------|
| Family              | Market Breadth                                              |
| Input type          | `CrossSection` — the per-symbol state of the whole universe |
| Output type         | `f64` (a ratio, ≥ 0)                                       |
| Output range        | `0..` (unbounded above)                                     |
| Default parameters  | none                                                        |
| Warmup period       | `1`                                                         |
| Interpretation      | Volume-flow breadth                                        |

## Formula

```
ratio = advancing_volume / max(declining_volume, 1.0)   # per tick
```

where `advancing_volume` is the total `volume` of symbols with a positive `change`
and `declining_volume` the total `volume` of symbols with a negative `change`. When
a tick has no declining volume the divisor is floored to `1.0`, so the ratio stays
finite. Stateless per tick and O(universe size). See
`crates/wickra-core/src/indicators/up_down_volume_ratio.rs`.

## Parameters

None. Construct with `UpDownVolumeRatio::new()`.

| Parameter | Type | Default | Source |
|-----------|------|---------|--------|
| —         | —    | —       | None.  |

## Inputs / Outputs

`Indicator<Input = CrossSection, Output = f64>`:

```rust
use wickra::{CrossSection, Indicator, UpDownVolumeRatio};

const _: fn(&mut UpDownVolumeRatio, CrossSection) -> Option<f64> =
    <UpDownVolumeRatio as Indicator>::update;
```

The bindings pass a tick as four equal-length parallel arrays:

- **Python**: `update(change, volume, new_high, new_low)`; `batch(...)` returns a
  1-D `ndarray`.
- **Node**: `update(change, volume, newHigh, newLow)`; `batch` returns `number[]`.
- **WASM**: `update(change, volume, newHigh, newLow)` only; flag arrays are numeric.

## Warmup

`warmup_period() == 1`; defined from the first tick (tests
`accessors_and_metadata`, `first_tick_emits_ratio`).

## Edge cases

- **No declining volume.** The divisor is floored to `1.0`, so the ratio degrades
  to the advancing-volume total instead of dividing by zero (test
  `zero_declining_volume_floors_denominator`).
- **Reset.** `reset()` returns the indicator to not-ready (test
  `reset_clears_state`).
- **Invalid / empty universe.** Rejected at construction by `CrossSection::new`.

## Examples

### Rust

```rust
use wickra::{CrossSection, Indicator, Member, UpDownVolumeRatio};

let mut udv = UpDownVolumeRatio::new();
// advancing volume 150, declining volume 50 -> 3.0.
let tick = CrossSection::new(
    vec![
        Member::new(1.0, 150.0, false, false),
        Member::new(-1.0, 50.0, false, false),
    ],
    0,
)?;
assert_eq!(udv.update(tick), Some(3.0));
```

### Python

```python
import wickra as ta

udv = ta.UpDownVolumeRatio()
print(udv.update([1.0, -1.0], [150.0, 50.0], [False, False], [False, False]))
# 3.0
```

### Node

```js
const { UpDownVolumeRatio } = require('wickra');

const udv = new UpDownVolumeRatio();
console.log(udv.update([1.0, -1.0], [150, 50], [false, false], [false, false]));
// 3
```

### Streaming

```python
import wickra as ta

udv = ta.UpDownVolumeRatio()
print(udv.update([1.0, -1.0], [150.0, 50.0], [False, False], [False, False]))  # 3.0
print(udv.update([1.0], [100.0], [False], [False]))                            # 100.0 (no down vol)
```

## Interpretation

The Up/Down Volume Ratio measures where the money is going.

1. **Above one.** More volume in advancing issues — accumulation.
2. **Below one.** More volume in declining issues — distribution.
3. **Thrust signals.** Sustained extreme readings (e.g. a 9-to-1 up-volume day)
   are classic breadth-thrust confirmations of a powerful move.

## Common pitfalls

- **Floored denominator.** When declining volume is zero the ratio equals advancing
  volume; do not read that single value as an unbounded spike.
- **Outliers.** A single huge-volume name can dominate the ratio — consider whether
  to cap or winsorise volumes upstream.
- **Universe must be stable.** Changing membership makes the totals incomparable.

## References

- Colby, R. W. (2002). *The Encyclopedia of Technical Market Indicators* (2nd ed.)
  — Upside/Downside Volume.

## See also

- [Indicator-Trin](Indicator-Trin) — combines this with the advance/decline ratio.
- [Indicator-AdVolumeLine](Indicator-AdVolumeLine) — the cumulative net-volume line.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
