# RVI

> Relative Vigor Index — Donald Dorsey's ratio of intra-bar drive
> `(close − open)` to intra-bar range `(high − low)`, averaged over a
> `period`-bar window.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Momentum Oscillators |
| Input type | `Candle` (uses `open`, `high`, `low`, `close`) |
| Output type | `f64` |
| Output range | unbounded; for clean OHLC the ratio sits in `(−1, 1)` |
| Default parameters | `period = 10` |
| Warmup period | `period` (exact) |
| Interpretation | Positive on average-bullish windows, negative on average-bearish. |

## Formula

```
num_t = close_t − open_t
den_t = high_t  − low_t
RVI_t = SMA(num, period)_t / SMA(den, period)_t
```

Equivalently — and this is what Wickra computes — RVI is the ratio of the
rolling *sums* (the per-window divisor `period` cancels). If the denominator
sum is non-positive (every bar in the window had zero range), the indicator
holds its previous value rather than emit `NaN`.

> This is the *Relative Vigor Index* (momentum). The similarly-named
> *Relative Volatility Index* is a separate indicator — see
> [RVIVolatility](/Indicators/Indicator-RviVolatility).

## Parameters

| Name     | Type    | Default | Constraint | Source |
|----------|---------|---------|------------|--------|
| `period` | `usize` | `10`    | `>= 1`     | `Rvi::new` (`rvi.rs:46`) |

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
  `batch(open, high, low, close)` returns a 1-D `float64` `np.ndarray` with
  `NaN` warmup.
- **Node.** `update(open, high, low, close)` returns `number | null`;
  `batch(open, high, low, close)` returns an `Array<number>` with `NaN`
  warmup.

## Warmup

`warmup_period()` returns `period`. The two rolling sums need a full `period`
window, so the first non-`None` output lands on candle `period` (index
`period − 1`). Pinned by `warmup_emits_first_value_at_period`.

## Edge cases

- **Reference.** RVI(2) on `(10,11,9,10.5)` then `(10.5,11.5,10,11)`:
  numerator sum `0.5 + 0.5 = 1.0`, denominator sum `2.0 + 1.5 = 3.5`, so
  `RVI = 1/3.5 ≈ 0.2857` (test `reference_value_period_2`).
- **Pure uptrend.** Every bar closes above its open with non-zero range, so
  RVI > 0 (test `pure_uptrend_is_positive`).
- **Zero-range window.** Every bar `high == low` ⇒ denominator sum `0` ⇒ the
  indicator holds (test `zero_range_window_holds_value`).
- **Reset.** `reset()` clears the window, both sums and the running value.

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, Rvi};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // open, high, low, close, volume, ts
    let mut r = Rvi::new(2)?;
    let _ = r.update(Candle::new(10.0, 11.0, 9.0, 10.5, 1.0, 0)?); // None
    let v = r.update(Candle::new(10.5, 11.5, 10.0, 11.0, 1.0, 1)?).unwrap();
    println!("{v:.4}"); // 0.2857
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

r = ta.RVI(10)
out = r.batch(open_, high, low, close)  # 1-D series, NaN for the first 9 rows
```

### Node

```javascript
const ta = require('wickra');
const r = new ta.RVI(10);
const v = r.update(10.5, 11.5, 10.0, 11.0); // open, high, low, close
```

## Interpretation

RVI reads the *conviction* behind a window's bars — how much of each bar's
range was converted into a directional close-vs-open move:

1. **Sign = average bias.** Positive means the average bar in the window
   closed above its open (bullish vigor); negative the reverse.
2. **Signal-line use.** Dorsey's full system applies a 4-bar weighted
   smoothing and a signal line; Wickra publishes the raw ratio so you can
   smooth it with a [Chain](/Indicator-Chaining) or your own
   [Sma](/Indicators/Indicator-Sma)/[Ema](/Indicators/Indicator-Ema).

## Common pitfalls

- **Confusing it with the Relative Volatility Index.** Different indicator,
  shared abbreviation — see [RVIVolatility](/Indicators/Indicator-RviVolatility).
- **Expecting hard ±1 bounds.** For clean OHLC the ratio stays in `(−1, 1)`,
  but gaps between open and prior close can push it outside; it is not
  clamped.

## References

- Donald Dorsey, "The Relative Vigor Index", *Technical Analysis of Stocks &
  Commodities*. The 4-bar weighted "vigor" variant is not built in; compose
  it with [Chaining](/Indicator-Chaining) if needed.

## See also

- [Inertia](/Indicators/Indicator-Inertia) — a linear-regression smoothing of RVI.
- [RVIVolatility](/Indicators/Indicator-RviVolatility) — the unrelated volatility RVI.
- [Stochastic](/Indicators/Indicator-Stochastic) — another close-position oscillator.
