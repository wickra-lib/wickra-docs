# McGinleyDynamic

> John McGinley's self-adjusting moving average — speeds up when price falls
> below the indicator and damps when price runs above.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Moving Averages |
| Input type | `f64` (single close) |
| Output type | `f64` |
| Output range | unbounded; tracks the input price scale |
| Default parameters | `period = 10` |
| Warmup period | `period` |
| Interpretation | Adaptive MA that compensates for price-vs-MA acceleration. |

## Formula

```
seed    = SMA(price, period)                     // first `period` inputs
ratio   = price_t / MD_{t-1}
divisor = 0.6 · period · ratio⁴
MD_t    = MD_{t-1} + (price_t − MD_{t-1}) / divisor
```

The fourth-power ratio shrinks the divisor when price falls below the
indicator (so it catches up faster) and inflates it when price runs above
(more smoothing). `0.6` is McGinley's original constant `K`.

## Parameters

| Name     | Type    | Default | Constraint | Source |
|----------|---------|---------|------------|--------|
| `period` | `usize` | `10`    | `>= 1`     | `McGinleyDynamic::new` (`mcginley_dynamic.rs:52`) |

`period == 0` returns [`Error::PeriodZero`]. Python default comes from
`#[pyo3(signature = (period=10))]`; the Node constructor takes `period`
explicitly. The public class is `McGinleyDynamic` in both bindings.

## Inputs / Outputs

```rust
impl Indicator for McGinleyDynamic {
    type Input  = f64;
    type Output = f64;
    fn update(&mut self, input: f64) -> Option<f64>;
}
```

A single `f64` close in, an `Option<f64>` out. Python maps this to
`float | None` / a `float64` `np.ndarray` with `NaN` warmup; Node to
`number | null` / `Array<number>`.

## Warmup

`warmup_period()` returns `period`. The indicator is seeded with
`SMA(period)` of the first `period` inputs, then the recurrence iterates.
Pinned by `warmup_emits_first_value_at_period` (period 3: first two updates
`None`, third emits `SMA([10, 20, 30]) = 20.0`).

## Edge cases

- **Constant series.** `ratio = 1` and `price − MD = 0`, so the recurrence
  collapses to `MD` — the constant is reproduced exactly (test
  `constant_series_yields_the_constant`).
- **Non-positive price.** A zero or negative price makes the `(price/MD)⁴`
  divisor ill-conditioned; the indicator holds its previous value and resumes
  on the next positive price (test `holds_value_when_input_is_non_positive`).
- **Non-finite input.** `NaN` / `±∞` are ignored (test
  `ignores_non_finite_input`).
- **Reset.** `reset()` clears the SMA seed and the running value.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, McGinleyDynamic};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // period 3, seed = SMA([10, 20, 30]) = 20. On price 40:
    // ratio = 2, divisor = 0.6·3·2⁴ = 28.8, next = 20 + 20/28.8 = 20.6944…
    let mut md = McGinleyDynamic::new(3)?;
    md.batch(&[10.0, 20.0, 30.0]);
    println!("{:.4}", md.update(40.0).unwrap()); // 20.6944
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

md = ta.McGinleyDynamic(3)
print(md.batch(np.array([10.0, 20.0, 30.0, 40.0]))[-1])  # 20.6944...
```

### Node

```javascript
const ta = require('wickra');
const md = new ta.McGinleyDynamic(3);
md.batch([10, 20, 30]);
console.log(md.update(40)); // 20.6944...
```

## Interpretation

McGinley designed the Dynamic to fix what he saw as a flaw in fixed-period
moving averages: they lag price by a fixed amount regardless of speed. The
fourth-power ratio makes the line:

1. **Hug price in fast declines.** When price drops below the line, the
   divisor shrinks and the line accelerates down to catch up — reducing the
   whipsaw a fixed MA gives on sharp sell-offs.
2. **Resist getting whipped up in spikes.** When price spikes above, the
   divisor inflates and the line smooths more, ignoring the spike.

Use it as a drop-in for an EMA/SMA where you want less lag without more
false crossovers.

## Common pitfalls

- **Feeding non-price data.** The `(price/MD)⁴` ratio assumes a positive
  price scale; series that cross zero break the ratio's interpretation.
- **Comparing the `K = 0.6` form to `pandas-ta`'s `mcgd(c=1.0)`.** Wickra
  uses McGinley's original `0.6`; the `pandas-ta` default is a looser
  later tuning and will not match numerically.

## References

- John R. McGinley Jr., "McGinley Dynamic", *Technical Analysis of Stocks &
  Commodities*, 1990. The `0.6` constant matches McGinley's original paper
  and the common TradingView implementation.

## See also

- [Ema](Indicator-Ema) — the fixed-lag average McGinley aimed to improve on.
- [Vidya](Indicator-Vidya) / [Kama](Indicator-Kama) — other adaptive MAs.
- [T3](Indicator-T3) — Tillson's low-lag smoother.
