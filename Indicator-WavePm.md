# WavePm

> Wave PM — Cynthia Kase's peak-momentum statistic: a `0..100` reading that rises
> when momentum is large relative to its own recent energy. (Wickra
> reconstruction of Kase's variance-normalised form.)

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trend & Directional |
| Input type | `f64` (single price, usually the close) |
| Output type | `f64` |
| Output range | `[0, 100)`; `0` flat, `≈39.35` steady trend, `→100` momentum spike |
| Default parameters | `length` and `smoothing` are required (Kase's peak length is 32) |
| Warmup period (`warmup_period()`) | `2·length + smoothing − 1` |
| Interpretation | How "peaked" the move is — high = possibly exhausted, not fresh. |

## Formula

```
m      = close_t - close_{t-length}              (length-bar momentum)
energy = EMA(m^2, length)                        (mean squared momentum)
raw    = 1 - exp( -m^2 / (2 * energy) )          (0 if energy == 0)
WavePM = 100 * EMA(raw, smoothing)
```

Wave PM normalises the `length`-bar momentum `m` by its own recent variance
(`energy`). A move that merely matches its typical energy lands at the fixed
baseline `100·(1 − e^{−1/2}) ≈ 39.35`; a momentum *spike* that exceeds recent
energy drives the reading toward `100`; a flat market (`m = 0`) reads `0`. High
Wave PM therefore marks a *peaking* move — one stretched relative to its own
history — rather than the start of a trend.

> **Reconstruction note.** Kase's published WavePM is platform-specific. This is
> Wickra's faithful reconstruction of its variance-normalised peak-momentum
> form: the exact constants differ from any single vendor implementation, but the
> behaviour (zero when flat, a fixed baseline on a steady trend, saturation on an
> acceleration) matches the indicator's intent.

Source: `crates/wickra-core/src/indicators/wave_pm.rs`.

## Parameters

| Name        | Type    | Default | Valid range | Source | Description |
|-------------|---------|---------|-------------|--------|-------------|
| `length`    | `usize` | 32      | `>= 1`      | `wave_pm.rs:62` | Momentum lookback and energy-EMA period. `0` errors with `Error::PeriodZero`. |
| `smoothing` | `usize` | none    | `>= 1`      | `wave_pm.rs:62` | EMA period applied to the raw peak statistic. `0` errors. |

(Python class `wickra.WAVE_PM(length, smoothing)`; Node
`new ta.WAVE_PM(length, smoothing)`.)

## Inputs / Outputs

From `crates/wickra-core/src/indicators/wave_pm.rs`:

```rust
use wickra::{Indicator, WavePm};
// WavePm: Input = f64, Output = f64
const _: fn(&mut WavePm, f64) -> Option<f64> = <WavePm as Indicator>::update;
```

Scalar in, scalar out. Python returns `float | None` (streaming) /
`numpy.ndarray` (batch, `NaN` for warmup). Node returns `number | null` /
`Array<number>` with `NaN`.

## Warmup

`warmup_period()` returns `2·length + smoothing − 1`: the momentum needs
`length + 1` closes, the energy EMA then seeds over `length` momentum values, and
the output EMA seeds over `smoothing` raw values. Pinned by
`accessors_and_metadata` (`warmup_period() == 22` for `length = 10`,
`smoothing = 3`) and `warmup_emits_at_expected_bar`.

## Edge cases

- **Flat market.** `flat_market_reads_zero`: `m = 0` → `energy = 0` → the
  guarded branch returns `0`.
- **Steady trend baseline.** `steady_trend_reads_baseline`: on a constant-slope
  ramp the momentum equals its own energy every bar, so the reading pins exactly
  to `100·(1 − e^{−1/2}) ≈ 39.347`.
- **Acceleration.** `acceleration_reads_above_baseline`: a quadratic path keeps
  momentum outrunning its lagged energy, so the reading sits above the baseline
  while staying `<= 100`.
- **Reset.** `reset_clears_state` clears the close buffer and both EMAs.
- **Streaming/batch:** `batch_equals_streaming`.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, WavePm};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut w = WavePm::new(10, 3)?;
    // A constant-slope ramp pins Wave PM to its steady-trend baseline.
    let closes: Vec<f64> = (0..60).map(|i| f64::from(i) * 5.0).collect();
    let last = w.batch(&closes).into_iter().flatten().last().unwrap();
    println!("{last:.4}");
    Ok(())
}
```

Output:

```
39.3469
```

On a straight ramp the momentum equals its own energy each bar, so
`raw = 1 − e^{−1/2}` and Wave PM settles at `100·(1 − e^{−1/2}) ≈ 39.347`.

### Python

```python
import numpy as np
import wickra as ta

w = ta.WAVE_PM(10, 3)
closes = np.arange(60, dtype=float) * 5.0
out = w.batch(closes)        # NaN through warmup, then the steady baseline
print(round(out[-1], 4))     # 39.3469
```

Output:

```
39.3469
```

### Node

```javascript
const ta = require('wickra');
const w = new ta.WAVE_PM(10, 3);
let last = null;
for (let i = 0; i < 60; i++) last = w.update(i * 5.0);
console.log(last.toFixed(4)); // 39.3469
```

Output:

```
39.3469
```

### Streaming

```rust
use wickra::{Indicator, WavePm};

let mut w = WavePm::new(32, 3)?;
let mut last = None;
for i in 0..120 {
    last = w.update(100.0 + (f64::from(i) * 0.15).sin() * 8.0);
}
println!("{last:?}");
# Ok::<(), Box<dyn std::error::Error>>(())
```

## Interpretation

Wave PM is a peak/exhaustion gauge, not a direction signal:

1. **Baseline vs. spike.** Around `39` the move is "normal" for its own energy;
   readings climbing toward `100` mean momentum is spiking beyond its recent
   range — a stretched, potentially exhausting move.
2. **Peaks warn, they don't enter.** A high reading flags a move that may be
   topping/bottoming; pair it with a direction tool before acting.
3. **Falling from a peak.** A Wave PM rolling down from a high is the classic
   "momentum peaked" cue — momentum is reverting toward its mean energy.
4. **Near zero = no move.** Readings near `0` mark a flat, energy-less market.

## Common pitfalls

- **It has no sign.** Wave PM measures the *magnitude* of peaking, not up vs.
  down; a strong up-spike and a strong down-spike both read high.
- **Reconstruction, not vendor-exact.** The absolute level matches Wickra's
  formula above; do not expect it to tick-match another platform's WavePM — use
  the *shape* (baseline / spike / decay), not a hard threshold ported from
  elsewhere.
- **Length drives sensitivity.** A short `length` reacts to local bursts; Kase's
  `32` captures the dominant swing.

## References

Cynthia Kase, *Trading with the Odds*, 1996 — the Wave PM (Peak Momentum)
concept; this is Wickra's variance-normalised reconstruction.

## See also

- [Indicator-Ema](Indicator-Ema) — the smoothing used for the energy and output.
- [Indicator-PolarizedFractalEfficiency](Indicator-PolarizedFractalEfficiency) — a complementary trend-efficiency gauge.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
