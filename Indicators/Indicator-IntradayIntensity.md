# IntradayIntensity

> David Bostian's Intraday Intensity Index — a cumulative line weighting each
> bar's volume by where the close sits inside its range.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Volume |
| Input type | `Candle` (high / low / close / volume) |
| Output type | `f64` |
| Output range | `(−∞, +∞)` (a cumulative line; only slope/divergence matters) |
| Default parameters | None (parameter-free) |
| Warmup period | `1` |
| Interpretation | Rising = accumulation; falling = distribution; watch divergence vs price. |

## Formula

```
II_t  = volume * (2*close − high − low) / (high − low)   (0 if high == low)
III_t = III_{t−1} + II_t
```

The bracketed fraction is the **close-location value**: `+1` when the bar closes
on its high, `−1` on its low, `0` at the midpoint. Multiplying by volume and
accumulating gives Bostian's running measure of buying versus selling intensity.
Source: `crates/wickra-core/src/indicators/intraday_intensity.rs`.

This is the **cumulative** index, not "Intraday Intensity %". The percent variant
divides a windowed sum of `II` by a windowed sum of volume — which is exactly
[`Cmf`](/Indicators/Indicator-ChaikinMoneyFlow) — so it is intentionally not duplicated.

## Parameters

| Name | Type | Default | Valid range | Source | Description |
|------|------|---------|-------------|--------|-------------|
| — | — | — | — | None. | The index is parameter-free; `IntradayIntensity::new()` is infallible. |

The `value` getter returns the current cumulative total if ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/intraday_intensity.rs`:

```rust
use wickra::{Candle, Indicator, IntradayIntensity};
// IntradayIntensity: Input = Candle, Output = f64
const _: fn(&mut IntradayIntensity, Candle) -> Option<f64> = <IntradayIntensity as Indicator>::update;
```

A `Candle` in, an `Option<f64>` out. The Python binding takes a candle for
`update` and four numpy columns `(high, low, close, volume)` for `batch`; Node
takes `update(high, low, close, volume)` and `batch(high[], low[], close[],
volume[])`. With `warmup_period == 1` there is no NaN prefix.

## Warmup

`warmup_period() == 1`. The line accumulates from the very first bar
(`first_bar_emits` pins this).

## Edge cases

- **Close on the high → +volume.** A close at the high contributes the full volume
  positively (`close_on_high_adds_full_volume` pins this).
- **Close on the low → −volume.** A close at the low contributes the full volume
  negatively (`close_on_low_subtracts_full_volume` pins this).
- **Close at the midpoint → 0.** A midpoint close contributes nothing
  (`close_at_midpoint_adds_nothing` pins this).
- **Zero range → 0.** A bar with `high == low` contributes nothing rather than
  dividing by zero (`zero_range_adds_nothing` pins this).
- **Accumulation.** Successive bars sum into the running total
  (`accumulates_across_bars` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `iii.reset()` clears the running total and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, IntradayIntensity};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut iii = IntradayIntensity::new();
    let candles = [
        Candle::new(100.0, 110.0, 100.0, 110.0, 1_000.0, 0)?, // close on high -> +1000
        Candle::new(110.0, 110.0, 100.0, 100.0,   400.0, 0)?, // close on low  -> -400
    ];
    let out = iii.batch(&candles);
    println!("{:?}", out); // [Some(1000.0), Some(600.0)]
    Ok(())
}
```

Output:

```
[Some(1000.0), Some(600.0)]
```

### Python

```python
import numpy as np
import wickra as ta

iii = ta.IntradayIntensity()
high   = np.array([110, 110], dtype=float)
low    = np.array([100, 100], dtype=float)
close  = np.array([110, 100], dtype=float)
volume = np.array([1000, 400], dtype=float)
print(iii.batch(high, low, close, volume))  # [1000.  600.]
```

### Node

```javascript
const ta = require('wickra');

const iii = new ta.IntradayIntensity();
console.log(iii.batch([110, 110], [100, 100], [110, 100], [1000, 400])); // [1000, 600]
```

### Streaming

```rust
use wickra::{Candle, Indicator, IntradayIntensity};

let mut iii = IntradayIntensity::new();
let mut last = None;
for i in 0..20 {
    let base = 100.0 + f64::from(i);
    let c = Candle::new(base, base + 1.0, base - 1.0, base + 0.9, 1_000.0, 0).unwrap();
    last = iii.update(c);
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Accumulation/distribution.** A persistently rising line says closes are being
   pushed toward highs on volume — accumulation; a falling line is distribution.
2. **Divergence.** The line trending opposite to price is the classic warning that
   the move lacks volume support.
3. **Smoothing.** Because the raw line is jagged, many traders apply a moving
   average to it and trade crossovers.

## Common pitfalls

- **Not the percent version.** This is the cumulative index; for the bounded
  oscillator use [`Cmf`](/Indicators/Indicator-ChaikinMoneyFlow).
- **Level is arbitrary.** Only the shape matters.
- **Volume quality.** Like every money-flow line it needs trustworthy volume.

## References

Bostian, D., *Intraday Intensity Index* — popularized via John Bollinger's work;
see Bollinger, J. (2001), *Bollinger on Bollinger Bands*.

## See also

- [Indicator-ChaikinMoneyFlow](/Indicators/Indicator-ChaikinMoneyFlow) — the bounded "Intraday Intensity %".
- [Indicator-Adl](/Indicators/Indicator-Adl) — Chaikin's accumulation/distribution line.
- [Indicator-Obv](/Indicators/Indicator-Obv) — cumulative signed volume.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
