# ADXR

> Wilder's Average Directional Movement Index Rating — the average of the
> current [ADX](/Indicators/Indicator-Adx) and the ADX from `period − 1` bars ago. A more
> stable directional-strength reading than raw ADX, used to compare
> trend-strength across instruments.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trend & Directional |
| Input type | `Candle` (uses `high`, `low`, `close`) |
| Output type | `f64` |
| Output range | `[0, 100]` |
| Default parameters | `period = 14` |
| Warmup period | `3 · period − 1` (`41` for `period = 14`) |
| Interpretation | Lags ADX. Use for cross-instrument trend comparison or to filter ADX noise. |

## Formula

```
ADXR_t = (ADX_t + ADX_{t − (period − 1)}) / 2
```

The lookback length is the same `period` that feeds the underlying
[Adx](/Indicators/Indicator-Adx). Because the older ADX is `period − 1` bars stale, ADXR
responds more slowly than ADX. Wilder's original use was ranking trend
strength across symbols at a single point in time, where a smoother metric
was wanted.

## Parameters

| Name     | Type    | Default | Constraint | Source |
|----------|---------|---------|------------|--------|
| `period` | `usize` | `14`    | `>= 1`     | `Adxr::new` (`adxr.rs:61`) |

`period == 0` returns [`Error::PeriodZero`]; the same `period` feeds both the
underlying ADX and the lookback ring. Python default comes from
`#[pyo3(signature = (period=14))]`; the Node constructor takes `period`
explicitly. The public class is `ADXR` in both bindings.

## Inputs / Outputs

```rust
use wickra::{Indicator, Adxr, Candle};
// Adxr: Input = Candle, Output = f64
const _: fn(&mut Adxr, Candle) -> Option<f64> = <Adxr as Indicator>::update;
```

- **Python.** `update(candle)` returns `float | None`;
  `batch(high, low, close)` returns a 1-D `float64` `np.ndarray` with `NaN`
  warmup.
- **Node.** `update(high, low, close)` returns `number | null`;
  `batch(high, low, close)` returns an `Array<number>` with `NaN` warmup.

## Warmup

`warmup_period()` returns `3 · period − 1`. ADX itself needs `2 · period`
candles before its first emission; the ADXR lookback ring then needs another
`period − 1` candles to fill, so the first ADXR lands at input
`3 · period − 1` (`41` for `period = 14`). Pinned by
`first_emission_at_warmup_period`.

## Edge cases

- **Strong unidirectional trend.** Once ADX saturates near `100`, ADXR
  follows (the average of two saturated values is also saturated) (test
  `pure_uptrend_yields_finite_positive_adxr`).
- **Flat market.** ADX is `0` throughout, so ADXR is `0` throughout (test
  `constant_series_yields_zero_adxr`).
- **Identity.** ADXR equals `(ADX_t + ADX_{t−(period−1)}) / 2` against an
  independent ADX run (test `reference_value_against_explicit_adx_average`).
- **Reset.** `reset()` resets the inner ADX and the lookback ring.

## Examples

### Rust

```rust
use wickra::{Adxr, BatchExt, Candle, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..80)
        .map(|i| {
            let base = 100.0 + f64::from(i) * 2.0; // clean uptrend
            Candle::new(base, base + 1.0, base - 0.5, base + 0.5, 1.0, i64::from(i)).unwrap()
        })
        .collect();
    let mut a = Adxr::new(14)?;
    println!("{:?}", a.batch(&candles).into_iter().flatten().last());
    Ok(())
}
```

### Python

```python
import wickra as ta
a = ta.ADXR(14)
out = a.batch(high, low, close)  # 1-D series in [0, 100], NaN for the first 40 rows
```

### Node

```javascript
const ta = require('wickra');
const a = new ta.ADXR(14);
const v = a.update(102, 98, 101); // high, low, close
```

## Interpretation

ADXR is ADX with a built-in low-pass filter:

1. **Trend-strength threshold.** Like ADX, a reading above ~25 marks a
   trending market and below ~20 a ranging one — but ADXR's averaging makes
   the threshold cross less prone to whipsaw.
2. **Cross-instrument ranking.** Wilder's intended use: at one moment in
   time, compare ADXR across symbols to rank which is trending hardest, with
   the smoothing removing single-bar spikes.

## Common pitfalls

- **Reading direction from it.** ADXR (like ADX) measures trend *strength*,
  not direction — pair it with `+DI`/`−DI` (see [Adx](/Indicators/Indicator-Adx)) for
  direction.
- **Expecting an early read.** Its `3·period − 1` warmup is the longest in
  the directional family; on `period = 14` that is 41 candles.

## References

- J. Welles Wilder, *New Concepts in Technical Trading Systems*, Trend
  Research, 1978 — introduced ADX, +DI, −DI, DX and ADXR together.

## See also

- [Adx](/Indicators/Indicator-Adx) — the directional-strength index ADXR averages.
- [Vortex](/Indicators/Indicator-Vortex) — alternative directional-trend gauge.
- [Rwi](/Indicators/Indicator-Rwi) — trend-vs-random-walk strength.
