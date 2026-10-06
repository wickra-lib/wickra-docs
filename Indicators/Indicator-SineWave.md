# Sine Wave

> John Ehlers' Hilbert-transform-based phase visualiser (TA-Lib
> `HT_SINE`). Takes the dominant-cycle phase of
> [HtDcPhase](/Indicators/Indicator-HtDcPhase) — the smoothed price
> correlated with one cycle of the measured dominant period — and
> returns `sin(DCPhase)` and the 45° lead `sin(DCPhase + 45°)`. The
> two lines cross deep in trends but oscillate rapidly during cycles,
> providing a visual lead/lag signal.

## Quick reference

| Item                | Value                                                                  |
|---------------------|------------------------------------------------------------------------|
| Family              | Ehlers / Cycle (DSP)                                                   |
| Input type          | `f64`                                                                  |
| Output type         | `f64` — the primary `sin(phase)` line                                 |
| Output range        | `[-1, +1]`                                                             |
| Default parameters  | none — `SineWave::new()`                                               |
| Warmup period       | 50 bars (inherited from `HtDcPhase`)                                   |
| Interpretation      | `sin(phase)` for chart panel; pair with `lead` for cross signal       |

## Formula

The phase is the dominant-cycle phase of
[HtDcPhase](/Indicators/Indicator-HtDcPhase): the adaptive Hilbert engine
measures the dominant cycle `DC` (the rounded smoothed period), then the
4-bar smoothed price is correlated with one cycle of a sine and a cosine of
that period:

```
Real     = Σ_{i=0}^{DC−1} sin(360°·i / DC) · SmoothPrice[i]
Imag     = Σ_{i=0}^{DC−1} cos(360°·i / DC) · SmoothPrice[i]
DCPhase  = atan(Real / Imag)                 (degrees; ±90° if |Imag| ≤ 0.001)
DCPhase += 90° + 360° / SmoothPeriod         (offset + smoother-lag correction)
DCPhase += 180°   if Imag < 0                (quadrant fix)
DCPhase −= 360°   if DCPhase > 315°          (wrap)

Sine_t     = sin(DCPhase)
LeadSine_t = sin(DCPhase + 45°)
```

Only the primary `sine` is exposed via `update`; the 45° lead is
available via the `lead()` accessor after each update. See
`crates/wickra-core/src/indicators/sine_wave.rs`.

**TA-Lib parity.** The sine and the lead sine are identical to TA-Lib `HT_SINE`
(`sine`, `leadsine`, to `1e-9`) from bar 193 on the 3000-bar TA-Lib reference
series. Before that the two start-ups differ — TA-Lib primes its Hilbert state
with zeros after a WMA burn-in, Wickra waits for its tap buffers to fill — and
the shared recursion then converges.

## Parameters

No parameters. `SineWave::new()` returns a default-constructed
indicator; `Default` is also implemented.

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>` — returns the
`sin(phase)` value:

```rust
use wickra::{Indicator, SineWave};

let mut sw = SineWave::new();
let px = 100.0;
let sine = sw.update(px); // Option<f64>
```

Python: `SineWave().batch(prices)` returns an `array.array('d')` of the
sine line. Node and WASM return the same single sine line.

## Warmup

`warmup_period() == 50`, inherited from
[HtDcPhase](/Indicators/Indicator-HtDcPhase): the first value is emitted on
the 50th input (index 49), once the Hilbert engine's moving-average chain has
filled. Early outputs are still noisy until the period estimator settles.

## Edge cases

- **Trending input.** Phase rotates slowly; `sine` and `lead`
  closely match each other.
- **Cyclical input.** Phase rotates rapidly; `sine` and `lead` cross
  frequently, providing the canonical Ehlers cycle-state visual.
- **Lead accessor before warmup.** `lead()` returns `0.0` until the
  indicator has emitted at least one value — it is *not* `None` /
  `null`, just zero.
- **Flat input.** A constant series makes `Real` and `Imag` exactly
  zero; the phase takes its degenerate-`Imag` guard (`±90°`) and the
  sine is still defined (`flat_input_uses_phase_fallback` test).
- **Non-finite input.** `NaN` / `±inf` returns `None` without
  touching state (`ignores_non_finite_input` test).
- **Reset.** `reset()` clears the inner `HtDcPhase` estimator (its
  smoothing buffers and period memory), the sine and the lead value.

## Examples

### Rust

```rust
use wickra::{Indicator, SineWave};

fn main() {
    let prices: Vec<f64> = (0..200)
        .map(|i| 100.0 + (f64::from(i) * 0.4).sin() * 5.0)
        .collect();
    let mut sw = SineWave::new();
    for &p in &prices {
        if let Some(s) = sw.update(p) {
            let l = sw.lead();
            // s, l in [-1, +1]; cross detects momentum shift in cycle regime
        }
    }
}
```

### Python

```python
import numpy as np
import wickra as ta

t = np.arange(200)
prices = 100 + np.sin(t * 0.4) * 5
sw = ta.SineWave()
out = sw.batch(prices)
print('row 100:', out[100])   # row 100: 0.7812038618938434
```

### Node

```javascript
const wickra = require('wickra');
const sw = new wickra.SineWave();
const prices = Array.from({ length: 200 }, (_, i) => 100 + Math.sin(i * 0.4) * 5);
console.log('row 100:', sw.batch(prices)[100]);
```

### Streaming with lead access

```rust
use wickra::{Indicator, SineWave};

let mut sw = SineWave::new();
let mut prev_diff: Option<f64> = None;
let price_stream: Vec<f64> = Vec::new(); // your live price feed
for px in price_stream {
    if let Some(s) = sw.update(px) {
        let l = sw.lead();
        let diff = l - s;
        if let Some(p) = prev_diff {
            if p < 0.0 && diff > 0.0 { /* lead crossed above sine — bullish */ }
            if p > 0.0 && diff < 0.0 { /* lead crossed below sine — bearish */ }
        }
        prev_diff = Some(diff);
    }
}
```

## Interpretation

- **Cycle vs trend regime.** When `sine` and `lead` track close to
  each other, the market is trending; when they oscillate independently
  and cross frequently, the market is in a cycle.
- **Cross direction.** `lead` crossing above `sine` is a bullish
  cycle-momentum signal (the cycle is bottoming); `lead` below
  `sine` is bearish.
- **Saturation.** When both lines saturate near ±1 for an extended
  period, the market is in a strong trend and cycle-based signals
  shouldn't be used.

## Common pitfalls

- **Trading the primary sine alone.** The point of the indicator is
  the `sine`/`lead` *pair*. `batch` only emits `sine` — for cross
  signals use streaming `update` + `lead()` (available in Rust, Python,
  Node and WASM).
- **Treating it like an oscillator.** This is a *phase-state
  visualiser*, not an overbought/oversold tool. ±0.8 is not
  "extreme" — it's just where the phase is right now.
- **Warmup expectations.** The first value arrives on bar 50, but
  early outputs are noisy while the dominant-period estimate settles;
  allow extra bars before treating signals as actionable.

## References

- John F. Ehlers, *Rocket Science for Traders* (2001), ch. 9 —
  original Sine Wave indicator.
- John F. Ehlers, *Cybernetic Analysis for Stocks and Futures*
  (2004) — refinements and practical usage.
- TA-Lib `HT_SINE` — reference implementation the phase follows.

## See also

- [HtDcPhase](/Indicators/Indicator-HtDcPhase) — phase source (`HT_DCPHASE`).
- [HilbertDominantCycle](/Indicators/Indicator-HilbertDominantCycle) —
  dominant-period engine.
- [Mama](/Indicators/Indicator-Mama) — Hilbert-transform phase used for
  adaptive smoothing.
- [FisherTransform](/Indicators/Indicator-FisherTransform) — different
  visualisation of cycle state.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
