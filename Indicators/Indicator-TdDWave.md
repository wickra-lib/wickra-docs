# TdDWave

> Tom DeMark's TD D-Wave — an objective Elliott-style wave counter that labels the
> swing sequence `1–5` (impulse) then `A–C` (correction).

## Quick reference

| Field | Value |
|-------|-------|
| Family | DeMark |
| Input type | `Candle` (high / low) |
| Output type | `f64` (wave number) |
| Output range | `[1, 8]` (6/7/8 = corrective A/B/C) |
| Default parameters | `(strength = 2)` (Python) |
| Warmup period | `2·strength + 1` (then swing-dependent) |
| Interpretation | Which wave of the impulse/correction cycle price is in. |

## Formula

```
detect alternating swing pivots with a `strength`-bar fractal
legs:  1 → 2 → 3 → 4 → 5 → A(6) → B(7) → C(8) → 1 …
output = current wave number (1.0..8.0)
```

TD D-Wave is DeMark's objective answer to discretionary Elliott Wave counting.
This streaming form detects alternating swing pivots and advances a counter
through the eight-leg cycle each time a new leg confirms, telling you which wave
price is working on. It is a **simplified** swing-leg count — it does not enforce
Elliott's ratio/overlap rules — so use it as a structural guide. Source:
`crates/wickra-core/src/indicators/td_dwave.rs`.

## Parameters

| Name       | Type    | Default      | Valid range | Source | Description |
|------------|---------|--------------|-------------|--------|-------------|
| `strength` | `usize` | `2` (Python) | `>= 1`      | `td_dwave.rs:52` | Fractal half-width for swing detection. `0` errors with `Error::PeriodZero`. |

`strength()` returns the half-width; `value` returns the current wave number if
ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/td_dwave.rs`:

```rust
use wickra::{Candle, Indicator, TdDWave};
// TdDWave: Input = Candle, Output = f64
const _: fn(&mut TdDWave, Candle) -> Option<f64> = <TdDWave as Indicator>::update;
```

A `Candle` in, an `Option<f64>` out. Python `update(candle)` / `batch(high, low)`;
Node `update(high, low)` / `batch(...)`.

## Warmup

`warmup_period() == 2·strength + 1` — minimum to confirm one pivot. Actual
readiness is **swing-dependent** (`counts_waves_on_swings` pins that a swinging
series starts counting; `flat_input_never_counts` pins that a flat series never
does).

## Edge cases

- **Counts on swings.** A zig-zag advances the wave counter
  (`counts_waves_on_swings` pins this).
- **Range.** The wave number stays in `[1, 8]` (`wave_stays_in_one_to_eight` pins
  this).
- **Flat input.** No distinct pivots → never counts (`flat_input_never_counts` pins
  this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `td.reset()` clears the window, the swing state, the counter and the
  last value (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, TdDWave};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut td = TdDWave::new(2)?;
    let candles: Vec<Candle> = (0..200)
        .map(|i| { let b = 100.0 + (f64::from(i) * 0.5).sin() * 10.0;
                   Candle::new(b, b + 1.0, b - 1.0, b, 1_000.0, 0).unwrap() })
        .collect();
    if let Some(w) = td.batch(&candles).into_iter().flatten().last() {
        println!("current wave = {w}");
    }
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

td = ta.TdDWave(2)
base = 100 + np.sin(np.arange(200) * 0.5) * 10
print(td.batch(base + 1, base - 1)[-1])  # 1..8
```

### Node

```javascript
const ta = require('wickra');

const td = new ta.TdDWave(2);
console.log('warmupPeriod:', td.warmupPeriod()); // 5 (then swing-dependent)
```

### Streaming

```rust
use wickra::{Candle, Indicator, TdDWave};

let mut td = TdDWave::new(2).unwrap();
let feed: Vec<Candle> = Vec::new(); // your live stream
for candle in feed {
    if let Some(w) = td.update(candle) {
        // w == 3.0 -> likely the strongest impulse leg
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Structure map.** Wave `3` is typically the strongest impulse leg; waves `A–C`
   warn the impulse is over and a correction is underway.
2. **Cycle awareness.** Knowing you are in wave `5` vs. wave `1` changes
   risk/reward for trend entries.
3. **Combine with momentum.** Confirm wave turns with an oscillator divergence.

## Common pitfalls

- **Simplified.** This does not validate Elliott ratios/overlaps; it is a swing-leg
  approximation, not a strict count.
- **Confirmation lag.** Legs confirm `strength` bars late.
- **Strength tuning.** Smaller `strength` counts more (noisier) legs; larger filters
  to major swings.

## References

DeMark, T. R. (1994), *The New Science of Technical Analysis*; Perl, J. (2008),
*DeMark Indicators*, Bloomberg Press (TD D-Wave chapter).

## See also

- [Indicator-ZigZag](/Indicators/Indicator-ZigZag) — the swing skeleton.
- [Indicator-TdSequential](/Indicators/Indicator-TdSequential) — the exhaustion count.
- [Indicator-WavePm](/Indicators/Indicator-WavePm) — Kase wave momentum.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
