# PSAR (Parabolic SAR)

> Wilder's parabolic Stop-And-Reverse: a state-machine trailing stop that
> accelerates toward price as a trend extends and flips sides on a
> penetration of the SAR line.

## Quick reference

| Item                | Value                                                                              |
|---------------------|------------------------------------------------------------------------------------|
| Family | Trailing Stops |
| Input type          | `Candle` (uses `high`, `low`)                                                      |
| Output type         | `f64`                                                                              |
| Output range        | unbounded; bracketed by the prior two highs/lows                                   |
| Default parameters  | `af_start = 0.02`, `af_step = 0.02`, `af_max = 0.20` (Wilder)                      |
| Warmup period       | `2` (state machine seeds on the 2nd candle)                                        |
| Interpretation      | trailing stop that "flips" sides on penetration; never tied to a fixed bar count   |

## Formula

PSAR is a two-state machine — `Up` (long bias) and `Down` (short bias).
Each bar updates three pieces of state:

```
EP_t  = extreme price reached so far in the current trend (max high in Up,
        min low in Down)
AF_t  = acceleration factor, bumped by af_step each time EP makes a new
        extreme, capped at af_max
SAR_t = stop-and-reverse level
```

The transition is:

```
SAR_t = SAR_{t-1} + AF_{t-1} * (EP_{t-1} - SAR_{t-1})

# Wilder rule: SAR_t may not sit inside the ranges of the two previous bars
if Up:    SAR_t = min(SAR_t, low_{t-1}, low_{t-2})
if Down:  SAR_t = max(SAR_t, high_{t-1}, high_{t-2})

# Reversal test -- the new SAR is the prior EP, moved outside this bar's
# and the previous bar's range
if Up and low_t <= SAR_t:    flip to Down, SAR_t = max(EP_{t-1}, high_{t-1}, high_t), reset AF
if Down and high_t >= SAR_t: flip to Up,   SAR_t = min(EP_{t-1}, low_{t-1},  low_t),  reset AF
```

The clamp uses the lows (Up) / highs (Down) of the **two previous bars**
(`t-1`, `t-2`), never bar `t`'s own range; only then is bar `t` tested for a
reversal against the clamped SAR. This is Wilder's rule and matches TA-Lib,
which clamps *tomorrow's* SAR with today's and yesterday's extremes — the same
rule, applied one bar earlier.

**Seed (TA-Lib's).** The first candle only stores its high and low. On the
second candle the starting direction comes from the one-bar directional
movement of the first two candles:

```
down_move = low_0 - low_1
up_move   = high_1 - high_0
short if down_move > 0 and down_move > up_move, else long

long:  SAR = low_0,  EP = high_1
short: SAR = high_0, EP = low_1
```

So the SAR starts at the first candle's *opposite* extreme and the EP at the
second candle's extreme. Like TA-Lib, the first step then treats the second
candle as both "today" and "yesterday", so on the third bar the two-bar clamp
uses the second candle's range twice.

The exact step-by-step is `crates/wickra-core/src/indicators/psar.rs:112-208`.

**TA-Lib parity.** With this seed and the reversal clamp, `Psar` matches
TA-Lib `SAR` exactly from the first output bar (to `1e-9`, verified by the
TA-Lib reference test suite).

## Parameters

| Name       | Type  | Default | Constraint                                | Source                                |
|------------|-------|---------|-------------------------------------------|---------------------------------------|
| `af_start` | `f64` | `0.02`  | finite, `> 0`, `≤ af_max`                  | `Psar::new` (`psar.rs:68-100`)        |
| `af_step`  | `f64` | `0.02`  | finite, `> 0`                              | `Psar::new` (`psar.rs:68-100`)        |
| `af_max`   | `f64` | `0.20`  | finite, `> 0`                              | `Psar::new` (`psar.rs:68-100`)        |

Python defaults from
`#[pyo3(signature = (af_start=0.02, af_step=0.02, af_max=0.20))]` in
`bindings/python/src/lib.rs`. `Psar::classic()` returns the same triple.

Validation errors:

- non-finite or non-positive AF parameter → `Error::NonPositiveMultiplier`
- `af_start > af_max` → `Error::InvalidPeriod { message: "af_start must be <= af_max" }`

## Inputs / Outputs

```rust
use wickra::{Indicator, Psar, Candle};
// Psar: Input = Candle, Output = f64
const _: fn(&mut Psar, Candle) -> Option<f64> = <Psar as Indicator>::update;
```

- **Python streaming.** `psar.update(candle)` returns `float | None`.
- **Python batch.** `PSAR.batch(high, low, close)` returns a 1-D
  `array.array('d')`; the first row is `NaN` (warmup) and every subsequent
  row holds the SAR level for that bar.
- **Node streaming.** `psar.update(high, low, close)` returns `number | null`.
- **Node batch.** `psar.batch(high, low, close)` returns
  `Array<number>` with `NaN` for the first row.
- **WASM streaming.** `psar.update(high, low, close)` returns
  `number | null` once warm.
- **WASM batch.** `psar.batch(high, low, close)` returns a
  `Float64Array` with `NaN` for the first row.
- **`isReady` convention.** `psar.is_ready()` flips to `true` only once the
  first non-`None` SAR has been produced (i.e. from the second candle
  onwards). The first (seed) candle returns `None` and `is_ready()` stays
  `false`, matching every other indicator in the library. Previous releases
  flipped the flag after the seed candle even though it produced no value —
  consumers that wrote `if psar.is_ready() { use(psar.update(c)?) }` would
  hit an unexpected `None` on the first post-seed update; that's now fixed.

## Warmup

`warmup_period() == 2`. The very first candle only records its high and
low and returns `None`. The second candle picks the starting direction
from the directional movement of the two candles (see *Seed* above), sets
`SAR` to the first candle's opposite extreme, `EP` to the second candle's
extreme and `AF = af_start`, and emits that SAR as the first value.

Only the highs and lows of the first two candles decide the direction;
closes are never consulted.

## Edge cases

- **First bar.** Always returns `None`; downstream code must tolerate
  the first row being absent without crashing.
- **Pure uptrend.** With monotonically rising highs and lows, the SAR
  remains below the lows and accelerates toward price as the EP makes
  successive new highs. The pinned test `pure_uptrend_sar_below_lows`
  asserts `SAR ≤ low` on every emitted bar of a 40-bar ramp.
- **Pure downtrend.** Symmetrically, with monotonically falling highs,
  the SAR sits above the highs after the trend establishes.
  `pure_downtrend_sar_above_highs` covers this.
- **Reversal mechanics.** When the trend flips, `SAR` is set to the
  previous EP (not the calculated parabola value) — pushed above the
  highs (flip to short) or below the lows (flip to long) of the reversal
  bar and the bar before it if they reach past the EP — AF is reset to
  `af_start`, and the new EP is the current bar's high (Down→Up) or
  low (Up→Down).
- **Choppy regime.** Frequent reversals cause many AF resets; SAR
  becomes a poor stop in mean-reverting regimes and whipsaws.
- **NaN / infinity.** `Candle::new` rejects non-finite OHLC values.
  `Psar::new` rejects non-finite AF parameters.
- **Reset.** `reset()` clears the initialised flag and resets `af` to
  `af_start`, and returns `sar`, `ep` and the stored previous-bar
  extremes to `NaN` sentinels; the next `update` re-seeds.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, Psar};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..8)
        .map(|i| {
            let base = 100.0 + f64::from(i);
            Candle::new(base, base + 0.5, base - 0.5, base + 0.25, 1.0, 0).unwrap()
        })
        .collect();
    let mut p = Psar::classic(); // (0.02, 0.02, 0.20)
    for (i, v) in p.batch(&candles).into_iter().enumerate() {
        println!("i={i} -> {:?}", v);
    }
    Ok(())
}
```

Output:

```
i=0 -> None
i=1 -> Some(99.5)
i=2 -> Some(99.54)
i=3 -> Some(99.6584)
i=4 -> Some(99.888896)
i=5 -> Some(100.25778432)
i=6 -> Some(100.782005888)
i=7 -> Some(101.46816518144)
```

The second candle moves up (`up_move = 1`, `down_move = −1`), so the seed
is long: `SAR = 99.5` (the first candle's low) and `EP = 101.5` (the second
candle's high). On bar 2 the SAR advances by `0.02·(101.5 − 99.5) = 0.04`
to `99.54`; the EP then makes a new high on every bar, so AF climbs by
`0.02` per bar and the SAR accelerates toward price.

### Python

```python
import numpy as np
import wickra as ta

p = ta.PSAR()  # defaults (0.02, 0.02, 0.20)
h  = np.array([100.5, 101.5, 102.5, 103.5, 104.5, 105.5, 106.5, 107.5])
l  = np.array([ 99.5, 100.5, 101.5, 102.5, 103.5, 104.5, 105.5, 106.5])
cl = np.array([100.25, 101.25, 102.25, 103.25, 104.25, 105.25, 106.25, 107.25])
print(p.batch(h, l, cl))
```

Output:

```
array('d', [nan, 99.5, 99.54, 99.6584, 99.888896, 100.25778432, 100.782005888, 101.46816518144])
```

### Node

```js
const w = require('wickra');

const p = new w.PSAR(0.02, 0.02, 0.20);
console.log(p.batch(
  [100.5, 101.5, 102.5, 103.5, 104.5, 105.5, 106.5, 107.5],
  [ 99.5, 100.5, 101.5, 102.5, 103.5, 104.5, 105.5, 106.5],
  [100.25, 101.25, 102.25, 103.25, 104.25, 105.25, 106.25, 107.25],
));
```

Output:

```
[
  NaN,
  99.5,
  99.54,
  99.6584,
  99.888896,
  100.25778432,
  100.782005888,
  101.46816518144
]
```

## Interpretation

- **Stop & reverse.** PSAR is a *trailing stop*, not a signal generator
  in isolation: a long is exited (and a short is initiated) the bar
  that price penetrates the SAR line.
- **Acceleration.** The further a trend extends without making new
  extremes, the slower the SAR rises (or falls). When EP makes a new
  extreme, AF bumps by `af_step` and the SAR closes the distance to
  price more aggressively.
- **Whipsaw risk.** In sideways markets PSAR flips repeatedly; pair it
  with a trend filter (ADX, slope of EMA) to skip trades when the
  underlying isn't actually trending.

## Common pitfalls

- **The first bar always returns `None`.** Code that pre-allocates a
  vector and does `out[i] = psar.update(c).unwrap()` will panic on
  the very first input. Use `if let Some(...)` or skip the first
  row explicitly.
- **The initial trend rests on two bars.** The starting direction is
  read from the directional movement of the first two candles only. A
  noisy first pair can start the SAR on the wrong side; the state machine
  corrects itself on the first penetration, but the first few values
  depend on where the series begins. Trim the input the same way when
  comparing against another implementation.
- **Acceleration cap matters.** `af_max = 0.20` is Wilder's choice;
  raising it produces an extremely tight stop near tops/bottoms but
  exits good trends prematurely. Lowering it produces a forgiving
  stop that gives back more open profit. Always re-validate strategy
  PnL when you change `af_max`.

## References

- J. Welles Wilder Jr., *New Concepts in Technical Trading Systems*,
  Trend Research, 1978. Chapter on the Parabolic SAR introduces the
  state-machine recursion and the default `(0.02, 0.02, 0.20)`
  parameters.

## See also

- [ATR](/Indicators/Indicator-Atr) — sister indicator from the same Wilder text.
- [Donchian Channels](/Indicators/Indicator-Donchian) — alternative breakout-style
  trailing stop based on rolling extrema.
- [Keltner Channels](/Indicators/Indicator-Keltner) — envelope you can use as a
  smoother stop boundary than PSAR in choppy regimes.
