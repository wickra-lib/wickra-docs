# BullishPercentIndex

> The Bullish Percent Index (BPI) — the percentage of symbols in a universe on a
> point-and-figure buy signal. A bounded `0..=100` gauge of how many issues are in
> a confirmed uptrend.

## Quick reference

| Item                | Value                                                       |
|---------------------|-------------------------------------------------------------|
| Family              | Market Breadth                                              |
| Input type          | `CrossSection` — the per-symbol state of the whole universe |
| Output type         | `f64` (a percentage in `0..=100`)                         |
| Output range        | `0..=100`                                                 |
| Default parameters  | none                                                        |
| Warmup period       | `1`                                                         |
| Interpretation      | Confirmed-uptrend participation                          |

## Formula

```
bpi = 100 * on_buy_signal_count / universe_size   # per tick
```

where `on_buy_signal_count` is the number of members whose `on_buy_signal` flag is
set (the caller evaluates each symbol's point-and-figure chart when it builds the
tick). The universe is non-empty by construction, so the share is always defined.
Stateless per tick and O(universe size). See
`crates/wickra-core/src/indicators/bullish_percent_index.rs`.

## Parameters

None. Construct with `BullishPercentIndex::new()`. (The point-and-figure box/reversal
settings live in the caller-supplied `on_buy_signal` flag.)

| Parameter | Type | Default | Source |
|-----------|------|---------|--------|
| —         | —    | —       | None.  |

## Inputs / Outputs

`Indicator<Input = CrossSection, Output = f64>`:

```rust
use wickra::{BullishPercentIndex, CrossSection, Indicator};

const _: fn(&mut BullishPercentIndex, CrossSection) -> Option<f64> =
    <BullishPercentIndex as Indicator>::update;
```

This indicator reads the per-symbol `on_buy_signal` flag, which is **not** part of
the core four signals — so its bindings take a **fifth** array (`on_buy_signal`).
Build the members with `Member::with_signals(change, volume, new_high, new_low,
above_ma, on_buy_signal)`.

- **Python**: `update(change, volume, new_high, new_low, on_buy_signal)`;
  `batch(...)` takes five array groups per tick and returns a 1-D `ndarray`.
- **Node**: `update(change, volume, newHigh, newLow, onBuySignal)`; `batch` returns
  `number[]`.
- **WASM**: `update(change, volume, newHigh, newLow, onBuySignal)` only; every array
  is numeric (non-zero is true).

## Warmup

`warmup_period() == 1`; defined from the first tick (tests
`accessors_and_metadata`, `first_tick_emits_percentage`).

## Edge cases

- **All / none bullish.** Returns `100.0` / `0.0` (tests `all_bullish_is_one_hundred`,
  `none_bullish_is_zero`).
- **Reset.** `reset()` returns the indicator to not-ready (test
  `reset_clears_state`).
- **Invalid / empty universe.** Rejected at construction by `CrossSection::new`.
- **Ragged arrays.** The bindings reject a tick whose `on_buy_signal` array length
  differs from the others.

## Examples

### Rust

```rust
use wickra::{BullishPercentIndex, CrossSection, Indicator, Member};

let mut bpi = BullishPercentIndex::new();
// 2 of 4 symbols on a buy signal -> 50%.
let tick = CrossSection::new(
    vec![
        Member::with_signals(1.0, 10.0, false, false, false, true),
        Member::with_signals(1.0, 10.0, false, false, false, true),
        Member::with_signals(-1.0, 10.0, false, false, false, false),
        Member::with_signals(-1.0, 10.0, false, false, false, false),
    ],
    0,
)?;
assert_eq!(bpi.update(tick), Some(50.0));
```

### Python

```python
import wickra as ta

bpi = ta.BullishPercentIndex()
# fifth array is the per-symbol point-and-figure buy-signal flag.
print(bpi.update([1.0, 1.0, -1.0, -1.0], [10.0] * 4, [False] * 4, [False] * 4, [True, True, False, False]))
# 50.0
```

### Node

```js
const { BullishPercentIndex } = require('wickra');

const bpi = new BullishPercentIndex();
const flags = [false, false, false, false];
console.log(
  bpi.update([1, 1, -1, -1], [10, 10, 10, 10], flags, flags, [true, true, false, false]),
);
// 50
```

### Streaming

```python
import wickra as ta

bpi = ta.BullishPercentIndex()
flags = [False] * 4
vol = [10.0] * 4
print(bpi.update([1.0, 1.0, -1.0, -1.0], vol, flags, flags, [True, True, False, False]))  # 50.0
print(bpi.update([1.0, 1.0, 1.0, 1.0], vol, flags, flags, [True, True, True, True]))       # 100.0
```

## Interpretation

The BPI is a classic point-and-figure breadth gauge with well-defined zones.

1. **Above 70.** Overbought — broad strength, but a crowded market vulnerable to a
   reversal.
2. **Below 30.** Oversold — broad weakness, a washout candidate.
3. **Reversals from the zones.** A turn down from above 70 or up from below 30 (the
   index reversing into a new P&F column) is the classic BPI sell / buy trigger.

## Common pitfalls

- **Caller defines the signal.** This indicator does not build point-and-figure
  charts; it counts the `on_buy_signal` flag you supply, so keep the box size and
  reversal amount consistent.
- **Fifth array.** Like `PercentAboveMa`, the bindings require the extra
  `on_buy_signal` array — a four-array call will not type-check.
- **Universe must be stable.** Changing membership makes the percentages
  incomparable.

## References

- Cohen, A. W. — *point-and-figure* charting and the Bullish Percent Index
  (popularised by Dorsey, T. J., *Point and Figure Charting*).

## See also

- [Indicator-PercentAboveMa](Indicator-PercentAboveMa) — the moving-average
  participation analogue.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
