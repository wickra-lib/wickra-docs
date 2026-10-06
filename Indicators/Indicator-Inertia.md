# Inertia

> Donald Dorsey's Inertia — a [LinearRegression](/Indicators/Indicator-LinearRegression)
> smoothing of his Relative **Volatility** Index
> ([RviVolatility](/Indicators/Indicator-RviVolatility)) of the close. The direction of
> volatility, smoothed into a trend gauge: above `50` bullish inertia, below `50`
> bearish.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Momentum Oscillators |
| Input type | `Candle` (only the `close` is used) |
| Output type | `f64` |
| Output range | centred on `50`; nominally `0–100` (the regression endpoint can overshoot slightly) |
| Default parameters | `rvi_period = 14`, `linreg_period = 20` |
| Warmup period | `(2·rvi_period − 1) + linreg_period − 1` (`46` for defaults) |
| Interpretation | Smoothed Relative Volatility Index; a cross of `50` signals a trend change. |

## Formula

```
Inertia_t = LinearRegression(RelativeVolatilityIndex(close, rvi_period), linreg_period)_t

RelativeVolatilityIndex (Dorsey 1993):
  sd_t    = stddev_pop(close over rvi_period)
  up_t    = sd_t if close_t > close_{t−1}, else 0
  down_t  = sd_t if close_t < close_{t−1}, else 0
  RVI_t   = 100 · Wilder(up) / (Wilder(up) + Wilder(down))     ∈ [0, 100]
```

Each bar's [Relative Volatility Index](/Indicators/Indicator-RviVolatility) value
feeds a rolling least-squares regression; the endpoint of the fit is published.
This is Dorsey's own construction (*Technical Analysis of Stocks & Commodities*,
1995) — it smooths the Relative **Volatility** Index, not the Relative Vigor
Index ([Rvi](/Indicators/Indicator-Rvi)). Dorsey's thesis is that a market's
*inertia* — its tendency to keep doing what it is doing — is best read from the
smoothed direction of volatility rather than the noisy index itself. Although
the input is a full `Candle`, only its `close` is used. See
`crates/wickra-core/src/indicators/inertia.rs`.

## Parameters

| Name            | Type    | Default | Constraint | Source |
|-----------------|---------|---------|------------|--------|
| `rvi_period`    | `usize` | `14`    | `>= 1`     | `Inertia::new` (`inertia.rs:48`) |
| `linreg_period` | `usize` | `20`    | `>= 1`     | `inertia.rs:48` |

Either parameter `== 0` returns [`Error::PeriodZero`]. `Inertia::classic()`
returns `(14, 20)`. Python defaults come from
`#[pyo3(signature = (rvi_period=14, linreg_period=20))]`; the Node
constructor takes both explicitly. The public class is `Inertia` in both
bindings.

## Inputs / Outputs

```rust
use wickra::{Indicator, Inertia, Candle};
// Inertia: Input = Candle, Output = f64
const _: fn(&mut Inertia, Candle) -> Option<f64> = <Inertia as Indicator>::update;
```

- **Python.** `update(candle)` returns `float | None`;
  `batch(open, high, low, close)` returns an `array.array('d')` with
  `NaN` warmup. Only `close` affects the result; the other columns are
  still required (and validated) by the candle constructor.
- **Node.** `update(open, high, low, close)` returns `number | null`;
  `batch(open, high, low, close)` returns an `Array<number>` with `NaN`
  warmup.

## Warmup

`warmup_period()` returns `(2·rvi_period − 1) + linreg_period − 1`. The inner
Relative Volatility Index emits at `2·rvi_period − 1` candles (`rvi_period` to
fill the standard-deviation window, overlapping by one bar with the
`rvi_period` samples that seed the Wilder averages); the regression then needs
`linreg_period − 1` more values to fill its window. Classic `(14, 20)` → `46`
(`accessors_and_metadata`). Pinned by
`warmup_emits_first_value_at_warmup_period` ((3, 4) → warmup 8: first seven
`None`, eighth emits).

## Edge cases

- **Constant close.** Identical candles never move the close, so the Relative
  Volatility Index sits at its neutral `50` and the regression of a constant
  series equals that constant — Inertia reads exactly `50` (test
  `constant_rvi_yields_constant_inertia`).
- **One-way market.** A close that only rises saturates the index at `100`
  (only falls → `0`), and Inertia follows it there.
- **Zero period.** Either period `== 0` → `Error::PeriodZero`
  (`rejects_zero_period`).
- **Reset.** `reset()` resets both the inner Relative Volatility Index and the
  regression (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, Inertia};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut inertia = Inertia::classic(); // (14, 20)
    let mut last = None;
    for i in 0..80 {
        let o = 100.0 + f64::from(i);
        let c = o + 0.5;
        last = inertia.update(Candle::new(o, c + 0.2, o - 0.2, c, 1.0, i64::from(i))?);
    }
    println!("{last:?}");
    Ok(())
}
```

Output:

```
Some(100.0)
```

Every close is higher than the last, so the Relative Volatility Index saturates
at `100` and the regression of that constant reads `100`.

### Python

```python
import wickra as ta
inertia = ta.Inertia(14, 20)
out = inertia.batch(open_, high, low, close)  # 1-D series, NaN warmup (45 rows)
```

### Node

```javascript
const ta = require('wickra');
const inertia = new ta.Inertia(14, 20);
const v = inertia.update(100, 100.7, 99.8, 100.5); // open, high, low, close
```

## Interpretation

Inertia is the Relative Volatility Index run through a regression smoother, so
it trades responsiveness for stability:

1. **Trend persistence.** Above `50` ⇒ volatility is concentrated on up-bars ⇒
   the market's "inertia" is bullish; below `50` ⇒ bearish. The slow smoothing
   makes the `50`-line cross a higher-conviction trend-change signal than a
   raw Relative Volatility Index cross.
2. **Pair with the raw index.** Use raw
   [RviVolatility](/Indicators/Indicator-RviVolatility) for early reads and Inertia
   to confirm the trend has actually turned.

## Common pitfalls

- **Expecting raw-index-speed signals.** Inertia deliberately lags — its warmup
  is `(2·rvi_period − 1) + linreg_period − 1` bars (`46` classic) and its turns
  trail the Relative Volatility Index's.
- **Confusing the two RVIs.** Inertia is built on Dorsey's Relative
  *Volatility* Index, not Ehlers' Relative *Vigor* Index
  ([Rvi](/Indicators/Indicator-Rvi)); the zero line is meaningless here — the
  neutral level is `50`.
- **Open, high and low ignored.** Only the close is used; the other fields do not
  change the reading.

## References

- Donald Dorsey, "Refining the Relative Volatility Index", *Technical Analysis of
  Stocks & Commodities*, 1995 — introduces Inertia.
- Donald Dorsey, "The Relative Volatility Index", *Technical Analysis of Stocks &
  Commodities*, June 1993.

## See also

- [RviVolatility](/Indicators/Indicator-RviVolatility) — the underlying Relative
  Volatility Index.
- [LinearRegression](/Indicators/Indicator-LinearRegression) — the smoother applied.
- [Rvi](/Indicators/Indicator-Rvi) — the unrelated Relative Vigor Index.
