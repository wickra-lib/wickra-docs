# APO

> Absolute Price Oscillator — `EMA(close, fast) − EMA(close, slow)`.
> Like MACD but without the signal-EMA: just the momentum-direction line.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Oscillators |
| Input type | `f64` (single close) |
| Output type | `f64` |
| Output range | unbounded around zero |
| Default parameters | `fast = 12`, `slow = 26` |
| Warmup period | `slow` (exact) |
| Interpretation | Positive in uptrends (fast EMA leads slow), negative in downtrends. |

## Formula

```
APO_t = EMA(close, fast)_t − EMA(close, slow)_t
```

`fast` must be strictly less than `slow`. This is exactly MACD's main
line; use [MacdIndicator](/Indicators/Indicator-MacdIndicator) when you also need the
signal line and histogram, and APO when only the raw fast-minus-slow spread
matters.

## Parameters

| Name   | Type    | Default | Constraint       | Source |
|--------|---------|---------|------------------|--------|
| `fast` | `usize` | `12`    | `>= 1`, `< slow` | `Apo::new` (`apo.rs:42`) |
| `slow` | `usize` | `26`    | `>= 1`, `> fast` | `apo.rs:42` |

`fast == 0` or `slow == 0` returns [`Error::PeriodZero`]; `fast >= slow`
returns [`Error::InvalidPeriod`]. `Apo::classic()` returns `(12, 26)`.
Python defaults come from `#[pyo3(signature = (fast=12, slow=26))]`; the
Node constructor takes both arguments explicitly. The public class is
`APO` in both bindings.

## Inputs / Outputs

```rust
use wickra::{Indicator, Apo};
// Apo: Input = f64, Output = f64
const _: fn(&mut Apo, f64) -> Option<f64> = <Apo as Indicator>::update;
```

A single `f64` close in, an `Option<f64>` out. The Python binding maps this
to `float | None` (streaming) or a `float64` `np.ndarray` with `NaN` warmup
rows (batch). The Node binding maps it to `number | null` /
`Array<number>` with `NaN` warmup.

## Warmup

`warmup_period()` returns `slow`. Both EMAs are fed on every input so the
slow one (the binding constraint) emits on input `slow` (index `slow − 1`),
and APO emits the difference on that same bar. Pinned by
`warmup_emits_first_value_at_slow_period` (slow = 4: inputs 1–3 return
`None`, input 4 emits).

## Edge cases

- **Constant series.** Both EMAs reproduce the constant, so APO is exactly
  `0` after warmup (test `constant_series_converges_to_zero`).
- **Pure uptrend.** The fast EMA leads, so APO stays positive (test
  `pure_uptrend_is_positive`).
- **Reset.** `reset()` resets both EMAs; the next update restarts warmup.

## Examples

### Rust

```rust
use wickra::{Apo, BatchExt, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prices: Vec<f64> = (1..=200).map(f64::from).collect();
    let mut apo = Apo::classic(); // (12, 26)
    let last = apo.batch(&prices).into_iter().flatten().last().unwrap();
    println!("APO on a steady uptrend = {last:.4} (> 0)");
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

apo = ta.APO(12, 26)
out = apo.batch(np.arange(1, 201, dtype=float))  # 1-D, NaN for the first 25 rows
print(out[-1])  # positive on the uptrend
```

### Node

```javascript
const ta = require('wickra');
const apo = new ta.APO(12, 26);
const prices = Array.from({ length: 200 }, (_, i) => i + 1);
console.log(apo.batch(prices).at(-1)); // positive on the uptrend
```

## Interpretation

APO is a zero-centered momentum line:

1. **Sign = trend direction.** Above zero, the fast EMA is above the slow —
   bullish momentum; below zero, bearish.
2. **Zero crossings = MACD crossovers.** Because APO is the MACD line, an
   APO zero-cross is the fast/slow EMA crossover, the classic momentum
   signal.
3. **Magnitude = momentum strength**, but in *price units* — so APO values
   are not comparable across instruments at different price scales (use
   [Ppo](/Indicators/Indicator-Ppo), the percentage variant, for that).

## Common pitfalls

- **Comparing APO across symbols.** It is denominated in price units; a
  \$5 spread on a \$500 stock is not comparable to \$5 on a \$10 stock. Use
  [Ppo](/Indicators/Indicator-Ppo) (percentage price oscillator) for cross-instrument
  comparison.
- **Expecting a signal line.** APO has none — pair it with your own EMA, or
  use [MacdIndicator](/Indicators/Indicator-MacdIndicator) which bundles the signal and
  histogram.

## References

APO is the unsmoothed MACD line; see Gerald Appel's MACD work and any
standard MACD reference (e.g. John Bollinger, *Bollinger on Bollinger
Bands*, 2001).

## See also

- [MacdIndicator](/Indicators/Indicator-MacdIndicator) — APO plus a signal line and
  histogram.
- [Ppo](/Indicators/Indicator-Ppo) — the percentage-normalised version.
- [Ema](/Indicators/Indicator-Ema) — the building block.
