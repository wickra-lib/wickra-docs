# STC

> Doug Schaff's Trend Cycle — a doubly-Stochastic-smoothed MACD that
> produces a bounded `[0, 100]` reading reacting faster than MACD itself.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Oscillators |
| Input type | `f64` (single close) |
| Output type | `f64` |
| Output range | `[0, 100]` (clamped) |
| Default parameters | `fast = 23`, `slow = 50`, `schaff_period = 10`, `factor = 0.5` |
| Warmup period | `slow + 2 · (schaff_period − 1)` (`68` for defaults) |
| Interpretation | Cross above `25` = bullish entry; cross below `75` = bearish exit. |

## Formula

```
macd_t  = EMA(close, fast)_t − EMA(close, slow)_t
%K_t    = 100 · (macd − LL(macd, schaff_period)) / (HH(macd, schaff_period) − LL(macd, schaff_period))
%D_t    = %D_{t-1} + factor · (%K_t − %D_{t-1})       // half-EMA when factor = 0.5
%K2_t   = 100 · (%D − LL(%D, schaff_period)) / (HH(%D, schaff_period) − LL(%D, schaff_period))
STC_t   = STC_{t-1} + factor · (%K2_t − STC_{t-1})
```

STC runs a stochastic over the MACD, smooths it (`%D`), runs a second
stochastic over that, and smooths again — two `min/max` normalisations plus
two half-EMA passes. The output is clamped to `[0, 100]` to absorb
floating-point rounding. Each stochastic stage returns `0` when its rolling
range collapses (flat input or a strictly monotone trend where the MACD
settles into a constant lag), so degenerate series produce a deterministic
`0` rather than `NaN` / `±inf`.

## Parameters

| Name            | Type    | Default | Constraint        | Source |
|-----------------|---------|---------|-------------------|--------|
| `fast`          | `usize` | `23`    | `>= 1`, `< slow`  | `Stc::new` (`stc.rs:56`) |
| `slow`          | `usize` | `50`    | `>= 1`, `> fast`  | `stc.rs:56` |
| `schaff_period` | `usize` | `10`    | `>= 1`            | `stc.rs:56` |
| `factor`        | `f64`   | `0.5`   | finite, `(0, 1]`  | `stc.rs:65` |

Any zero period returns [`Error::PeriodZero`]; `fast >= slow` or a `factor`
outside `(0, 1]` returns [`Error::InvalidPeriod`]. `Stc::classic()` returns
`(23, 50, 10, 0.5)`. Python defaults come from the pyo3 signature; the Node
constructor takes all four arguments explicitly. The public class is `STC`
in both bindings.

## Inputs / Outputs

```rust
use wickra::{Indicator, Stc};
// Stc: Input = f64, Output = f64
const _: fn(&mut Stc, f64) -> Option<f64> = <Stc as Indicator>::update;
```

A single `f64` close in, an `Option<f64>` out in `[0, 100]`. Python maps
this to `float | None` / an `array.array('d')` with `NaN` warmup; Node to
`number | null` / `Array<number>`.

## Warmup

`warmup_period()` returns `slow + 2 · (schaff_period − 1)`. The slow EMA
emits at `slow` inputs; the first stochastic's window then needs
`schaff_period − 1` more inputs to fill, and the second stochastic's window
another `schaff_period − 1` after that. For the defaults that is
`50 + 2·9 = 68`. Pinned by `warmup_emits_first_value_at_warmup_period`
((2, 4, 3, 0.5) → warmup 8: inputs 1–7 return `None`, input 8 emits).

## Edge cases

- **Constant / monotone series.** Both stochastic ranges collapse, so STC
  settles deterministically at `0` (test `constant_series_yields_zero`).
- **Bounded output.** STC is always within `[0, 100]` regardless of input
  (test `output_is_bounded`).
- **Full-range cycling.** A sufficiently strong oscillation drives STC
  across the whole `[0, 100]` band (test `oscillating_series_visits_full_range`).
- **Reset.** `reset()` clears both EMAs, both rolling windows, and the two
  smoothing accumulators.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, Stc};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prices: Vec<f64> = (0..400)
        .map(|i| 100.0 + (f64::from(i) * 0.15).sin() * 30.0)
        .collect();
    let mut stc = Stc::classic(); // (23, 50, 10, 0.5)
    for v in stc.batch(&prices).into_iter().flatten() {
        assert!((0.0..=100.0).contains(&v));
    }
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

stc = ta.STC(23, 50, 10, 0.5)
out = stc.batch(prices)  # 1-D series in [0, 100], NaN for the first 67 rows
```

### Node

```javascript
const ta = require('wickra');
const stc = new ta.STC(23, 50, 10, 0.5);
const v = stc.update(101.5); // null during warmup, else a value in [0, 100]
```

## Interpretation

STC is a faster, bounded reinterpretation of MACD:

1. **Overbought / oversold.** Like a stochastic, readings near `100` are
   overbought, near `0` oversold. Schaff's signal lines are `25` and `75`.
2. **Cycle turns.** A cross up through `25` flags a new up-cycle (bullish
   entry); a cross down through `75` flags a down-cycle (bearish exit/entry).
   Because of the double smoothing, STC turns earlier than raw MACD while
   filtering more of its whipsaw.

## Common pitfalls

- **Reading the long warmup wrong.** Two stochastic windows stack on top of
  the slow EMA, so STC needs `slow + 2·(schaff_period − 1)` bars — much
  longer than the slow period alone.
- **Expecting MACD-like unbounded values.** STC is normalised to `[0, 100]`;
  its magnitude reflects cycle *position*, not momentum size.

## References

- Doug Schaff, *Schaff Trend Cycle* (late 1990s, FX Studies). Widely
  described in *Technical Analysis of Stocks & Commodities* coverage of the
  indicator.

## See also

- [MacdIndicator](/Indicators/Indicator-MacdIndicator) — the unsmoothed source signal.
- [Stochastic](/Indicators/Indicator-Stochastic) — the normalisation STC applies twice.
- [StochRsi](/Indicators/Indicator-StochRsi) — another double-normalised oscillator.
