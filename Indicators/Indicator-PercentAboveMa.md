# PercentAboveMa

> Percent Above Moving Average — the percentage of symbols in a universe trading
> above their reference moving average. A bounded `0..=100` participation gauge.

## Quick reference

| Item                | Value                                                       |
|---------------------|-------------------------------------------------------------|
| Family              | Market Breadth                                              |
| Input type          | `CrossSection` — the per-symbol state of the whole universe |
| Output type         | `f64` (a percentage in `0..=100`)                         |
| Output range        | `0..=100`                                                 |
| Default parameters  | none                                                        |
| Warmup period       | `1`                                                         |
| Interpretation      | Trend participation                                       |

## Formula

```
pct = 100 * above_ma_count / universe_size   # per tick
```

where `above_ma_count` is the number of members whose `above_ma` flag is set (the
caller decides which MA — 50-day, 200-day — when it builds the tick). The universe is
non-empty by construction, so the share is always defined. Stateless per tick and
O(universe size). See `crates/wickra-core/src/indicators/percent_above_ma.rs`.

## Parameters

None. Construct with `PercentAboveMa::new()`. (The moving-average length is a
property of the caller-supplied `above_ma` flag, not of this indicator.)

| Parameter | Type | Default | Source |
|-----------|------|---------|--------|
| —         | —    | —       | None.  |

## Inputs / Outputs

`Indicator<Input = CrossSection, Output = f64>`:

```rust
use wickra::{CrossSection, Indicator, PercentAboveMa};

const _: fn(&mut PercentAboveMa, CrossSection) -> Option<f64> =
    <PercentAboveMa as Indicator>::update;
```

This indicator reads the per-symbol `above_ma` flag, which is **not** part of the
core four signals — so its bindings take a **fifth** array (`above_ma`). Build the
members with `Member::with_signals(change, volume, new_high, new_low, above_ma,
on_buy_signal)`.

- **Python**: `update(change, volume, new_high, new_low, above_ma)`; `batch(...)`
  takes five array groups per tick and returns an `array.array('d')`.
- **Node**: `update(change, volume, newHigh, newLow, aboveMa)`; `batch` returns
  `number[]`.
- **WASM**: `update(change, volume, newHigh, newLow, aboveMa)` only; every array is
  numeric (non-zero is true).

## Warmup

`warmup_period() == 1`; defined from the first tick (tests
`accessors_and_metadata`, `first_tick_emits_percentage`).

## Edge cases

- **All above / none above.** Returns `100.0` / `0.0` (tests `all_above_is_one_hundred`,
  `none_above_is_zero`).
- **Reset.** `reset()` returns the indicator to not-ready (test
  `reset_clears_state`).
- **Invalid / empty universe.** Rejected at construction by `CrossSection::new`.
- **Ragged arrays.** The bindings reject a tick whose `above_ma` array length differs
  from the others.

## Examples

### Rust

```rust
use wickra::{CrossSection, Indicator, Member, PercentAboveMa};

let mut pct = PercentAboveMa::new();
// 3 of 4 symbols above their MA -> 75%.
let tick = CrossSection::new(
    vec![
        Member::with_signals(1.0, 10.0, false, false, true, false),
        Member::with_signals(1.0, 10.0, false, false, true, false),
        Member::with_signals(-1.0, 10.0, false, false, true, false),
        Member::with_signals(-1.0, 10.0, false, false, false, false),
    ],
    0,
)?;
assert_eq!(pct.update(tick), Some(75.0));
```

### Python

```python
import wickra as ta

pct = ta.PercentAboveMa()
# fifth array is the per-symbol above-MA flag.
print(pct.update([1.0, 1.0, 1.0, -1.0], [10.0] * 4, [False] * 4, [False] * 4, [True, True, True, False]))
# 75.0
```

### Node

```js
const { PercentAboveMa } = require('wickra');

const pct = new PercentAboveMa();
const flags = [false, false, false, false];
console.log(
  pct.update([1, 1, 1, -1], [10, 10, 10, 10], flags, flags, [true, true, true, false]),
);
// 75
```

### Streaming

```python
import wickra as ta

pct = ta.PercentAboveMa()
flags = [False] * 4
vol = [10.0] * 4
print(pct.update([1.0, 1.0, 1.0, -1.0], vol, flags, flags, [True, True, True, False]))  # 75.0
print(pct.update([1.0, 1.0, -1.0, -1.0], vol, flags, flags, [True, False, False, False]))  # 25.0
```

## Interpretation

"Percent above the 50/200-day MA" is one of the most-watched participation gauges.

1. **High readings (> 80).** Almost the whole universe is in an uptrend — broad
   strength, but also a potential overbought extreme.
2. **Low readings (< 20).** Washout — most names are below their MA.
3. **The 50 line.** Crosses of 50 are read as bull/bear participation regime flips.

## Common pitfalls

- **Caller defines the MA.** This indicator does not compute a moving average; it
  counts the `above_ma` flag you supply, so the MA length and definition are yours
  to keep consistent.
- **Fifth array.** Unlike most breadth indicators, the bindings require the extra
  `above_ma` array — a four-array call will not type-check.
- **Universe must be stable.** Changing membership makes the percentages
  incomparable.

## References

- Colby, R. W. (2002). *The Encyclopedia of Technical Market Indicators* (2nd ed.)
  — Percent of Stocks Above Moving Average.

## See also

- [Indicator-BullishPercentIndex](/Indicators/Indicator-BullishPercentIndex) — the analogous
  point-and-figure participation gauge.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
