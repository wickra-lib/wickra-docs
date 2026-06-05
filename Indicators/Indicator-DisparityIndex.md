# DisparityIndex

> Disparity Index — the percentage gap between price and its simple moving
> average, the Japanese *kairi* measure of how over-extended a move is.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Momentum Oscillators |
| Input type | `f64` (single price) |
| Output type | `f64` (percent) |
| Output range | unbounded; centered on `0` (price at its mean) |
| Default parameters | `period` is required (no default in either binding) |
| Warmup period (`warmup_period()`) | `period` — first emission once the inner SMA is ready |
| Interpretation | Distance of price from its mean, as a percentage. |

## Formula

```
Disparity = 100 * (price - SMA(price, period)) / SMA(price, period)
```

The disparity index normalises the gap between the current price and its
`period`-bar simple moving average by the average itself, giving a
scale-independent percentage. `+5` means price is 5% above its mean; `−5` means
5% below. The further from zero, the more stretched the move — making it a
mean-reversion gauge and an overbought/oversold proxy that adapts to the
instrument's own price level.

If the moving average is exactly zero the percentage is undefined and the index
returns `0.0`. Source:
`crates/wickra-core/src/indicators/disparity_index.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= 1`      | `disparity_index.rs:51` | SMA lookback. `period = 0` errors with `Error::PeriodZero`. |

(Python class `wickra.DisparityIndex(period)` has no `#[pyo3(signature)]`
default; pass `period` explicitly.)

## Inputs / Outputs

From `crates/wickra-core/src/indicators/disparity_index.rs`:

```rust
use wickra::{DisparityIndex, Indicator};
// DisparityIndex: Input = f64, Output = f64
const _: fn(&mut DisparityIndex, f64) -> Option<f64> =
    <DisparityIndex as Indicator>::update;
```

Python returns `float | None` (streaming) / `numpy.ndarray` (batch, `NaN` for
warmup). Node returns `number | null` / `Array<number>` with `NaN`.

## Warmup

`warmup_period()` returns `period`: the index emits as soon as the inner SMA is
defined, on input `period` (index `period − 1`). Pinned by
`accessors_and_metadata` (`warmup_period() == 14`) and `warmup_then_known_value`,
which checks the first two inputs of a DisparityIndex(3) return `None` and the
third returns the percentage gap.

## Edge cases

- **Constant series → zero.** Price equals its own mean, so disparity is `0`;
  pinned by `constant_series_is_zero`.
- **Below the mean → negative.** `negative_when_below_mean` pins SMA(3) of
  `[10, 8, 6]` (mean 8), price 6 → `−25`.
- **Zero mean.** `zero_mean_returns_zero` feeds `[-3, 3]` (mean 0) and asserts
  the guarded `0.0` rather than a non-finite value.
- **Reset.** `reset_clears_state` clears the inner SMA.
- **Streaming/batch equivalence.** `batch_equals_streaming` checks both paths
  agree.

## Examples

### Rust

```rust
use wickra::{BatchExt, DisparityIndex, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut di = DisparityIndex::new(3)?;
    let out: Vec<Option<f64>> = di.batch(&[2.0, 4.0, 6.0, 8.0, 10.0]);
    println!("warmup_period = {}", di.warmup_period());
    println!("{:?}", out);
    Ok(())
}
```

Output:

```
warmup_period = 3
[None, None, Some(50.0), Some(33.333333333333336), Some(25.0)]
```

At index 2 the SMA of `[2, 4, 6]` is `4` and price is `6`, so disparity is
`100·(6−4)/4 = 50%`; at index 3 the SMA of `[4, 6, 8]` is `6`, price `8`, giving
`100·(8−6)/6 = 33.33%`.

### Python

```python
import numpy as np
import wickra as ta

di = ta.DisparityIndex(3)
out = di.batch(np.array([2.0, 4.0, 6.0, 8.0, 10.0]))
print("warmup_period =", di.warmup_period())
print(np.round(out, 4))
```

Output:

```
warmup_period = 3
[    nan     nan 50.     33.3333 25.    ]
```

### Node

```javascript
const ta = require('wickra');
const di = new ta.DisparityIndex(3);
console.log(di.batch([2, 4, 6, 8, 10]).map((v) => Math.round(v * 1e4) / 1e4));
console.log('warmupPeriod:', di.warmupPeriod());
```

Output:

```
[ NaN, NaN, 50, 33.3333, 25 ]
warmupPeriod: 3
```

### Streaming

```rust
use wickra::{DisparityIndex, Indicator};

let mut di = DisparityIndex::new(3)?;
for price in [10.0, 8.0, 6.0] {
    if let Some(v) = di.update(price) {
        println!("{v}"); // SMA = 8, price 6 -> -25%
    }
}
# Ok::<(), Box<dyn std::error::Error>>(())
```

Output:

```
-25
```

## Interpretation

The disparity index is a **mean-reversion and over-extension gauge**. Because it
is expressed as a percent of the moving average, the same threshold works across
instruments of very different price levels — a `±3%` band means the same thing
for a $10 stock and a $1000 one, where a raw price-minus-MA distance would not.

Typical uses:

1. **Overbought/oversold bands.** Mark static thresholds (e.g. `±5%`); readings
   beyond them flag stretched moves prone to snap back.
2. **Trend confirmation.** Persistent positive disparity confirms an uptrend;
   the index oscillating around zero signals a range.
3. **Divergence.** Price making a new high while disparity makes a lower high
   warns the move is losing thrust.

## Common pitfalls

- **Fixed thresholds across regimes.** A volatile instrument needs wider bands
  than a calm one; calibrate the over-extension threshold per instrument.
- **SMA vs EMA.** This index uses a simple moving average; an EMA-based variant
  would react faster and shift the threshold calibration.

## References

The disparity index (*kairi-ritsu*) is a standard tool of Japanese technical
analysis, measuring the deviation of price from its moving average in percent.

## See also

- [Indicator-Sma](/Indicators/Indicator-Sma) — the moving average the index is measured against.
- [Indicator-PercentB](/Indicators/Indicator-PercentB) — analogous over-extension gauge within Bollinger bands.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
