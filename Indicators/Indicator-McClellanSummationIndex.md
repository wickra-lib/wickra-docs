# McClellanSummationIndex

> The McClellan Summation Index — the running cumulative sum of the McClellan
> Oscillator. Where the oscillator measures breadth *momentum*, the summation index
> integrates it into a longer-term breadth *trend*.

## Quick reference

| Item                | Value                                                       |
|---------------------|-------------------------------------------------------------|
| Family              | Market Breadth                                              |
| Input type          | `CrossSection` — the per-symbol state of the whole universe |
| Output type         | `f64` (cumulative; may be negative)                       |
| Output range        | unbounded; centred on 0                                    |
| Default parameters  | none (fixed 19/39 smoothing)                              |
| Warmup period       | `1`                                                         |
| Interpretation      | Long-term breadth trend                                   |

## Formula

```
osc = McClellanOscillator(tick)   # 19/39 EMA spread of ratio-adjusted net advances
sum = sum + osc                   # cumulative
```

The summation index embeds a [McClellanOscillator](/Indicators/Indicator-McClellanOscillator)
and adds its value on every tick. Because the oscillator seeds to `0.0` on the first
tick, the summation index also starts at `0.0` and is defined from the first update.
It behaves like a slow, smoothed advance/decline line. Stateful and O(universe size)
per tick. See `crates/wickra-core/src/indicators/mcclellan_summation_index.rs`.

## Parameters

None — inherits the oscillator's fixed 19/39 smoothing. Construct with
`McClellanSummationIndex::new()`.

| Parameter | Type | Default | Source |
|-----------|------|---------|--------|
| —         | —    | —       | None.  |

## Inputs / Outputs

`Indicator<Input = CrossSection, Output = f64>`:

```rust
use wickra::{CrossSection, Indicator, McClellanSummationIndex};

const _: fn(&mut McClellanSummationIndex, CrossSection) -> Option<f64> =
    <McClellanSummationIndex as Indicator>::update;
```

The bindings pass a tick as four equal-length parallel arrays:

- **Python**: `update(change, volume, new_high, new_low)`; `batch(...)` returns a
  `array.array('d')`.
- **Node**: `update(change, volume, newHigh, newLow)`; `batch` returns `number[]`.
- **WASM**: `update(change, volume, newHigh, newLow)` only; flag arrays are numeric.

## Warmup

`warmup_period() == 1`; the embedded oscillator seeds on tick one, so the summation
index is `0.0` on the first tick and defined thereafter (tests
`accessors_and_metadata`, `first_tick_starts_at_zero`).

## Edge cases

- **First tick.** The oscillator seeds to `0.0`, so the index starts at `0.0` (test
  `first_tick_starts_at_zero`).
- **Accumulation.** The index adds each oscillator value (test
  `accumulates_the_oscillator`, worked values `0 -> -50 -> -117.5`).
- **Reset.** `reset()` clears both the index and the embedded oscillator, which
  re-seeds on the next tick (test `reset_clears_state`).
- **Invalid / empty universe.** Rejected at construction by `CrossSection::new`.

## Examples

### Rust

```rust
use wickra::{CrossSection, Indicator, McClellanSummationIndex, Member};

let mut msi = McClellanSummationIndex::new();
let tick = CrossSection::new(
    vec![
        Member::new(1.0, 10.0, false, false),
        Member::new(-1.0, 10.0, false, false),
    ],
    0,
)?;
// First tick: oscillator seeds to 0, so the summation index is 0.
assert_eq!(msi.update(tick), Some(0.0));
```

### Python

```python
import wickra as ta

msi = ta.McClellanSummationIndex()
print(msi.update([1.0, -1.0], [10.0, 10.0], [False, False], [False, False]))
# 0.0   (seed)
```

### Node

```js
const { McClellanSummationIndex } = require('wickra');

const msi = new McClellanSummationIndex();
console.log(msi.update([1.0, -1.0], [10, 10], [false, false], [false, false]));
// 0
```

### Streaming

```python
import wickra as ta

msi = ta.McClellanSummationIndex()
flags = [False] * 4
vol = [10.0] * 4
print(msi.update([1.0, 1.0, 1.0, -1.0], vol, flags, flags))    # 0.0    (osc 0)
print(msi.update([-1.0, -1.0, -1.0, 1.0], vol, flags, flags))  # -50.0  (osc -50)
print(msi.update([1.0, 1.0, -1.0, -1.0], vol, flags, flags))   # -117.5 (osc -67.5)
```

## Interpretation

The Summation Index is the McClellan trend gauge.

1. **Above / below zero.** Sustained positive readings mark a bull breadth regime;
   sustained negative, a bear regime.
2. **Zero-line crosses.** A cross of zero is read as a major breadth trend change.
3. **Extremes.** Very high or low levels mark overbought/oversold breadth that often
   precedes a turn.

## Common pitfalls

- **Path-dependent.** Like any cumulative series, the absolute level depends on the
  starting point and the history fed in — compare slopes and zero-crosses, not raw
  levels across runs.
- **Ratio-adjusted base.** Inherits the oscillator's RANA basis, so it is universe-
  size independent but will not match a raw-net Summation Index value-for-value.
- **Universe must be stable.** Changing membership distorts the underlying RANA.

## References

- McClellan, S. & McClellan, M. *Patterns for Profit* — the McClellan Oscillator
  and Summation Index.

## See also

- [Indicator-McClellanOscillator](/Indicators/Indicator-McClellanOscillator) — the oscillator
  this index accumulates.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
