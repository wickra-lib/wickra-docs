# AbsoluteBreadthIndex

> The Absolute Breadth Index — the magnitude of net advancing issues,
> `|advancers - decliners|`. It ignores direction and measures only how decisively
> the universe moved — a "market thermometer".

## Quick reference

| Item                | Value                                                       |
|---------------------|-------------------------------------------------------------|
| Family              | Market Breadth                                              |
| Input type          | `CrossSection` — the per-symbol state of the whole universe |
| Output type         | `f64` (≥ 0)                                                |
| Output range        | `0..=N` for a universe of `N` symbols                      |
| Default parameters  | none                                                        |
| Warmup period       | `1`                                                         |
| Interpretation      | Breadth magnitude / activity                               |

## Formula

```
abi = |advancers - decliners|   # per tick, by sign of each member's change
```

The ABI discards the sign of net breadth and keeps only its magnitude: a high
reading means the universe moved decisively one way or the other (high internal
activity), a low reading means advances and declines were nearly balanced (a quiet,
directionless market). Stateless per tick and O(universe size). See
`crates/wickra-core/src/indicators/absolute_breadth_index.rs`.

## Parameters

None. Construct with `AbsoluteBreadthIndex::new()`.

| Parameter | Type | Default | Source |
|-----------|------|---------|--------|
| —         | —    | —       | None.  |

## Inputs / Outputs

`Indicator<Input = CrossSection, Output = f64>`:

```rust
use wickra::{AbsoluteBreadthIndex, CrossSection, Indicator};

const _: fn(&mut AbsoluteBreadthIndex, CrossSection) -> Option<f64> =
    <AbsoluteBreadthIndex as Indicator>::update;
```

The bindings pass a tick as four equal-length parallel arrays:

- **Python**: `update(change, volume, new_high, new_low)`; `batch(...)` returns a
  1-D `ndarray`.
- **Node**: `update(change, volume, newHigh, newLow)`; `batch` returns `number[]`.
- **WASM**: `update(change, volume, newHigh, newLow)` only; flag arrays are numeric.

## Warmup

`warmup_period() == 1`; defined from the first tick (tests
`accessors_and_metadata`, `magnitude_ignores_direction`).

## Edge cases

- **Direction-blind.** `(2 up, 5 down)` and `(5 up, 2 down)` both yield `3.0`
  (test `magnitude_ignores_direction`).
- **Balanced universe.** Equal advancers and decliners yield `0.0` (test
  `balanced_universe_yields_zero`).
- **Reset.** `reset()` returns the indicator to not-ready (test
  `reset_clears_state`).
- **Invalid / empty universe.** Rejected at construction by `CrossSection::new`.

## Examples

### Rust

```rust
use wickra::{AbsoluteBreadthIndex, CrossSection, Indicator, Member};

let mut abi = AbsoluteBreadthIndex::new();
// 2 advancers, 5 decliners -> |2 - 5| = 3.
let tick = CrossSection::new(
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
assert_eq!(abi.update(tick), Some(3.0));
```

### Python

```python
import wickra as ta

abi = ta.AbsoluteBreadthIndex()
change = [1.0, 1.0, -1.0, -1.0, -1.0]
print(abi.update(change, [10.0] * 5, [False] * 5, [False] * 5))
# 1.0   (|2 - 3|)
```

### Node

```js
const { AbsoluteBreadthIndex } = require('wickra');

const abi = new AbsoluteBreadthIndex();
const flags = [false, false, false, false, false];
console.log(abi.update([1, 1, -1, -1, -1], [10, 10, 10, 10, 10], flags, flags));
// 1
```

### Streaming

```python
import wickra as ta

abi = ta.AbsoluteBreadthIndex()
print(abi.update([1.0, 1.0, -1.0, -1.0, -1.0], [10.0] * 5, [False] * 5, [False] * 5))  # 1.0
print(abi.update([1.0, 1.0, 1.0, -1.0, -1.0], [10.0] * 5, [False] * 5, [False] * 5))   # 1.0 (same magnitude)
```

## Interpretation

The ABI is read as a volatility/activity gauge rather than a directional one.

1. **High readings.** Strong internal divergence — the market is "agitated", which
   often clusters near turning points.
2. **Low readings.** A balanced, quiet tape with little net conviction.
3. **Smoothing.** Often viewed through a moving average and compared to its own
   history; the raw value depends on universe size.

## Common pitfalls

- **No direction.** The ABI cannot tell you *which way* the market moved — pair it
  with `TickIndex` or the A/D Line for direction.
- **Universe-dependent.** The scale grows with the universe; compare only within a
  fixed universe.

## References

- Fosback, N. (1976). *Stock Market Logic* — Absolute Breadth Index.

## See also

- [Indicator-TickIndex](/Indicators/Indicator-TickIndex) — the signed net of the same counts.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
