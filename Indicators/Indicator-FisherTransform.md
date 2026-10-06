# Fisher Transform

> John Ehlers' Fisher Transform of price. Normalises the most recent
> price to `[-1, +1]` via min/max over a `period` window, smooths the
> normalised value with a 0.33 / 0.67 IIR step, and applies the
> Fisher transform with Ehlers' own output smoothing,
> `Fisher_t = 0.5 * ln((1+x)/(1-x)) + 0.5 * Fisher_{t-1}`. The result has a
> near-Gaussian distribution, so extreme readings stand out cleanly —
> much more cleanly than the raw normalised price, whose distribution
> is heavy-tailed and hard to threshold consistently.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Ehlers / Cycle (DSP)                                                 |
| Input type          | `f64`                                                                |
| Output type         | `f64`                                                                |
| Output range        | `±ln(1999) ≈ ±7.6` in the limit (clamp + feedback); typically within ±3 |
| Default parameters  | `period` is required (Ehlers' typical value `10`)                    |
| Warmup period       | `period`                                                             |
| Interpretation      | Crossover with prior bar's value = signal; beyond ±2–3 is extreme    |

## Formula

```
n_t  = 2 * (close_t - min(close, period)) / (max - min) - 1      (0 when max == min)
s_t  = clamp(0.33 * n_t + 0.67 * s_{t-1}, -0.999, +0.999)       (IIR smoothing)

Fisher_t = 0.5 * ln((1 + s_t) / (1 - s_t)) + 0.5 * Fisher_{t-1}
```

This is Ehlers' 2002 code: the `0.999` clamp avoids the singularity at
`±1`, and it is the *clamped* value that recurs as `s_{t-1}` (Ehlers
overwrites `Value1` after clamping). The 0.33 / 0.67 IIR is the classic
Ehlers smoothing step, and the `+ 0.5 * Fisher_{t-1}` term is Ehlers'
half-weight carry of the previous output (seeded with `0` on the first
emission). Because of that carry, a fully saturated input settles at
`ln((1 + 0.999) / (1 - 0.999)) = ln(1999) ≈ 7.6`, double the
single-step value. See
`crates/wickra-core/src/indicators/fisher_transform.rs`.

A lagged "trigger" line — Fisher value one bar behind — is the
canonical chart companion. Wickra exposes only the primary Fisher
value; lag manually in user code if you need the trigger.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 0`      | Rolling min/max window length. Ehlers' typical: `10`. |

`FisherTransform::new` returns `Error::PeriodZero` for `period == 0`.

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Python:
`FisherTransform(period).batch(prices)` returns an `array.array('d')`
with `NaN` for the warmup prefix. Node: same shape; `update(close)`
returns `number | null`.

## Warmup

`warmup_period() == period`. The rolling extrema window fills at
exactly `period` inputs; the first emission lands on input
`period`.

## Edge cases

- **Constant input.** `max == min` → division by zero is avoided
  by treating the normalised value as 0. With a zero history the
  output is exactly 0 (no signal) — see
  `constant_series_zero_range_yields_zero`.
- **Sudden gap.** A single outlier dramatically widens the
  min/max range and pulls the normalised value toward ±1; the Fisher
  transform amplifies this near the saturation edges — useful for
  extreme-detection.
- **Output rare-but-large excursions.** The clamp plus the
  `0.5 * Fisher_{t-1}` carry caps the output at `±ln(1999) ≈ ±7.6`.
  On a random walk with `period = 10`, `|Fisher| > 2` occurs about a
  quarter of the time and `|Fisher| > 3` about 6% of the time; a
  reading beyond ±4 is unusual.
- **Non-finite input.** `NaN` / `±inf` inputs return `None` and leave
  the state untouched (`ignores_non_finite_input`).
- **Reset.** `reset()` clears the rolling window, the smoothed
  accumulator, and the last value.

## Examples

### Rust

```rust
use wickra::{BatchExt, FisherTransform, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prices: Vec<f64> = (0..120)
        .map(|i| 100.0 + (f64::from(i) * 0.3).sin() * 5.0)
        .collect();
    let mut ft = FisherTransform::new(10)?;
    println!("row 30 = {:?}", ft.batch(&prices)[30]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

prices = 100 + np.sin(np.linspace(0, 36, 120)) * 5
ft = ta.FisherTransform(10)
out = ft.batch(prices)
print('warmup:', ft.warmup_period())  # 10
print('row 30:', out[30])
```

### Node

```javascript
const wickra = require('wickra');

const ft = new wickra.FisherTransform(10);
const prices = Array.from({ length: 120 },
  (_, i) => 100 + Math.sin(i * 0.3) * 5);
console.log('row 30:', ft.batch(prices)[30]);
```

### Streaming

```rust
use wickra::{FisherTransform, Indicator};

let mut ft = FisherTransform::new(10).unwrap();
let mut prev: Option<f64> = None;
let price_stream: Vec<f64> = Vec::new(); // your live price feed
for px in price_stream {
    if let Some(v) = ft.update(px) {
        if let Some(p) = prev {
            // Trigger-line crossover (Fisher cross of its 1-bar lag)
            if p < 0.0 && v > 0.0 { /* bullish cross */ }
            if p > 0.0 && v < 0.0 { /* bearish cross */ }
        }
        prev = Some(v);
    }
}
```

## Interpretation

- **Near-Gaussian distribution.** Unlike raw RSI or stochastic,
  Fisher's output has fat-but-not-pathological tails. Because of
  Ehlers' `0.5 * Fisher_{t-1}` carry the scale is roughly double the
  bare transform, so thresholds around ±2 / ±3 mark extremes.
- **Trigger crossover.** The classic two-line Fisher chart pairs the
  primary line against its 1-bar lag; a cross signals a momentum
  shift. Wickra omits the trigger line — bottle it yourself by
  caching the previous output.
- **Trend-state vs cycle-state.** In strong trends Fisher saturates
  at large readings and stays there for long stretches. In cycle regimes it
  oscillates rapidly with each bar — pair with a trend filter to
  pick the right interpretation.

## Common pitfalls

- **Too-short period.** `period = 3` makes Fisher track every wiggle
  — false signals dominate. Use `10` (Ehlers' default) or longer for
  daily bars.
- **Treating the output like RSI.** Fisher is unbounded and centred
  at zero, not `50`. "Overbought above 70" makes no sense here.
- **Trigger lag.** A common bug is comparing the current Fisher
  value to itself ("Fisher > 0"). The classic signal is the
  *crossover* of the value and its 1-bar-lagged trigger.

## References

- John F. Ehlers, *Using the Fisher Transform*, *Technical
  Analysis of Stocks & Commodities*, November 2002 — original.
- John F. Ehlers, *Cybernetic Analysis for Stocks and Futures*
  (2004) — extended treatment with parameter guidance.

## See also

- [InverseFisherTransform](/Indicators/Indicator-InverseFisherTransform) —
  algebraic inverse, applies the squashing wrapper instead.
- [Rsi](/Indicators/Indicator-Rsi) — the bounded oscillator Fisher is often
  layered onto.
- [LaguerreRsi](/Indicators/Indicator-LaguerreRsi) — alternative Ehlers
  momentum oscillator.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
