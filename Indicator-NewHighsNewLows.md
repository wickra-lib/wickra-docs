# NewHighsNewLows

> New Highs − New Lows — the number of symbols printing a new period high minus the
> number printing a new period low across a universe. A leadership gauge built from
> the per-symbol new-extreme flags.

## Quick reference

| Item                | Value                                                       |
|---------------------|-------------------------------------------------------------|
| Family              | Market Breadth                                              |
| Input type          | `CrossSection` — the per-symbol state of the whole universe |
| Output type         | `f64` (net count; may be negative)                         |
| Output range        | `-N..=N` for a universe of `N` symbols                     |
| Default parameters  | none                                                        |
| Warmup period       | `1`                                                         |
| Interpretation      | Leadership breadth / new-extreme participation             |

## Formula

```
nhnl = new_highs - new_lows   # per tick, from each member's new_high / new_low flags
```

where `new_highs` counts members whose `new_high` flag is set and `new_lows` counts
members whose `new_low` flag is set. Stateless per tick and O(universe size). See
`crates/wickra-core/src/indicators/new_highs_new_lows.rs`.

## Parameters

None. Construct with `NewHighsNewLows::new()`.

| Parameter | Type | Default | Source |
|-----------|------|---------|--------|
| —         | —    | —       | None.  |

## Inputs / Outputs

`Indicator<Input = CrossSection, Output = f64>`:

```rust
use wickra::{CrossSection, Indicator, NewHighsNewLows};

const _: fn(&mut NewHighsNewLows, CrossSection) -> Option<f64> =
    <NewHighsNewLows as Indicator>::update;
```

This indicator reads the `new_high` / `new_low` flags (not `change` or `volume`).
The bindings pass a tick as four equal-length parallel arrays:

- **Python**: `update(change, volume, new_high, new_low)`; `batch(...)` returns a
  1-D `ndarray`.
- **Node**: `update(change, volume, newHigh, newLow)`; `batch` returns `number[]`.
- **WASM**: `update(change, volume, newHigh, newLow)` only; the flag arrays are
  numeric (non-zero is true).

## Warmup

`warmup_period() == 1`; defined from the first tick (tests
`accessors_and_metadata`, `first_tick_emits_net_extremes`).

## Edge cases

- **More lows than highs.** Returns a negative value (test
  `more_lows_than_highs_is_negative`).
- **No extremes.** A tick with no new highs or lows returns `0.0` (test
  `no_extremes_yields_zero`).
- **Reset.** `reset()` returns the indicator to not-ready (test
  `reset_clears_state`).
- **Invalid / empty universe.** Rejected at construction by `CrossSection::new`.

## Examples

### Rust

```rust
use wickra::{CrossSection, Indicator, Member, NewHighsNewLows};

let mut nhnl = NewHighsNewLows::new();
// 2 new highs, 1 new low -> net +1.
let tick = CrossSection::new(
    vec![
        Member::new(1.0, 10.0, true, false),
        Member::new(1.0, 10.0, true, false),
        Member::new(-1.0, 10.0, false, true),
    ],
    0,
)?;
assert_eq!(nhnl.update(tick), Some(1.0));
```

### Python

```python
import wickra as ta

nhnl = ta.NewHighsNewLows()
# new_high flags on the first two, new_low on the third.
print(nhnl.update([1.0, 1.0, -1.0], [10.0] * 3, [True, True, False], [False, False, True]))
# 1.0
```

### Node

```js
const { NewHighsNewLows } = require('wickra');

const nhnl = new NewHighsNewLows();
console.log(
  nhnl.update([1, 1, -1], [10, 10, 10], [true, true, false], [false, false, true]),
);
// 1
```

### Streaming

```python
import wickra as ta

nhnl = ta.NewHighsNewLows()
print(nhnl.update([1.0, 1.0, -1.0], [10.0] * 3, [True, True, False], [False, False, True]))  # 1.0
print(nhnl.update([1.0, -1.0, -1.0], [10.0] * 3, [True, False, False], [False, True, True]))  # -1.0
```

## Interpretation

New Highs − New Lows captures whether fresh leadership is broadening or narrowing.

1. **Positive and rising.** Many names making new highs — leadership is broad and
   the trend is healthy.
2. **Negative during an index advance.** A classic breadth divergence: the index is
   up but more issues are making new lows than highs — the rally is narrowing.
3. **Foundation for the High-Low Index.** This raw net is smoothed (as the
   record-high percent) into the `HighLowIndex`.

## Common pitfalls

- **Flag definition.** The "new high/low" lookback is whatever you used to set the
  flags; keep it consistent across the universe and over time.
- **Universe must be stable.** Changing membership makes the counts incomparable.
- **Raw and noisy.** The day-to-day net is volatile — most analysts smooth it (see
  `HighLowIndex`).

## References

- Colby, R. W. (2002). *The Encyclopedia of Technical Market Indicators* (2nd ed.)
  — New Highs − New Lows.

## See also

- [Indicator-HighLowIndex](Indicator-HighLowIndex) — the smoothed record-high
  percent built on these counts.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
