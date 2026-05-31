# Inertia

> Donald Dorsey's Inertia — a [LinearRegression](Indicator-LinearRegression)
> smoothing of the [RVI](Indicator-Rvi) series. Preserves trend direction
> while damping the underlying ratio.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Momentum Oscillators |
| Input type | `Candle` (uses `open`, `high`, `low`, `close`) |
| Output type | `f64` |
| Output range | unbounded; tracks the RVI ratio's scale |
| Default parameters | `rvi_period = 14`, `linreg_period = 20` |
| Warmup period | `rvi_period + linreg_period − 1` (`33` for defaults) |
| Interpretation | Slow trend-following variant of RVI; a cross of zero signals a trend change. |

## Formula

```
Inertia_t = LinearRegression(RVI(close − open, high − low; rvi_period), linreg_period)_t
```

Each bar's [RVI](Indicator-Rvi) value feeds a rolling least-squares
regression; the endpoint of the fit is published. Dorsey's thesis is that a
market's *inertia* — its tendency to keep doing what it is doing — is best
read from the smoothed slope of vigor rather than the noisy ratio itself.

## Parameters

| Name            | Type    | Default | Constraint | Source |
|-----------------|---------|---------|------------|--------|
| `rvi_period`    | `usize` | `14`    | `>= 1`     | `Inertia::new` (`inertia.rs:46`) |
| `linreg_period` | `usize` | `20`    | `>= 1`     | `inertia.rs:46` |

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
  `batch(open, high, low, close)` returns a 1-D `float64` `np.ndarray` with
  `NaN` warmup.
- **Node.** `update(open, high, low, close)` returns `number | null`;
  `batch(open, high, low, close)` returns an `Array<number>` with `NaN`
  warmup.

## Warmup

`warmup_period()` returns `rvi_period + linreg_period − 1`. The inner RVI
emits at `rvi_period` candles; the regression then needs `linreg_period − 1`
more RVI values to fill its window. Pinned by
`warmup_emits_first_value_at_warmup_period` ((3, 4) → warmup 6: first five
`None`, sixth emits).

## Edge cases

- **Constant RVI.** Identical candles give a constant RVI; the regression of
  a constant series equals that constant — e.g. RVI `= 0.5/2.0 = 0.25` for a
  `(c−o)=0.5`, `(h−l)=2.0` bar (test `constant_rvi_yields_constant_inertia`).
- **Reset.** `reset()` resets both the inner RVI and the regression.

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

### Python

```python
import wickra as ta
inertia = ta.Inertia(14, 20)
out = inertia.batch(open_, high, low, close)  # 1-D series, NaN warmup (33 rows)
```

### Node

```javascript
const ta = require('wickra');
const inertia = new ta.Inertia(14, 20);
const v = inertia.update(100, 100.7, 99.8, 100.5); // open, high, low, close
```

## Interpretation

Inertia is RVI run through a regression smoother, so it trades responsiveness
for stability:

1. **Trend persistence.** Positive Inertia ⇒ vigor is trending up ⇒ the
   market's "inertia" is bullish; negative ⇒ bearish. The slow smoothing
   makes the zero-line cross a higher-conviction trend-change signal than a
   raw RVI cross.
2. **Pair with RVI.** Use raw [RVI](Indicator-Rvi) for early reads and
   Inertia to confirm the trend has actually turned.

## Common pitfalls

- **Expecting RVI-speed signals.** Inertia deliberately lags — its warmup is
  `rvi_period + linreg_period − 1` bars and its turns trail RVI's.
- **Reading absolute magnitude.** Like RVI it is a ratio scale, not a bounded
  `0–100` oscillator.

## References

- Donald Dorsey, "Inertia", *Technical Analysis of Stocks & Commodities*.

## See also

- [Rvi](Indicator-Rvi) — the underlying vigor ratio.
- [LinearRegression](Indicator-LinearRegression) — the smoother applied.
- [RVIVolatility](Indicator-RviVolatility) — the unrelated volatility RVI.
