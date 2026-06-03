# Trin

> TRIN (the Arms Index) — the advance/decline ratio divided by the up/down volume
> ratio. It compares the breadth of a move in *issues* to the breadth in *volume*;
> below one is bullish, above one is bearish.

## Quick reference

| Item                | Value                                                       |
|---------------------|-------------------------------------------------------------|
| Family              | Market Breadth                                              |
| Input type          | `CrossSection` — the per-symbol state of the whole universe |
| Output type         | `f64` (≥ 0; ~1 is balanced)                                |
| Output range        | `0..` (unbounded above)                                     |
| Default parameters  | none                                                        |
| Warmup period       | `1`                                                         |
| Interpretation      | Breadth-vs-volume balance                                  |

## Formula

```
ad_ratio     = advancers / max(decliners, 1)
volume_ratio = max(advancing_volume, 1.0) / max(declining_volume, 1.0)
trin         = ad_ratio / volume_ratio
```

TRIN asks whether volume is concentrated in the issues that are moving. A value
near `1.0` means issues and volume are in balance; below `1.0` is bullish (advancing
issues are absorbing proportionally more volume); above `1.0` is bearish. To stay
finite on degenerate ticks the decliner count is floored to one and both volume sums
to `1.0`. Stateless per tick and O(universe size). See
`crates/wickra-core/src/indicators/trin.rs`.

## Parameters

None. Construct with `Trin::new()`.

| Parameter | Type | Default | Source |
|-----------|------|---------|--------|
| —         | —    | —       | None.  |

## Inputs / Outputs

`Indicator<Input = CrossSection, Output = f64>`:

```rust
use wickra::{CrossSection, Indicator, Trin};

const _: fn(&mut Trin, CrossSection) -> Option<f64> = <Trin as Indicator>::update;
```

The bindings pass a tick as four equal-length parallel arrays:

- **Python**: `update(change, volume, new_high, new_low)`; `batch(...)` returns a
  1-D `ndarray`.
- **Node**: `update(change, volume, newHigh, newLow)`; `batch` returns `number[]`.
- **WASM**: `update(change, volume, newHigh, newLow)` only; flag arrays are numeric.

## Warmup

`warmup_period() == 1`; defined from the first tick (tests
`accessors_and_metadata`, `balanced_breadth_yields_one`).

## Edge cases

- **Balanced breadth.** Equal issue and volume ratios give `1.0` (test
  `balanced_breadth_yields_one`).
- **Heavy declining volume.** Pushes TRIN above one (test
  `heavy_declining_volume_pushes_above_one`).
- **Zero decliners / volume.** Counts and volume sums are floored, so the reading
  stays finite (test `zero_decliners_and_volume_are_floored`).
- **Reset.** `reset()` returns the indicator to not-ready (test
  `reset_clears_state`).
- **Invalid / empty universe.** Rejected at construction by `CrossSection::new`.

## Examples

### Rust

```rust
use wickra::{CrossSection, Indicator, Member, Trin};

let mut trin = Trin::new();
// 3 advancers / 1 decliner = 3; adv vol 150 / dec vol 50 = 3; TRIN = 1.0.
let tick = CrossSection::new(
    vec![
        Member::new(1.0, 50.0, false, false),
        Member::new(1.0, 50.0, false, false),
        Member::new(1.0, 50.0, false, false),
        Member::new(-1.0, 50.0, false, false),
    ],
    0,
)?;
assert_eq!(trin.update(tick), Some(1.0));
```

### Python

```python
import wickra as ta

trin = ta.Trin()
print(trin.update([1.0, 1.0, 1.0, -1.0], [50.0] * 4, [False] * 4, [False] * 4))
# 1.0
```

### Node

```js
const { Trin } = require('wickra');

const trin = new Trin();
const flags = [false, false, false, false];
console.log(trin.update([1, 1, 1, -1], [50, 50, 50, 50], flags, flags));
// 1
```

### Streaming

```python
import wickra as ta

trin = ta.Trin()
# balanced -> 1.0
print(trin.update([1.0, 1.0, 1.0, -1.0], [50.0] * 4, [False] * 4, [False] * 4))  # 1.0
# 2 up / 2 down = 1; adv vol 20 / dec vol 80 = 0.25; TRIN = 4.0 (bearish)
print(trin.update([1.0, 1.0, -1.0, -1.0], [10.0, 10.0, 40.0, 40.0], [False] * 4, [False] * 4))  # 4.0
```

## Interpretation

TRIN (TRading INdex) is one of the most watched intraday breadth gauges. Note the
inverted scale: **low is bullish**.

1. **Below 1.0.** Volume is flowing into advancing issues more than their count
   alone implies — bullish.
2. **Above 1.0.** Declining issues are soaking up disproportionate volume —
   bearish.
3. **Extremes.** Very high TRIN (e.g. > 2) often marks a selling climax / washout
   that fades; very low TRIN can mark a buying climax.

## Common pitfalls

- **Inverted scale.** Many newcomers read TRIN backwards — remember low is strong.
- **Floored inputs.** On degenerate ticks (no decliners, one-sided volume) the
  floors keep TRIN finite but the value is a boundary artefact, not a clean signal.
- **Universe must be stable.** Changing membership makes the ratios incomparable.

## References

- Arms, R. W. (1989). *The Arms Index (TRIN)*.

## See also

- [Indicator-AdvanceDeclineRatio](Indicator-AdvanceDeclineRatio) — the numerator.
- [Indicator-UpDownVolumeRatio](Indicator-UpDownVolumeRatio) — the denominator.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
