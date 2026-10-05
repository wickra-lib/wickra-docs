# CumulativeVolumeIndex

> The Cumulative Volume Index — the running total of net advancing volume,
> `CVI_t = CVI_{t−1} + (advancing volume − declining volume)`. Only its slope and
> divergences against a price index carry meaning, not its level.

## Quick reference

| Item                | Value                                                       |
|---------------------|-------------------------------------------------------------|
| Family              | Market Breadth                                              |
| Input type          | `CrossSection` — the per-symbol state of the whole universe |
| Output type         | `f64` (cumulative; may be negative)                       |
| Output range        | unbounded; may be negative                                |
| Default parameters  | none                                                        |
| Warmup period       | `1`                                                         |
| Interpretation      | Cumulative volume breadth (slope / divergence)            |

## Formula

```
net   = advancing_volume - declining_volume
index = index + net                                     # CVI_t = CVI_{t-1} + net
```

Each tick adds the volume of advancing issues minus the volume of declining
issues — the standard definition (StockCharts, MetaStock). Unchanged issues
contribute to neither side, and a tick with no volume leaves the index
unchanged. The increment is *not* divided by total volume, so the CVI carries
the same values as the [AdVolumeLine](/Indicators/Indicator-AdVolumeLine); the
index is path-dependent, so only its slope and divergences against a price
index carry meaning. Stateful and O(universe size) per tick.
See `crates/wickra-core/src/indicators/cumulative_volume_index.rs`.

## Parameters

None. Construct with `CumulativeVolumeIndex::new()`.

| Parameter | Type | Default | Source |
|-----------|------|---------|--------|
| —         | —    | —       | None.  |

## Inputs / Outputs

`Indicator<Input = CrossSection, Output = f64>`:

```rust
use wickra::{CrossSection, CumulativeVolumeIndex, Indicator};

const _: fn(&mut CumulativeVolumeIndex, CrossSection) -> Option<f64> =
    <CumulativeVolumeIndex as Indicator>::update;
```

The bindings pass a tick as four equal-length parallel arrays:

- **Python**: `update(change, volume, new_high, new_low)`; `batch(...)` returns a
  `array.array('d')`.
- **Node**: `update(change, volume, newHigh, newLow)`; `batch` returns `number[]`.
- **WASM**: `update(change, volume, newHigh, newLow)` only; flag arrays are numeric.

## Warmup

`warmup_period() == 1`; defined from the first tick (tests
`accessors_and_metadata`, `first_tick_emits_net_volume`).

## Edge cases

- **Raw net increment.** Each tick adds advancing volume minus declining volume
  (tests `first_tick_emits_net_volume`, `index_accumulates_net_volume`).
- **Zero volume.** A volume-free tick leaves the index unchanged (test
  `zero_volume_leaves_index_unchanged`).
- **Reset.** `reset()` restarts the index from zero (test `reset_clears_state`).
- **Invalid / empty universe.** Rejected at construction by `CrossSection::new`.

## Examples

### Rust

```rust
use wickra::{CrossSection, CumulativeVolumeIndex, Indicator, Member};

let mut cvi = CumulativeVolumeIndex::new();
// adv vol 150, dec vol 50 -> 150 - 50 = 100.
let tick = CrossSection::new(
    vec![
        Member::new(1.0, 150.0, false, false),
        Member::new(-1.0, 50.0, false, false),
    ],
    0,
)?;
assert_eq!(cvi.update(tick), Some(100.0));
```

### Python

```python
import wickra as ta

cvi = ta.CumulativeVolumeIndex()
print(cvi.update([1.0, -1.0], [150.0, 50.0], [False, False], [False, False]))
# 100.0
```

### Node

```js
const { CumulativeVolumeIndex } = require('wickra');

const cvi = new CumulativeVolumeIndex();
console.log(cvi.update([1.0, -1.0], [150, 50], [false, false], [false, false]));
// 100
```

### Streaming

```python
import wickra as ta

cvi = ta.CumulativeVolumeIndex()
print(cvi.update([1.0, -1.0], [150.0, 50.0], [False, False], [False, False]))  # 100.0
print(cvi.update([1.0, -1.0], [60.0, 60.0], [False, False], [False, False]))   # 100.0  (net 0)
print(cvi.update([0.0], [0.0], [False], [False]))                              # 100.0  (no volume)
```

## Interpretation

The CVI tracks volume flowing into advancing versus declining issues across the
whole market.

1. **Slope.** A rising index is net accumulation across the universe; a falling
   index, distribution.
2. **Divergence.** Like any cumulative line, divergence against price warns of a
   waning move.
3. **Confirmation.** A new price high confirmed by a new CVI high shows volume
   participating in the advance; a price high on a lower CVI does not.

## Common pitfalls

- **Level is arbitrary.** Only slope and divergences matter, never the absolute
  level.
- **Not normalised.** Increments are raw volume, so the index drifts with secular
  growth in trading activity; compare slopes within a regime, not magnitudes
  across very different volume regimes. For a volume-normalised breadth
  read use a ratio such as the [UpDownVolumeRatio](/Indicators/Indicator-UpDownVolumeRatio).
- **Universe must be stable.** Changing membership makes the increments incomparable.

## References

- Colby, R. W. (2002). *The Encyclopedia of Technical Market Indicators* (2nd ed.)
  — Cumulative Volume Index.

## See also

- [Indicator-AdVolumeLine](/Indicators/Indicator-AdVolumeLine) — the same cumulative
  net-volume line under its other name.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
