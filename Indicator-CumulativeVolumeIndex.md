# CumulativeVolumeIndex

> The Cumulative Volume Index — the running total of *volume-normalised* net
> advancing volume. Like the AD Volume Line, but each tick is divided by its own
> total volume so the index stays comparable across volume regimes.

## Quick reference

| Item                | Value                                                       |
|---------------------|-------------------------------------------------------------|
| Family              | Market Breadth                                              |
| Input type          | `CrossSection` — the per-symbol state of the whole universe |
| Output type         | `f64` (cumulative; may be negative)                       |
| Output range        | unbounded; may be negative                                |
| Default parameters  | none                                                        |
| Warmup period       | `1`                                                         |
| Interpretation      | Volume-normalised cumulative breadth                      |

## Formula

```
net   = advancing_volume - declining_volume
index = index + net / max(total_volume, MIN_POSITIVE)   # cumulative share
```

Each tick contributes the share of its total volume that flowed, net, into advancing
issues. Where the raw [AdVolumeLine](Indicator-AdVolumeLine) sums *absolute* net
volume — and so drifts with secular growth in trading activity — the CVI normalises
each tick by its own total volume, so a one-share-net day counts the same in a thin
market as in a heavy one. When a tick has zero total volume the net is necessarily
zero too, so the increment is zero (the divisor is floored to the smallest positive
`f64` purely to keep the division defined). Stateful and O(universe size) per tick.
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
  1-D `ndarray`.
- **Node**: `update(change, volume, newHigh, newLow)`; `batch` returns `number[]`.
- **WASM**: `update(change, volume, newHigh, newLow)` only; flag arrays are numeric.

## Warmup

`warmup_period() == 1`; defined from the first tick (tests
`accessors_and_metadata`, `first_tick_emits_normalised_net`).

## Edge cases

- **Normalised increment.** Each tick adds net advancing volume divided by total
  volume (test `first_tick_emits_normalised_net`, `index_accumulates_normalised_shares`).
- **Zero total volume.** A volume-free tick leaves the index unchanged (test
  `zero_total_volume_leaves_index_unchanged`).
- **Reset.** `reset()` restarts the index from zero (test `reset_clears_state`).
- **Invalid / empty universe.** Rejected at construction by `CrossSection::new`.

## Examples

### Rust

```rust
use wickra::{CrossSection, CumulativeVolumeIndex, Indicator, Member};

let mut cvi = CumulativeVolumeIndex::new();
// adv vol 150, dec vol 50, total 200 -> (150 - 50) / 200 = 0.5.
let tick = CrossSection::new(
    vec![
        Member::new(1.0, 150.0, false, false),
        Member::new(-1.0, 50.0, false, false),
    ],
    0,
)?;
assert_eq!(cvi.update(tick), Some(0.5));
```

### Python

```python
import wickra as ta

cvi = ta.CumulativeVolumeIndex()
print(cvi.update([1.0, -1.0], [150.0, 50.0], [False, False], [False, False]))
# 0.5
```

### Node

```js
const { CumulativeVolumeIndex } = require('wickra');

const cvi = new CumulativeVolumeIndex();
console.log(cvi.update([1.0, -1.0], [150, 50], [false, false], [false, false]));
// 0.5
```

### Streaming

```python
import wickra as ta

cvi = ta.CumulativeVolumeIndex()
print(cvi.update([1.0, -1.0], [150.0, 50.0], [False, False], [False, False]))  # 0.5
print(cvi.update([1.0, -1.0], [60.0, 60.0], [False, False], [False, False]))   # 0.5  (net 0)
print(cvi.update([0.0], [0.0], [False], [False]))                              # 0.5  (no volume)
```

## Interpretation

The CVI tracks money flow into and out of the whole market, regime-adjusted.

1. **Slope.** A rising index is net accumulation across the universe; a falling
   index, distribution.
2. **Divergence.** Like any cumulative line, divergence against price warns of a
   waning move.
3. **vs. AD Volume Line.** Prefer the CVI when comparing across periods of very
   different total volume; prefer the raw AD Volume Line when absolute net volume is
   what you care about.

## Common pitfalls

- **Level is arbitrary.** Only slope and divergences matter, never the absolute
  level.
- **Normalisation bounds increments.** Each tick contributes at most ±1, so the CVI
  rises more slowly than the raw volume line — do not compare their magnitudes.
- **Universe must be stable.** Changing membership makes the shares incomparable.

## References

- Colby, R. W. (2002). *The Encyclopedia of Technical Market Indicators* (2nd ed.)
  — Cumulative Volume Index.

## See also

- [Indicator-AdVolumeLine](Indicator-AdVolumeLine) — the raw (un-normalised)
  cumulative net-volume line.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
