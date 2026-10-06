# MAMA (MESA Adaptive Moving Average)

> John Ehlers' MESA Adaptive Moving Average. MAMA adapts its
> smoothing constant from the rate-of-change of price phase — derived
> via a truncated Hilbert transform — so it follows price tightly in
> trends and pulls away during cycles. Emitted with its companion
> follower FAMA, half as fast, for crossover signals.

## Quick reference

| Item                | Value                                                                  |
|---------------------|------------------------------------------------------------------------|
| Family              | Ehlers / Cycle (DSP)                                                   |
| Input type          | `f64`                                                                  |
| Output type         | `MamaOutput { mama, fama }`                                            |
| Output range        | unbounded (price-units)                                                |
| Default parameters  | `fast_limit = 0.5`, `slow_limit = 0.05` (`Mama::classic()`)            |
| Warmup period       | `33` bars (Hilbert chain fills then alpha adaptation begins)           |
| Interpretation      | MAMA crosses above FAMA = bull trend confirmation; below = bear        |

## Formula

The two-parameter `(fast_limit, slow_limit)` defines the range over
which the adaptive smoothing constant can vary:

```
1. smooth(x) = WMA-4(x)                        (4-bar weighted MA)
2. detrender = HT(smooth)                      (taps t, t-2, t-4, t-6 all on the smoothed history)
3. i1, q1    = in-phase and quadrature
4. period_t  = derived from phase rate of change (smoothed and clamped)
5. delta_phase = phase_{t-1} - phase_t          (degrees; if delta_phase < 1 then delta_phase = 1)
6. alpha_t   = clamp(fast_limit / delta_phase, slow_limit, fast_limit)

MAMA_t = alpha_t * x_t + (1 - alpha_t) * MAMA_{t-1}
FAMA_t = 0.5 * alpha_t * MAMA_t + (1 - 0.5 * alpha_t) * FAMA_{t-1}
```

The phase is measured in degrees and `delta_phase` is floored at `1`
(degree), as in Ehlers' EasyLanguage — so `fast_limit / delta_phase`
never exceeds `fast_limit` and only the `slow_limit` bound can bind.

FAMA uses half MAMA's adaptive alpha, so it lags MAMA — crossovers
signal trend reversals. Full math derivations in Ehlers'
*Cycle Analytics for Traders* (2013, ch. 8) and the original 2001
MESA paper. See `crates/wickra-core/src/indicators/mama.rs`.

**TA-Lib parity.** With `(0.5, 0.05)` MAMA is identical to TA-Lib `MAMA` (to
`1e-9`) from bar 152 and FAMA from bar 316 on the 3000-bar TA-Lib reference
series. Before that the two start-ups differ — TA-Lib primes its Hilbert state
with zeros after a WMA burn-in, Wickra waits for its tap buffers to fill — and
the shared recursion then converges. FAMA, smoothed with half of MAMA's alpha,
forgets the start-up more slowly.

## Parameters

| Name         | Type  | Default | Constraint                    | Description |
|--------------|-------|---------|-------------------------------|-------------|
| `fast_limit` | `f64` | `0.5`   | finite, `0 < slow < fast ≤ 1` | Upper bound on the adaptive alpha. |
| `slow_limit` | `f64` | `0.05`  | finite, `0 < slow < fast`     | Lower bound on the adaptive alpha. |

`Mama::new` returns `Error::InvalidPeriod` for non-finite limits, or
when the `0 < slow_limit < fast_limit ≤ 1` ordering is violated.
`Mama::classic()` returns the canonical EasyLanguage defaults.

## Inputs / Outputs

`Indicator<Input = f64, Output = MamaOutput>` with fields:

| Field  | Description |
|--------|-------------|
| `mama` | MESA Adaptive Moving Average (fast line). |
| `fama` | Following Adaptive Moving Average (slow line, half-alpha companion). |

- **Python.** `MAMA.batch(prices)` returns `(n, 2)` `float64` with
  columns `[mama, fama]`; warmup rows entirely `NaN`.
- **Node.** Returns a flat `number[]` of length `n * 2`
  interleaved; streaming `update(value)` returns `{ mama, fama } |
  null`.

## Warmup

The Hilbert-transform chain needs the smoothing buffers and
detrender history to fill before phase can be measured.
`warmup_period() == 33`: the first `MamaOutput` is emitted on the
33rd input (index `32`). See `Indicator-HilbertDominantCycle` for the underlying
phase-extraction warmup.

## Edge cases

- **Constant input.** The in-phase component is zero, so the phase
  holds its previous value; `delta_phase` clamps to the floor of `1`
  and alpha sits at `fast_limit`. MAMA and FAMA both converge to the
  constant.
- **Sharp trend reversal.** The phase stalls, `delta_phase` drops to
  the floor of `1`, alpha pushes up to `fast_limit`, both lines react
  quickly — the regime change is
  often visible as a sharp MAMA / FAMA convergence followed by a
  cross.
- **Limit ordering enforced.** Constructor rejects swapped
  `fast_limit < slow_limit`.
- **Reset.** `reset()` clears all internal buffers and the previous
  outputs.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, Mama};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prices: Vec<f64> = (0..200)
        .map(|i| 100.0 + (f64::from(i) * 0.2).sin() * 5.0 + f64::from(i) * 0.05)
        .collect();
    let mut m = Mama::classic();
    let out = m.batch(&prices);
    if let Some(v) = out[100] {
        println!("row 100  MAMA={:.4}  FAMA={:.4}", v.mama, v.fama);
    }
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

prices = 100 + np.sin(np.linspace(0, 30, 200)) * 5 + np.arange(200) * 0.05
m = ta.MAMA(0.5, 0.05)
out = m.batch(prices)
print('shape :', out.shape)    # (200, 2)
print('row 100:', out[100])    # [mama, fama]
```

### Node

```javascript
const wickra = require('wickra');

const m = new wickra.MAMA(0.5, 0.05);
const prices = Array.from({ length: 200 },
  (_, i) => 100 + Math.sin(i * 0.2) * 5 + i * 0.05);
const flat = m.batch(prices);
console.log('row 100 mama:', flat[100 * 2]);
console.log('row 100 fama:', flat[100 * 2 + 1]);
```

### Streaming

```rust
use wickra::{Indicator, Mama};

let mut m = Mama::classic();
let mut prev: Option<wickra::MamaOutput> = None;
let price_stream: Vec<f64> = Vec::new(); // your live price feed
for px in price_stream {
    if let Some(v) = m.update(px) {
        if let Some(p) = prev {
            let bull_cross = p.mama <= p.fama && v.mama > v.fama;
            let bear_cross = p.mama >= p.fama && v.mama < v.fama;
            if bull_cross { /* enter long */ }
            if bear_cross { /* enter short / exit long */ }
        }
        prev = Some(v);
    }
}
```

## Interpretation

- **MAMA / FAMA crossover.** The canonical signal — MAMA crossing
  above FAMA is bullish; below is bearish. Because both lines adapt,
  the signal arrives faster in trending periods and slower in
  cyclical periods (when both lines bounce around each other and
  whips would be expensive).
- **MAMA slope.** A flat MAMA (alpha collapsed to `slow_limit`)
  signals a no-trend regime; a steeply-sloped MAMA signals an
  active trend with the adaptation maxed at `fast_limit`.
- **Vs EMA / DEMA / KAMA.** All three are non-adaptive (EMA, DEMA)
  or simpler-adaptive (KAMA uses an efficiency ratio). MAMA's phase-
  based adaptation reacts faster to genuine regime changes and is
  more robust to short-lived noise spikes.

## Common pitfalls

- **Tuning limits in the wrong direction.** `fast_limit = 0.05`,
  `slow_limit = 0.5` is rejected; `fast > slow` is required.
- **Warmup expectations.** The Hilbert chain takes ~30 bars to
  stabilise. Backtests under 100 bars are dominated by initial
  transients.
- **Treating MAMA as a simple smoother.** It's a *phase-derived
  adaptive* smoother — its lag is highly variable. Crossover-based
  systems work; slope-based systems are less reliable.

## References

- John F. Ehlers, *MESA and Trading Market Cycles*, Wiley (2001) —
  original presentation.
- John F. Ehlers, *Cycle Analytics for Traders*, Wiley (2013), ch. 8.

## See also

- [Fama](/Indicators/Indicator-Fama) — scalar wrapper exposing only the slow
  FAMA line.
- [HilbertDominantCycle](/Indicators/Indicator-HilbertDominantCycle) — the
  phase-extraction core MAMA builds on.
- [Kama](/Indicators/Indicator-Kama) — simpler adaptive MA built on the
  efficiency ratio.
- [SuperSmoother](/Indicators/Indicator-SuperSmoother) — non-adaptive Ehlers
  smoother.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
