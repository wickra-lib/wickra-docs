# Laguerre RSI

> John Ehlers' four-stage Laguerre polynomial filter wrapped in an
> RSI-style up/down accumulator. The single tuning parameter `gamma`
> in `[0, 1]` trades lag for smoothness: small `gamma` is fast and
> noisy, large `gamma` is slow and smooth. Ehlers' recommended value
> is `0.5`. Designed as a fast-responding, smooth-output replacement
> for short-period RSI on short-timeframe systems where RSI(2) /
> RSI(3) are too jittery.

## Quick reference

| Item                | Value                                                                                |
|---------------------|--------------------------------------------------------------------------------------|
| Family              | Momentum Oscillators                                                                  |
| Input type          | `f64` (close)                                                                        |
| Output type         | `f64`                                                                                |
| Output range        | `[0, 100]` (algebraically; floating-point clamp enforces strict bound)              |
| Default parameters  | `gamma = 0.5` (`LaguerreRsi::classic()`)                                             |
| Warmup period       | `1` — emits a neutral `50.0` on the first input                                       |
| Interpretation      | `> 80` overbought; `< 20` oversold; `50` neutral / no-trend                          |

## Formula

The four-stage Laguerre polynomial filter:

```
alpha = 1 − gamma

L0_t  = alpha · price_t + gamma · L0_{t-1}
L1_t  = −gamma · L0_t   + L0_{t-1} + gamma · L1_{t-1}
L2_t  = −gamma · L1_t   + L1_{t-1} + gamma · L2_{t-1}
L3_t  = −gamma · L2_t   + L2_{t-1} + gamma · L3_{t-1}
```

The RSI-style accumulator runs over the three adjacent pairs:

```
cu, cd = 0
for (upper, lower) in [(L0, L1), (L1, L2), (L2, L3)]:
    if upper >= lower:  cu += upper − lower
    else             :  cd += lower − upper

LRSI = 100 · cu / (cu + cd)         if cu + cd > 0
     = 50                            otherwise (constant series)
```

The result is bounded in `[0, 100]`; floating-point rounding may
push the raw quotient a hair above `1.0`, so the implementation
clamps to `[0, 100]`
(`crates/wickra-core/src/indicators/laguerre_rsi.rs:128-137`).

## Parameters

| Name    | Type  | Default | Constraint        | Description |
|---------|-------|---------|-------------------|-------------|
| `gamma` | `f64` | `0.5`   | finite, `[0, 1]`  | Laguerre damping factor. `0` = no smoothing, `1` = infinite memory. |

`LaguerreRsi::new` returns `Error::InvalidPeriod { message:
"LaguerreRSI gamma must be a finite value in [0, 1]" }` for any value
outside `[0, 1]` or non-finite (NaN / ±∞). `LaguerreRsi::classic()`
returns the `gamma = 0.5` factory (`laguerre_rsi.rs:76-79`).

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Python: `LaguerreRSI(gamma).batch(prices)`
returns a 1-D `np.ndarray` (no `NaN` warmup prefix beyond bar 0 — the
indicator seeds on the first input). Node: `LaguerreRSI(gamma).batch(prices)`
returns `Array<number>`; `update(value)` returns `number | null`
(`null` only for non-finite input on bar 0).

## Warmup

`warmup_period() == 1`. The first input seeds all four polynomial
stages to that value and the indicator emits a neutral `50.0`. From
bar 2 onward the polynomial recursion has memory and the output
reflects price action. Pinned by `accessors_and_metadata`
(`laguerre_rsi.rs:187-192`).

## Edge cases

- **Constant input.** All four `L_i` seed to the constant and stay
  equal on subsequent flat inputs; `cu = cd = 0` → mid-band `50.0`.
  Pinned by `constant_series_stays_at_mid_band`.
- **Non-finite input.** `NaN` / `±∞` are dropped — the indicator
  returns its previous value (or `None` if it has not yet emitted).
  Pinned by `ignores_non_finite_input`.
- **`gamma = 0`.** `alpha = 1`, so `L0` mirrors input exactly. The
  polynomial chain still produces a bounded reading on subsequent
  bars; pinned by `gamma_zero_passes_through_l0`.
- **`gamma = 1`.** `alpha = 0`, so `L0` never updates from its seed
  value. The output stays at 50 forever — this is a degenerate but
  algebraically valid case.
- **Output bounded `[0, 100]`.** Strictly enforced by the clamp;
  pinned by `output_is_bounded` on a 200-bar sine wave.
- **Trend saturation.** A monotonic uptrend drives the output above
  80 within a few dozen bars (`pure_uptrend_saturates_high`);
  symmetric for downtrends (`pure_downtrend_saturates_low`).
- **Reset.** `reset()` clears all four `L_i` to 0 and unseats the
  `seeded` flag; the next `update` reseeds.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, LaguerreRsi};

fn main() {
    let prices: Vec<f64> = (1..=120)
        .map(|i| 100.0 + (f64::from(i) * 0.2).sin() * 5.0)
        .collect();
    let mut lrsi = LaguerreRsi::classic();
    let out = lrsi.batch(&prices);
    println!("row 60 LRSI = {:.4}", out[60].unwrap());
}
```

### Python

```python
import numpy as np
import wickra as ta

prices = 100 + np.sin(np.linspace(0, 30, 200)) * 5
lrsi = ta.LaguerreRSI(0.5)
out = lrsi.batch(prices)
print('warmup:', lrsi.warmup_period())   # 1
print('row 0  :', out[0])                # 50.0 (mid-band seed)
print('row 100:', out[100])
```

### Node

```javascript
const wickra = require('wickra');

const lrsi = new wickra.LaguerreRSI(0.5);
const prices = Array.from({ length: 200 },
  (_, i) => 100 + Math.sin(i * 0.15) * 5);
const out = lrsi.batch(prices);
console.log('row 0   (seed):', out[0]);   // 50
console.log('row 100      :', out[100]);
```

### Streaming

```rust
use wickra::{Indicator, LaguerreRsi};

let mut lrsi = LaguerreRsi::classic();
for px in price_stream {
    let v = lrsi.update(px).unwrap(); // never None after seed
    if v < 20.0 { /* oversold */ }
    if v > 80.0 { /* overbought */ }
}
```

## Interpretation

LRSI is a **fast, smooth RSI alternative**:

- **LRSI > 80.** Overbought. Compared to RSI, LRSI hangs near the
  extremes longer in strong trends — it does not whip back on every
  pullback the way RSI(2) does.
- **LRSI < 20.** Oversold.
- **Crosses of 50.** Trend-direction flips. With `gamma = 0.5`
  these tend to lag price by ~3-5 bars on typical equity tape —
  faster than RSI(14), slower than RSI(2).

**Choosing `gamma`:**

| `gamma` | Behaviour |
|---------|-----------|
| `0.1`   | Almost no smoothing; output is jittery, like RSI(2). |
| `0.5`   | Ehlers' default — good balance. |
| `0.8`   | Heavy smoothing; output crawls, similar to RSI(14). |
| `0.95`+ | Near-degenerate; output barely moves. |

Treat `gamma` as a continuous knob between "RSI(2)" and "RSI(20)"
flavour, not as a period in bars.

## Common pitfalls

- **`gamma` is not a period.** Passing `14` will fail validation
  (`gamma > 1.0`). The Laguerre filter has no period — `gamma` is a
  damping coefficient.
- **First-bar 50.** The first emission is always `50.0` regardless
  of input, because the recursion is seeded with that input.
  Downstream code that treats `50.0` as a tradeable mid-band crossing
  will fire on bar 1 of every backtest.
- **Saturation hysteresis.** LRSI saturates near 100 or 0 in strong
  trends. Pulling the threshold tighter (`< 30` instead of `< 20`)
  is a common mistake because there's no signal density gain — the
  indicator just spends more time outside the band without producing
  more trade signals.

## References

- John F. Ehlers, *Time Warp — Without Space Travel*, *Technical
  Analysis of Stocks & Commodities*, July 2002 — original
  publication of the Laguerre polynomial filter and the RSI
  wrapper.
- John F. Ehlers, *Cybernetic Analysis for Stocks and Futures*
  (2004) — extended treatment with parameter-tuning guidance.

## See also

- [Rsi](Indicator-Rsi) — the classical RSI baseline.
- [ConnorsRsi](Indicator-ConnorsRsi) — a different short-period RSI
  refinement.
- [FisherTransform](Indicator-FisherTransform) — another Ehlers
  oscillator with stronger extreme-value behaviour.
- [InverseFisherTransform](Indicator-InverseFisherTransform) —
  often layered on top of LRSI to sharpen the extremes.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
