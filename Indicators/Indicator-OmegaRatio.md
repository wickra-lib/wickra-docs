# Omega Ratio

> Gain-to-loss ratio above / below a threshold. Sum of returns
> *above* the threshold divided by sum of magnitudes *below*. Unlike
> Sharpe (which collapses risk to a single second-moment number),
> Omega keeps the full shape of the loss tail — making it the
> partial-moment-aware risk metric.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Risk / Performance                                                   |
| Input type          | `f64` — one period return per update                                 |
| Output type         | `f64`                                                                |
| Output range        | `[0, ∞)` (Inf for all-positive windows)                              |
| Default parameters  | `period`, `threshold` both required                                  |
| Warmup period       | `period`                                                             |
| Interpretation      | `> 1` profitable above threshold; `> 2` strong                       |

## Formula

```
gains  = Σ max(0, r - threshold) over window
losses = Σ max(0, threshold - r) over window
Omega  = gains / losses
```

`Omega ≥ 0` always. A window where every return clears the
threshold has zero losses and the indicator returns `f64::INFINITY`
— in keeping with the standard definition. See
`crates/wickra-core/src/indicators/omega_ratio.rs`.

## Parameters

| Name        | Type    | Default | Constraint | Description |
|-------------|---------|---------|------------|-------------|
| `period`    | `usize` | none    | `> 0`      | Rolling window. |
| `threshold` | `f64`   | none    | finite     | Return threshold (`0.0` for ratio of positive to negative). |

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Python / Node: 1-D output
with `NaN` warmup.

## Warmup

`warmup_period() == period`.

## Edge cases

- **All-positive window.** `losses == 0`; output is
  `f64::INFINITY`.
- **All-negative window.** `gains == 0`; output is `0.0`.
- **Threshold = 0.** Classic "gain/loss ratio" — sum of positive
  returns over sum of negative returns (magnitudes).
- **Reset.** Clears the rolling window.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, OmegaRatio};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let returns: Vec<f64> = (0..100)
        .map(|i| (f64::from(i) * 0.2).sin() * 0.01)
        .collect();
    let mut o = OmegaRatio::new(20, 0.0)?;
    println!("row 50 = {:?}", o.batch(&returns)[50]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

returns = np.sin(np.linspace(0, 20, 100)) * 0.01
o = ta.OmegaRatio(20, 0.0)
print('row 50:', o.batch(returns)[50])
```

### Node

```javascript
const wickra = require('wickra');
const o = new wickra.OmegaRatio(20, 0.0);
const returns = Array.from({ length: 100 }, (_, i) => Math.sin(i * 0.2) * 0.01);
console.log('row 50:', o.batch(returns)[50]);
```

### Streaming

```rust
use wickra::{Indicator, OmegaRatio};

let mut o = OmegaRatio::new(252, 0.0).unwrap();
let return_stream: Vec<f64> = Vec::new(); // your stream of periodic returns
for daily_return in return_stream {
    if let Some(v) = o.update(daily_return) {
        // Omega > 1 = profitable above threshold
    }
}
```

## Interpretation

- **Omega > 1.** Total gains above threshold exceed total losses
  below it.
- **Omega > 2.** Strong — 2x more above-threshold return than
  below.
- **Threshold = 0** is the simplest case ("more profit than
  loss"). Higher thresholds (e.g. the per-period risk-free rate)
  give a more conservative measure.

## Common pitfalls

- **Infinite output.** Code that consumes the indicator must
  handle `f64::INFINITY`. Either skip those bars or cap the
  display value.
- **Threshold dependence.** Two strategies can rank differently
  at different thresholds — Omega is *not* a single-number
  metric like Sharpe.
- **Vs Sortino.** Omega includes the *shape* of upside; Sortino
  collapses to a single ratio. Omega is more informative but less
  comparable across strategies.

## References

- Keating & Shadwick, *A Universal Performance Measure*, *Journal
  of Performance Measurement*, 2002 — original Omega definition.

## See also

- [SortinoRatio](/Indicators/Indicator-SortinoRatio) — downside-deviation
  alternative.
- [GainLossRatio](/Indicators/Indicator-GainLossRatio) — average-based cousin.
- [ProfitFactor](/Indicators/Indicator-ProfitFactor) — closely related
  gross-sum ratio.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
