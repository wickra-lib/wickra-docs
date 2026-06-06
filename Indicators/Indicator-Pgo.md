# PGO

> Pretty Good Oscillator — Mark Johnson's displacement of the close from
> its `period`-bar SMA, normalised by the `period`-bar EMA of the True
> Range. Roughly "how many ATR-equivalents is the close from its mean?".

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Oscillators |
| Input type | `Candle` (uses `high`, `low`, `close`) |
| Output type | `f64` |
| Output range | unbounded; in ATR-equivalent units around zero |
| Default parameters | `period = 14` |
| Warmup period | `period` (exact) |
| Interpretation | A `+3` cross is Johnson's long entry, a `−3` cross his short entry. |

## Formula

```
PGO_t = (close_t − SMA(close, period)_t) / EMA(TR_t, period)
```

The numerator is positive when the close is above its mean of the last
`period` bars, negative when below. The denominator is the EMA-smoothed
[TrueRange](/Indicators/Indicator-TrueRange), a volatility scale — so PGO normalises the
displacement into ATR-equivalent units, making thresholds like `±3`
comparable across instruments.

## Parameters

| Name     | Type    | Default | Constraint | Source |
|----------|---------|---------|------------|--------|
| `period` | `usize` | `14`    | `>= 1`     | `Pgo::new` (`pgo.rs:52`) |

`period == 0` returns [`Error::PeriodZero`]. Python default comes from
`#[pyo3(signature = (period=14))]`; the Node constructor takes `period`
explicitly. The public class is `PGO` in both bindings.

## Inputs / Outputs

```rust
use wickra::{Indicator, Pgo, Candle};
// Pgo: Input = Candle, Output = f64
const _: fn(&mut Pgo, Candle) -> Option<f64> = <Pgo as Indicator>::update;
```

- **Python.** `update(candle)` returns `float | None`;
  `batch(high, low, close)` returns a 1-D `float64` `np.ndarray` with `NaN`
  warmup.
- **Node.** `update(high, low, close)` returns `number | null`;
  `batch(high, low, close)` returns an `Array<number>` with `NaN` warmup.

## Warmup

`warmup_period()` returns `period`. The SMA of close and the EMA of the True
Range both reach readiness at exactly `period` candles, so PGO emits its
first value on candle `period` (index `period − 1`). Pinned by
`warmup_emits_first_value_at_period` (period 3: candles 1–2 return `None`,
candle 3 emits).

## Edge cases

- **Flat close.** A constant close makes `close == SMA`, so the numerator is
  `0` and PGO `= 0` regardless of the (non-zero) TR denominator (test
  `flat_close_yields_zero_numerator`).
- **Rising series.** The latest close sits above its SMA, so PGO `> 0`
  (test `close_above_mean_is_positive`).
- **Zero True Range.** A window of single-point candles
  (`high == low == close`) drives `EMA(TR)` to `0`; PGO then holds its
  previous value (and stays `None` if no value has been emitted yet — test
  `zero_tr_holds_value`).
- **Reset.** `reset()` clears the SMA, the True Range, the EMA and the held
  value.

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, Pgo};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut pgo = Pgo::new(5)?;
    let mut last = None;
    for i in 0..20 {
        let c = 10.0 + i as f64;                // rising close
        last = pgo.update(Candle::new(c, c + 0.5, c - 0.5, c, 1.0, i)?);
    }
    println!("{last:?}"); // Some(positive) — close above its SMA
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

pgo = ta.PGO(14)
out = pgo.batch(high, low, close)  # 1-D series, NaN for the first 13 rows
```

### Node

```javascript
const ta = require('wickra');
const pgo = new ta.PGO(14);
const v = pgo.update(101.0, 99.0, 100.5); // null during warmup, else a number
```

## Interpretation

PGO answers "how stretched is price from its own mean, in volatility
units?":

1. **Mean-reversion / breakout thresholds.** Johnson's heuristic uses `±3`:
   a cross above `+3` is a momentum long, a cross below `−3` a momentum
   short — treating large normalised displacement as a breakout, not an
   exhaustion.
2. **Cross-instrument comparability.** Because the displacement is divided
   by an ATR-like scale, the `±3` threshold means roughly the same thing on
   a quiet bond future as on a volatile altcoin.

## Common pitfalls

- **Reading raw price distance.** PGO is *normalised* by volatility — a
  reading of `2` means "2 ATR-equivalents above the mean", not 2 price
  units.
- **Mistaking it for an oscillator with fixed bounds.** Despite the name,
  PGO is unbounded; only the `±3` convention gives it working thresholds.

## References

- Mark Johnson, "Pretty Good Oscillator", *Technical Analysis of Stocks &
  Commodities*, 1995.

## See also

- [Atr](/Indicators/Indicator-Atr) / [TrueRange](/Indicators/Indicator-TrueRange) — the volatility
  scale in the denominator.
- [Cci](/Indicators/Indicator-Cci) — another mean-displacement-over-dispersion
  oscillator (uses mean absolute deviation instead of ATR).
- [ZScore](/Indicators/Indicator-ZScore) — displacement normalised by standard
  deviation rather than ATR.
