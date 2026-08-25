# EHMA

> Exponential Hull Moving Average — Alan Hull's lag-reduction construction
> `EMA(2·EMA(n/2) − EMA(n), √n)`, built from EMAs instead of WMAs for a
> recursive, smoother variant of the [`Hma`](/Indicators/Indicator-Hma).

## Quick reference

| Field | Value |
|-------|-------|
| Family | Moving Averages |
| Input type | `f64` (single close) |
| Output type | `f64` |
| Output range | unbounded; tracks the input price scale |
| Default parameters | `period` is required (no default in either binding) |
| Warmup period (`warmup_period()`) | `period + round(√period).max(1) − 1` — exact first-emission index |
| Interpretation | Near-zero-lag trend line, smoother than WMA-based HMA. |

## Formula

```
half   = max(period / 2, 1)                  // integer division
smooth = max(round(sqrt(period)), 1)         // nearest integer, floor at 1

raw_t  = 2 * EMA(price, half)_t  -  EMA(price, period)_t
EHMA_t = EMA(raw, smooth)_t
```

This is the Hull recipe with every weighted moving average replaced by an
exponential one. The `2·EMA(n/2) − EMA(n)` step exploits the fact that the fast
EMA leads the slow EMA on a trend: at steady state on a constant-slope ramp the
fast EMA's lag is `(half−1)/2` and the slow EMA's is `(period−1)/2`, so the
combination `raw` actually *leads* the price, and the final `EMA(…, √period)`
smooths that overshoot back onto the price line. For `period = 9` this gives
`half = 4`, `smooth = 3`; for `period = 14`, `half = 7`, `smooth = 4`.

Versus the WMA-based [`Hma`](/Indicators/Indicator-Hma): the EMA components have infinite
(exponentially decaying) memory and a strictly recursive O(1) update, which
makes the EHMA marginally smoother but a touch laggier than the windowed HMA.

Source: `crates/wickra-core/src/indicators/ehma.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= 1`      | `ehma.rs:43` | Top-level lookback. The inner EMA periods (`half`, `period`, `smooth`) are derived from it. `period = 0` errors with `Error::PeriodZero`. |

(Python class `wickra.EHMA(period)` has no `#[pyo3(signature)]` default; pass
`period` explicitly.)

## Inputs / Outputs

From `crates/wickra-core/src/indicators/ehma.rs`:

```rust
use wickra::{Ehma, Indicator};
// Ehma: Input = f64, Output = f64
const _: fn(&mut Ehma, f64) -> Option<f64> = <Ehma as Indicator>::update;
```

Python returns `float | None` (streaming) / `array.array('d')` (batch, `NaN` for
warmup). Node returns `number | null` / `Array<number>` with `NaN`.

## Warmup

`warmup_period()` returns:

```
period + round(sqrt(period)).max(1) - 1
```

which gives `11` for `Ehma::new(9)`, `17` for `Ehma::new(14)`, `19` for
`Ehma::new(16)`. The figure is **exact**: the first non-`None` output lands on
input `warmup_period()` (index `warmup_period() − 1`).

The three inner EMAs warm up *in parallel* — `half_ema` and `full_ema` both
receive every input, so the slow `EMA(period)` seeds at input `period`. The
`2·half − full` diff then flows into `smooth_ema`, which needs `round(√period)`
of those, giving a first emission at exactly `period + round(√period) − 1`.

| `period` | `round(√period)` | `warmup_period()` | First emission (input #) |
|----------|------------------|-------------------|--------------------------|
| 9        | 3                | 11                | 11                       |
| 14       | 4                | 17                | 17                       |
| 16       | 4                | 19                | 19                       |

Pinned by the `first_emission_matches_warmup_period` test in `ehma.rs`
(`Ehma::new(9).warmup_period() == 11`, first `Some` at index 10).

## Edge cases

- **Constant series.** Feeding `[10.0; n]` produces `Some(10.0)` once warm: all
  three EMAs converge to `10`, `raw = 2·10 − 10 = 10`, and `EMA(10, smooth) = 10`.
  Pinned by `constant_series_yields_constant_ehma` (`Ehma::new(9)` over 80
  constants).
- **`period = 1`.** `half = full = smooth = 1`; every EMA seeds on its first
  input, so EHMA(1) passes the price straight through — pinned by
  `period_one_collapses_to_pass_through`.
- **NaN / infinity inputs.** Inherited from the inner [`Ema`](/Indicators/Indicator-Ema):
  non-finite inputs are dropped at the half/full EMA boundary and never reach
  the `2·h − f` arithmetic.
- **Reset.** `ehma.reset()` resets all three internal EMAs; the next `update`
  restarts a full warmup countdown — pinned by `reset_clears_state`.
- **Equivalence to independent EMAs.** `matches_independent_emas` runs three
  standalone EMAs alongside the EHMA and asserts identical readiness and values.

## Examples

### Rust

```rust
use wickra::{BatchExt, Ehma, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut ehma = Ehma::new(9)?;
    let out: Vec<Option<f64>> = ehma.batch(&[10.0_f64; 14]);
    println!("warmup_period = {}", ehma.warmup_period());
    println!("{:?}", out);
    Ok(())
}
```

Output:

```
warmup_period = 11
[None, None, None, None, None, None, None, None, None, None, Some(10.0), Some(10.0), Some(10.0), Some(10.0)]
```

The first `Some` lands at index 10 (the 11th input) — exactly
`warmup_period() − 1`. On a constant series every EMA converges to the constant,
so the EHMA settles immediately on it.

### Python

```python
import numpy as np
import wickra as ta

ehma = ta.EHMA(9)
out = ehma.batch(np.full(14, 10.0))
print("warmup_period =", ehma.warmup_period())
print(out)
```

Output:

```
warmup_period = 11
[nan nan nan nan nan nan nan nan nan nan 10. 10. 10. 10.]
```

### Node

```javascript
const ta = require('wickra');
const ehma = new ta.EHMA(9);
console.log(ehma.batch(Array.from({ length: 14 }, () => 10)));
console.log('warmupPeriod:', ehma.warmupPeriod());
```

Output:

```
[
  NaN, NaN, NaN, NaN, NaN,
  NaN, NaN, NaN, NaN, NaN,
   10,  10,  10,  10
]
warmupPeriod: 11
```

### Streaming

```rust
use wickra::{Ehma, Indicator};

let mut ehma = Ehma::new(9)?;
let mut last = None;
for i in 0..40 {
    last = ehma.update(100.0 + f64::from(i)); // rising ramp
}
// On a steady ramp the EHMA converges onto the price line (lag-free).
println!("{:?}", last);
# Ok::<(), Box<dyn std::error::Error>>(())
```

## Interpretation

`Ehma` is the recursive sibling of [`Hma`](/Indicators/Indicator-Hma): the same
lag-reduction trick (`2·fast − slow`, then smooth) without the fixed-window
WMAs. On clean trending data it sits effectively on top of price with no visible
lag; on noisy data the final `EMA(√period)` smoothing pass keeps the line
readable, and the exponential memory of the components makes it marginally
smoother than the WMA-based HMA.

The textbook signal is slope direction (EHMA turning up = uptrend) and
fast/slow EHMA crossovers, which tend to be cleaner than the equivalent EMA
pair. Choose EHMA over HMA when you prefer the smoother, recursive response and
can tolerate slightly more lag; choose HMA when you want the crispest possible
turn.

## Common pitfalls

- **Mis-reading the warmup as lag.** `warmup_period()` is the exact
  first-emission index; the leading `None`/`NaN` values are warmup, not lag.
- **Very short periods.** For `period = 2` or `3` the inner `half = period / 2`
  floors at 1 and the smoothing is negligible, producing a sharp, noisy line.
  EHMA is designed for `period >= 9`; for shorter lookbacks use
  [`Ema`](/Indicators/Indicator-Ema) directly.

## References

Alan Hull, *"How to Reduce Lag in a Moving Average"*, 2005 — the original Hull
construction (documented at
<https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-overlays/hull-moving-average-hma>).
The exponential variant substitutes EMAs for the WMAs of the canonical HMA.

## See also

- [Indicator-Hma](/Indicators/Indicator-Hma) — the canonical WMA-based Hull average.
- [Indicator-Ema](/Indicators/Indicator-Ema) — the building block.
- [Indicator-Tema](/Indicators/Indicator-Tema) — triple-EMA lag reduction without the Hull diff.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
