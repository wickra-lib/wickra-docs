# Decycler Oscillator

> Difference between a fast and a slow [Decycler](Indicator-Decycler).
> Removes the trend component that both decyclers share, leaving the
> medium-frequency cycle band — analogous in spirit to MACD but with
> Ehlers' zero-lag high-pass filters instead of EMAs. Crosses zero
> at trend changes.

## Quick reference

| Item                | Value                                                                  |
|---------------------|------------------------------------------------------------------------|
| Family              | Ehlers / Cycle (DSP)                                                   |
| Input type          | `f64`                                                                  |
| Output type         | `f64`                                                                  |
| Output range        | unbounded; centred near zero                                           |
| Default parameters  | `fast`, `slow` both required (typical `(10, 30)`)                      |
| Warmup period       | `2` (uses input directly until both decyclers fill)                    |
| Interpretation      | `> 0` cycle-band above trend; `< 0` below; zero-cross signals shift    |

## Formula

```
fast_dc_t = Decycler(fast).update(x_t)
slow_dc_t = Decycler(slow).update(x_t)

DecyclerOsc_t = fast_dc_t - slow_dc_t
```

`fast < slow` is required. See
`crates/wickra-core/src/indicators/decycler_oscillator.rs`.

## Parameters

| Name   | Type    | Default | Constraint        | Description |
|--------|---------|---------|-------------------|-------------|
| `fast` | `usize` | none    | `> 1`, `< slow`   | Fast Decycler critical period. |
| `slow` | `usize` | none    | `> 1`, `> fast`   | Slow Decycler critical period. |

`DecyclerOscillator::new` returns `Error::PeriodZero` if either
period is zero, and `Error::InvalidPeriod { message: "fast period
must be strictly less than slow period" }` if `fast >= slow`.

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Python:
`DecyclerOscillator(fast, slow).batch(prices)` returns a 1-D
`np.ndarray`. Node: same shape; `update(value)` returns `number`.

## Warmup

`warmup_period() == 2`. Both inner Decyclers use the pass-through-
input initial condition for the first 2 bars; from bar 3 the
recursions run.

## Edge cases

- **Constant input.** Both Decyclers converge to the constant;
  difference converges to zero.
- **Zero crossings.** Treat as cycle-momentum direction changes,
  not as buy/sell signals on their own.
- **Reset.** `reset()` clears both inner decyclers.

## Examples

### Rust

```rust
use wickra::{BatchExt, DecyclerOscillator, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prices: Vec<f64> = (0..120)
        .map(|i| 100.0 + (f64::from(i) * 0.3).sin() * 5.0)
        .collect();
    let mut dco = DecyclerOscillator::new(10, 30)?;
    println!("row 50 = {:?}", dco.batch(&prices)[50]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

prices = 100 + np.sin(np.linspace(0, 36, 120)) * 5
dco = ta.DecyclerOscillator(10, 30)
print('row 50:', dco.batch(prices)[50])
```

### Node

```javascript
const wickra = require('wickra');
const dco = new wickra.DecyclerOscillator(10, 30);
const prices = Array.from({ length: 120 },
  (_, i) => 100 + Math.sin(i * 0.3) * 5);
console.log('row 50:', dco.batch(prices)[50]);
```

### Streaming

```rust
use wickra::{DecyclerOscillator, Indicator};

let mut dco = DecyclerOscillator::new(10, 30).unwrap();
let mut prev: Option<f64> = None;
let price_stream: Vec<f64> = Vec::new(); // your live price feed
for px in price_stream {
    if let Some(v) = dco.update(px) {
        if let Some(p) = prev {
            if p < 0.0 && v > 0.0 { /* bullish zero cross */ }
            if p > 0.0 && v < 0.0 { /* bearish zero cross */ }
        }
        prev = Some(v);
    }
}
```

## Interpretation

- **Cycle-band oscillator.** Captures the price action between the
  fast and slow cycle cutoffs. Default `(10, 30)` covers the
  10-30 bar cycle band — Ehlers' typical "tradable cycle" range.
- **Zero-cross signals.** Use as a momentum-shift trigger similar
  to MACD's signal-line crossings, with the benefit of zero phase
  lag at trend frequencies.
- **Vs MACD.** Decycler oscillator has flatter response in the
  trend regime (because the trend cancels out) and sharper
  detection of mid-frequency cycle changes. MACD-style EMAs lag
  the trend; Ehlers' high-passes don't.

## Common pitfalls

- **Swapped periods.** `fast >= slow` is rejected. The constructor
  errors clearly, but it's a common bug when reading parameters
  from config files.
- **Treating it as bounded.** Output is unbounded; thresholds
  (`±0.5`, `±1.0`) are arbitrary and instrument-dependent.
- **Mismatched fast/slow spacing.** `(10, 12)` gives a very narrow
  band — output is mostly noise. Use at least a 2:1 ratio
  (`(10, 20)` or `(10, 30)`).

## References

- John F. Ehlers, *Cycle Analytics for Traders*, Wiley (2013),
  ch. 4 — Decycler difference construction.

## See also

- [Decycler](Indicator-Decycler) — the building block.
- [RoofingFilter](Indicator-RoofingFilter) — alternative cycle-band
  extractor.
- [MacdIndicator](Indicator-MacdIndicator) — EMA-based cousin.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
