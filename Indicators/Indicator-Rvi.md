# RVI

> Relative Vigor Index — John Ehlers' ratio of intra-bar drive
> `(close − open)` to intra-bar range `(high − low)`, each first smoothed
> with a symmetric 1-2-2-1 four-bar weighting and then summed over a
> `period`-bar window.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Momentum Oscillators |
| Input type | `Candle` (uses `open`, `high`, `low`, `close`) |
| Output type | `f64` |
| Output range | `[−1, 1]` (every valid candle has `abs(close − open) ≤ high − low`) |
| Default parameters | `period = 10` |
| Warmup period | `period + 3` (exact) |
| Interpretation | Positive on average-bullish windows, negative on average-bearish. |

## Formula

```
num_t = ((C−O)_t + 2·(C−O)_{t−1} + 2·(C−O)_{t−2} + (C−O)_{t−3}) / 6
den_t = ((H−L)_t + 2·(H−L)_{t−1} + 2·(H−L)_{t−2} + (H−L)_{t−3}) / 6
RVI_t = Σ_{i=0..period−1} num_{t−i} / Σ_{i=0..period−1} den_{t−i}
```

Ehlers (*Technical Analysis of Stocks & Commodities*, January 2002) first
smooths both the close-minus-open "vigor" and the high-minus-low range with a
symmetric 1-2-2-1 weighting over four bars (divided by 6), then takes the ratio
of their rolling `period`-bar *sums* (equivalently, of their `period`-bar
averages — the divisor `period` cancels). If the denominator sum is
non-positive (every bar in the window had zero range), the indicator holds its
previous value rather than emit `NaN`.

Ehlers' signal line is the same 1-2-2-1 weighting applied to the RVI itself:
`Signal_t = (RVI_t + 2·RVI_{t−1} + 2·RVI_{t−2} + RVI_{t−3}) / 6`. It is not
built in.

> This is the *Relative Vigor Index* (momentum). The similarly-named
> *Relative Volatility Index* is a separate indicator — see
> [RVIVolatility](/Indicators/Indicator-RviVolatility).

## Parameters

| Name     | Type    | Default | Constraint | Source |
|----------|---------|---------|------------|--------|
| `period` | `usize` | `10`    | `>= 1`     | `Rvi::new` (`rvi.rs:59`) |

`period == 0` returns [`Error::PeriodZero`]. Python default comes from
`#[pyo3(signature = (period=10))]`; the Node constructor takes `period`
explicitly. The public class is `RVI` in both bindings.

## Inputs / Outputs

```rust
use wickra::{Indicator, Rvi, Candle};
// Rvi: Input = Candle, Output = f64
const _: fn(&mut Rvi, Candle) -> Option<f64> = <Rvi as Indicator>::update;
```

Uses all four OHLC fields.

- **Python.** `update(candle)` returns `float | None`;
  `batch(open, high, low, close)` returns an `array.array('d')` with
  `NaN` warmup.
- **Node.** `update(open, high, low, close)` returns `number | null`;
  `batch(open, high, low, close)` returns an `Array<number>` with `NaN`
  warmup.

## Warmup

`warmup_period()` returns `period + 3`. The 1-2-2-1 weighting needs four
bars before it produces its first smoothed pair, and the two rolling sums then
need `period` smoothed pairs, so the first non-`None` output lands on candle
`period + 3` (index `period + 2`). Pinned by
`warmup_emits_first_value_at_period_plus_three` (and `accessors_and_metadata`,
which asserts `warmup_period() == 13` for `period = 10`).

## Edge cases

- **Reference.** RVI(2) on four bars `(10,11,9,10.5)` (open, high, low,
  close) then `(10.5,11.5,10,11.5)`: the four identical bars give the first
  weighted pair `(0.5, 2.0)`; the fifth bar (`C−O = 1.0`, `H−L = 1.5`) gives
  weighted `num = (1 + 2·0.5 + 2·0.5 + 0.5)/6 = 3.5/6` and
  `den = (1.5 + 2·2 + 2·2 + 2)/6 = 11.5/6`, so
  `RVI = (0.5 + 3.5/6) / (2 + 11.5/6) = 6.5/23.5 ≈ 0.2766`
  (test `reference_value_period_2`).
- **Pure uptrend.** Every bar closes above its open with non-zero range, so
  RVI > 0 (test `pure_uptrend_is_positive`).
- **Zero-range window.** Every bar `high == low` ⇒ denominator sum `0` ⇒ the
  indicator holds (test `zero_range_window_holds_value`).
- **Reset.** `reset()` clears the four-bar raw buffer, the window, both sums
  and the running value (test `reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, Rvi};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // open, high, low, close, volume, ts
    let mut r = Rvi::new(2)?;
    for ts in 0..4 {
        let _ = r.update(Candle::new(10.0, 11.0, 9.0, 10.5, 1.0, ts)?); // None
    }
    let v = r.update(Candle::new(10.5, 11.5, 10.0, 11.5, 1.0, 4)?).unwrap();
    println!("{v:.4}"); // 0.2766  (= 6.5 / 23.5)
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

r = ta.RVI(10)
out = r.batch(open_, high, low, close)  # 1-D series, NaN for the first 12 rows
```

### Node

```javascript
const ta = require('wickra');
const r = new ta.RVI(10);
const v = r.update(10.5, 11.5, 10.0, 11.0); // open, high, low, close; null for the first 12 bars
```

## Interpretation

RVI reads the *conviction* behind a window's bars — how much of each bar's
range was converted into a directional close-vs-open move:

1. **Sign = average bias.** Positive means the average bar in the window
   closed above its open (bullish vigor); negative the reverse.
2. **Signal-line use.** Ehlers pairs the RVI with a signal line — the same
   1-2-2-1 / 6 weighting applied to the RVI — and reads RVI/signal crossovers.
   Wickra applies the 1-2-2-1 smoothing to the numerator and denominator but
   publishes the RVI without the signal line; build it with a
   [Chain](/Indicator-Chaining) or a four-value weighted average of your own.

## Common pitfalls

- **Confusing it with the Relative Volatility Index.** Different indicator,
  shared abbreviation — see [RVIVolatility](/Indicators/Indicator-RviVolatility).
- **Expecting the extremes to be reached.** Every valid candle has
  `|close − open| ≤ high − low`, so the ratio is confined to `[−1, 1]`, but it
  hits `±1` only when every bar in the window opens and closes at its
  extremes; gaps between bars do not enter the formula at all.
- **Attributing it to Dorsey.** The Relative *Vigor* Index is John Ehlers'
  (2002); Donald Dorsey created the Relative *Volatility* Index
  ([RVIVolatility](/Indicators/Indicator-RviVolatility)).
- **Expecting a value after `period` bars.** The 1-2-2-1 weighting adds three
  bars of warmup: RVI(10) first emits on bar 13.

## References

- John F. Ehlers, "Relative Vigor Index", *Technical Analysis of Stocks &
  Commodities*, January 2002. Wickra implements the 1-2-2-1-weighted
  numerator / denominator and the `period`-bar sums; the signal line is not
  built in — compose it with [Chaining](/Indicator-Chaining) if needed.

## See also

- [Inertia](/Indicators/Indicator-Inertia) — Dorsey's linear-regression smoothing of the Relative *Volatility* Index (not this RVI).
- [RVIVolatility](/Indicators/Indicator-RviVolatility) — the unrelated volatility RVI.
- [Stochastic](/Indicators/Indicator-Stochastic) — another close-position oscillator.
