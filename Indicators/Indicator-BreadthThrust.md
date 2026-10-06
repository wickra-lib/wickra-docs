# BreadthThrust

> The Breadth Thrust (Zweig) — an exponential moving average of the
> advancing-issues share, `advancers / (advancers + decliners)`. A "thrust"
> fires when this average surges from oversold to overbought within about ten
> sessions.

## Quick reference

| Item                | Value                                                       |
|---------------------|-------------------------------------------------------------|
| Family              | Market Breadth                                              |
| Input type          | `CrossSection` — the per-symbol state of the whole universe |
| Output type         | `f64` (a share in `0..=1`)                                 |
| Output range        | `0..=1`                                                    |
| Default parameters  | `period = 10` (Zweig's classic window)                    |
| Warmup period       | `period`                                                   |
| Interpretation      | Breadth thrust / oversold reversal                        |

## Formula

```
share = advancers / max(advancers + decliners, 1)   # per tick
thrust = EMA(share, period)                         # α = 2 / (period + 1),
                                                    # seeded with the SMA of the first `period` shares
```

Zweig's breadth thrust smooths the fraction of participating issues that are
advancing with an exponential moving average (Zweig's 10-day EMA). The EMA is
seeded with the simple mean of the first `period` shares, then updates with
`α = 2 / (period + 1)`. The historic signal: the average
climbing from below ~0.40 (washed-out breadth) to above ~0.615 within about ten
sessions — a rare, reliable start-of-advance signal. The participating count is
floored to one so a tick with no advancing or declining issues contributes `0.0`.
Backed by an internal `Ema`, so each tick is O(1). See
`crates/wickra-core/src/indicators/breadth_thrust.rs`.

## Parameters

| Parameter | Type    | Default | Source                                          |
|-----------|---------|---------|-------------------------------------------------|
| `period`  | `usize` | (10)    | `breadth_thrust.rs:46` — `BreadthThrust::new(period)` |

`new(period)` returns `Err(Error::PeriodZero)` if `period == 0`.

## Inputs / Outputs

`Indicator<Input = CrossSection, Output = f64>`:

```rust
use wickra::{BreadthThrust, CrossSection, Indicator};

const _: fn(&mut BreadthThrust, CrossSection) -> Option<f64> =
    <BreadthThrust as Indicator>::update;
```

The bindings pass a tick as four equal-length parallel arrays; the constructor
takes the window length:

- **Python**: `BreadthThrust(period)`, `update(change, volume, new_high, new_low)`;
  `batch(...)` returns an `array.array('d')` with `NaN` during warmup.
- **Node**: `new BreadthThrust(period)`, `update(change, volume, newHigh, newLow)`;
  `batch` returns `number[]` with `NaN` during warmup.
- **WASM**: `new BreadthThrust(period)`, `update(...)` only; flag arrays are numeric.

## Warmup

`warmup_period() == period`; the EMA emits `None` until `period` ticks have been
seen and its SMA seed is available (tests `accessors_and_metadata`,
`smooths_the_advancing_share`). A zero period
is rejected (test `rejects_zero_period`).

## Edge cases

- **Warmup.** Returns `None` (Python/Node `NaN`) until the seed window is full (test
  `smooths_the_advancing_share`).
- **Empty participation.** A tick with no advancers or decliners floors to a `0.0`
  share (test `empty_participation_floors_to_zero_share`).
- **Reset.** `reset()` clears the EMA (and its seed window) and returns the indicator to not-ready
  (test `reset_clears_state`).
- **Zero period.** Rejected at construction (test `rejects_zero_period`).
- **Invalid / empty universe.** Rejected by `CrossSection::new`.

## Examples

### Rust

```rust
use wickra::{BreadthThrust, CrossSection, Indicator, Member};

let mut bt = BreadthThrust::new(2)?;
let up = CrossSection::new(vec![Member::new(1.0, 1.0, false, false)], 0)?;
assert_eq!(bt.update(up.clone()), None); // warming up
assert_eq!(bt.update(up), Some(1.0));    // both ticks 100% advancing
```

### Python

```python
import wickra as ta

bt = ta.BreadthThrust(10)
# share = advancers / (advancers + decliners), smoothed over 10 ticks.
print(bt.update([1.0] * 8 + [-1.0] * 2, [10.0] * 10, [False] * 10, [False] * 10))
# None   (warming up)
```

### Node

```js
const { BreadthThrust } = require('wickra');

const bt = new BreadthThrust(2);
const up = [1, 1, 1, 1, 1, 1, 1, 1, -1, -1]; // 8 up, 2 down -> share 0.8
const flags = new Array(10).fill(false);
const vol = new Array(10).fill(10);
console.log(bt.update(up, vol, flags, flags)); // null (warming up)
```

### Streaming

```python
import wickra as ta

bt = ta.BreadthThrust(2)
flags = [False] * 10
vol = [10.0] * 10
print(bt.update([1.0] * 8 + [-1.0] * 2, vol, flags, flags))  # None  (share 0.8, warmup)
print(bt.update([1.0] * 6 + [-1.0] * 4, vol, flags, flags))  # 0.7   (seed: mean of [0.8, 0.6])
print(bt.update([1.0] * 5 + [-1.0] * 5, vol, flags, flags))  # 0.5666666666666667  (0.7 + 2/3·(0.5 − 0.7))
```

## Interpretation

The breadth thrust catches the rare, explosive starts of major advances.

1. **The classic signal.** A 10-day EMA of the advancing share rising from
   below 0.40 to above 0.615 inside ~10 sessions has historically preceded large,
   durable rallies.
2. **Oversold floor.** Readings near the low end mark washed-out breadth — fuel for
   a thrust.
3. **Rarity.** True thrusts are uncommon; most of the time the indicator just tracks
   the smoothed advancing share.

## Common pitfalls

- **Thresholds are conventions.** The 0.40 / 0.615 levels are Zweig's; calibrate to
  your universe and bar interval.
- **Not an SMA.** Zweig's thrust is defined on a 10-day *exponential* average;
  an SMA of the share reacts differently and crosses the 0.40 / 0.615 levels on
  different days.
- **Period choice.** A longer window smooths more but reacts slower, blunting the
  "within ten sessions" character of the signal.
- **Universe must be stable.** Changing membership distorts the share.

## References

- Zweig, M. (1986). *Winning on Wall Street* — the Breadth Thrust indicator.

## See also

- [Indicator-AdvanceDeclineRatio](/Indicators/Indicator-AdvanceDeclineRatio) — the unsmoothed
  advance/decline reading.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
- [Warmup-Periods](/Warmup-Periods) — verified warmup table.
