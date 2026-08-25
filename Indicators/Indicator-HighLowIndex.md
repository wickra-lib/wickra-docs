# HighLowIndex

> The High-Low Index — a simple moving average of the *record high percent*,
> `100 * new_highs / (new_highs + new_lows)`. Above 50 means new highs dominate;
> below 50 means new lows dominate.

## Quick reference

| Item                | Value                                                       |
|---------------------|-------------------------------------------------------------|
| Family              | Market Breadth                                              |
| Input type          | `CrossSection` — the per-symbol state of the whole universe |
| Output type         | `f64` (a percentage in `0..=100`)                         |
| Output range        | `0..=100`                                                 |
| Default parameters  | `period = 10` (classic window)                            |
| Warmup period       | `period`                                                   |
| Interpretation      | Leadership breadth (new highs vs new lows)                |

## Formula

```
record_high_percent = 100 * new_highs / max(new_highs + new_lows, 1)   # per tick
index = SMA(record_high_percent, period)
```

The record high percent is the share of new-extreme issues that are new *highs*;
smoothing it over a window (classically 10) gives the High-Low Index. The new-extreme
count is floored to one so a tick with no new highs or lows contributes `0.0`. Backed
by an internal `Sma`, so the window sum is O(1) per tick. See
`crates/wickra-core/src/indicators/high_low_index.rs`.

## Parameters

| Parameter | Type    | Default | Source                                        |
|-----------|---------|---------|-----------------------------------------------|
| `period`  | `usize` | (10)    | `high_low_index.rs` — `HighLowIndex::new(period)` |

`new(period)` returns `Err(Error::PeriodZero)` if `period == 0`.

## Inputs / Outputs

`Indicator<Input = CrossSection, Output = f64>`:

```rust
use wickra::{CrossSection, HighLowIndex, Indicator};

const _: fn(&mut HighLowIndex, CrossSection) -> Option<f64> =
    <HighLowIndex as Indicator>::update;
```

This indicator reads the `new_high` / `new_low` flags. The bindings pass a tick as
four equal-length parallel arrays; the constructor takes the window length:

- **Python**: `HighLowIndex(period)`, `update(change, volume, new_high, new_low)`;
  `batch(...)` returns an `array.array('d')` with `NaN` during warmup.
- **Node**: `new HighLowIndex(period)`, `update(change, volume, newHigh, newLow)`;
  `batch` returns `number[]` with `NaN` during warmup.
- **WASM**: `new HighLowIndex(period)`, `update(...)` only; flag arrays are numeric.

## Warmup

`warmup_period() == period`; the SMA emits `None` until `period` ticks have been
seen (tests `accessors_and_metadata`, `averages_the_record_high_percent`). A zero
period is rejected (test `rejects_zero_period`).

## Edge cases

- **Warmup.** Returns `None` (Python/Node `NaN`) until the window is full (test
  `averages_the_record_high_percent`).
- **No extremes.** A tick with no new highs or lows floors to a `0.0` record-high
  percent (test `no_extremes_floors_to_zero_percent`).
- **Reset.** `reset()` clears the window and returns the indicator to not-ready
  (test `reset_clears_state`).
- **Zero period.** Rejected at construction (test `rejects_zero_period`).
- **Invalid / empty universe.** Rejected by `CrossSection::new`.

## Examples

### Rust

```rust
use wickra::{CrossSection, HighLowIndex, Indicator, Member};

let mut hli = HighLowIndex::new(2)?;
let highs = CrossSection::new(vec![Member::new(1.0, 1.0, true, false)], 0)?;
assert_eq!(hli.update(highs.clone()), None); // warming up
assert_eq!(hli.update(highs), Some(100.0));  // all new highs
```

### Python

```python
import wickra as ta

hli = ta.HighLowIndex(10)
# 8 new highs, 2 new lows -> record high percent 80.
print(hli.update([1.0] * 10, [10.0] * 10, [True] * 8 + [False] * 2, [False] * 8 + [True] * 2))
# None   (warming up)
```

### Node

```js
const { HighLowIndex } = require('wickra');

const hli = new HighLowIndex(2);
const change = new Array(10).fill(1);
const vol = new Array(10).fill(10);
const highs = [true, true, true, true, true, true, true, true, false, false];
const lows = highs.map((h) => !h);
console.log(hli.update(change, vol, highs, lows)); // null (warming up)
```

### Streaming

```python
import wickra as ta

hli = ta.HighLowIndex(2)
change = [1.0] * 10
vol = [10.0] * 10
# 80% new highs, then 60%.
print(hli.update(change, vol, [True] * 8 + [False] * 2, [False] * 8 + [True] * 2))  # None
print(hli.update(change, vol, [True] * 6 + [False] * 4, [False] * 6 + [True] * 4))  # 70.0
```

## Interpretation

The High-Low Index distils leadership breadth into a single bounded line.

1. **Above 50.** New highs dominate — a broad, healthy uptrend.
2. **Below 50.** New lows dominate — broad weakness.
3. **30 / 70 lines.** Watched as oversold / overbought breadth thresholds; reversals
   from those zones are signals.

## Common pitfalls

- **Flag lookback.** The "new high/low" definition lives in how you set the flags;
  keep it consistent across the universe and over time.
- **Sparse extremes.** When few issues make new highs or lows the record-high
  percent is noisy; the smoothing helps but does not eliminate it.
- **Universe must be stable.** Changing membership makes the percentages
  incomparable.

## References

- Colby, R. W. (2002). *The Encyclopedia of Technical Market Indicators* (2nd ed.)
  — High-Low Index / Record High Percent.

## See also

- [Indicator-NewHighsNewLows](/Indicators/Indicator-NewHighsNewLows) — the raw net these
  percentages are built on.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
- [Warmup-Periods](/Warmup-Periods) — verified warmup table.
