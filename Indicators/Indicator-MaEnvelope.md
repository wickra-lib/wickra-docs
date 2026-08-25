# MaEnvelope

> SMA centerline with a fixed-percent envelope on each side. The oldest
> band-style overlay still in regular use, and the only one whose width is
> driven by price level rather than realised volatility.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Bands & Channels |
| Input type | `f64` (typically the close price) |
| Output type | `MaEnvelopeOutput { upper, middle, lower }` |
| Output range | unbounded; `lower ≤ middle ≤ upper` |
| Default parameters | `period = 20`, `percent = 0.025` (±2.5 %) |
| Warmup period | `period` (exact) |
| Interpretation | Mean-reversion envelope. Crossings often used for swing entries. |

## Formula

```
middle = SMA(period)
upper  = middle · (1 + percent)
lower  = middle · (1 − percent)
```

The band width is a fixed *multiplicative* offset around the moving
average, so it scales with price rather than realised volatility
(contrast Bollinger Bands' `2·k·σ` or Keltner's `2·k·ATR`). A 2.5 %
envelope is the chart-vendor default; trend traders sometimes raise it
to 5–10 %.

## Parameters

| Name      | Type    | Default | Constraint    | Source |
|-----------|---------|---------|---------------|--------|
| `period`  | `usize` | `20`    | `>= 1`        | `MaEnvelope::new` (`ma_envelope.rs:60`) |
| `percent` | `f64`   | `0.025` | finite, `> 0` | `ma_envelope.rs:61` |

`period == 0` returns [`Error::PeriodZero`]; a non-finite or non-positive
`percent` returns [`Error::NonPositiveMultiplier`]. Python defaults come from
`#[pyo3(signature = (period=20, percent=0.025))]`; the Node constructor takes
both arguments explicitly.

## Inputs / Outputs

```rust
use wickra::{Indicator, MaEnvelope, MaEnvelopeOutput};
// MaEnvelope: Input = f64, Output = MaEnvelopeOutput
const _: fn(&mut MaEnvelope, f64) -> Option<MaEnvelopeOutput> = <MaEnvelope as Indicator>::update;
```

- **Python streaming.** `update(value)` returns `(upper, middle, lower)` or `None`.
- **Python batch.** `MaEnvelope.batch(prices)` returns an `(n, 3)` `Matrix`
  with columns `[upper, middle, lower]`; warmup rows are `NaN`.
- **Node streaming.** `update(value)` returns a `{ upper, middle, lower }`
  object or `null`.
- **Node batch.** `batch(prices)` returns a flat `Array<number>` of length
  `n * 3`, interleaved `[u0, m0, l0, …]`.

## Warmup

`warmup_period()` returns `period` and the figure is exact: the envelope
is just the SMA scaled up and down, so the first non-`None` output lands
on input `period` (index `period − 1`), exactly when the SMA emits. Pinned
by `warmup_returns_none` (period 5: inputs 1–4 return `None`, input 5 emits).

## Edge cases

- **Constant series.** `[100.0; n]` returns `middle = 100`, `upper = 100·(1+percent)`,
  `lower = 100·(1−percent)` — the bands stay a fixed percentage apart
  (test `constant_series_yields_flat_envelope`).
- **Ordering.** `upper >= middle >= lower` always holds for `percent > 0`
  and non-negative prices.
- **Negative prices.** The multiplicative form means a negative input
  *flips* the band order; `MaEnvelope` is intended for non-negative price
  series.
- **Reset.** `reset()` clears the underlying SMA and restarts warmup.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, MaEnvelope};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut env = MaEnvelope::new(3, 0.10)?; // ±10 %
    for v in env.batch(&[10.0, 20.0, 30.0]) {
        println!("{:?}", v);
    }
    Ok(())
}
```

Output:

```
None
None
Some(MaEnvelopeOutput { upper: 22.0, middle: 20.0, lower: 18.0 })
```

`SMA([10, 20, 30]) = 20`; with `percent = 0.10` the bands are `20·1.1 = 22`
and `20·0.9 = 18` (test `reference_values`).

### Python

```python
import numpy as np
import wickra as ta

env = ta.MaEnvelope(3, 0.10)
print(env.batch(np.array([10.0, 20.0, 30.0])))
```

Output:

```
[[nan nan nan]
 [nan nan nan]
 [22. 20. 18.]]
```

### Node

```javascript
const ta = require('wickra');
const env = new ta.MaEnvelope(3, 0.10);
console.log(env.batch([10, 20, 30]));
// [ NaN, NaN, NaN, NaN, NaN, NaN, 22, 20, 18 ]
```

## Interpretation

A moving-average envelope frames "normal" price excursion as a fixed
percentage band around trend:

1. **Mean reversion.** In a range, fade closes that pierce the upper/lower
   envelope back toward the SMA midline.
2. **Trend filter.** In a trend, the band that price *rides* (upper in an
   uptrend) acts as dynamic support/resistance; a close back inside the
   opposite band warns of exhaustion.

Pick the envelope percent to match the instrument's typical daily range:
2.5 % suits large-cap equities, while crypto often needs 5–10 %.

## Common pitfalls

- **Using a volatility-scaled mental model.** The width here is constant in
  percentage terms — it does *not* widen in turbulent markets the way
  [BollingerBands](/Indicators/Indicator-BollingerBands) or [Keltner](/Indicators/Indicator-Keltner)
  do. In a volatility spike the envelope will be pierced far more often.
- **Forgetting the multiplicative form.** `percent = 0.025` is ±2.5 %, not
  ±2.5 price units.

## References

Earliest chart-vendor publications date to the 1960s; the construct is
covered in Robert Edwards & John Magee's *Technical Analysis of Stock
Trends* (1948) as the "trading band". There is no single canonical
citation — the indicator predates the chart-software industry that named it.

## See also

- [BollingerBands](/Indicators/Indicator-BollingerBands) — volatility-driven width.
- [Keltner](/Indicators/Indicator-Keltner) — ATR-driven width.
- [Donchian](/Indicators/Indicator-Donchian) — pure rolling high/low.
- [HurstChannel](/Indicators/Indicator-HurstChannel) — range-driven width.
