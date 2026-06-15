# HtTrendMode

> Hilbert Transform Trend vs Cycle Mode (`HT_TRENDMODE`) — Ehlers' binary
> classification of the market as trending (`1`) or cycling (`0`).

## Quick reference

| Field | Value |
|-------|-------|
| Family | Ehlers / Cycle (DSP) |
| Input type | `f64` (single close) |
| Output type | `f64` (binary: `1.0` trend, `0.0` cycle) |
| Output range | `{0.0, 1.0}` |
| Default parameters | none (no parameters) |
| Warmup period | `50` |
| Interpretation | A regime switch: `1` = trade trend-following tools, `0` = trade mean-reversion / cycle tools. |

## Formula

`HtTrendMode` runs the adaptive Hilbert-transform engine to recover the dominant
cycle, computes the [dominant-cycle phase](/Indicators/Indicator-HtDcPhase), and derives the
in-phase sine and lead-sine of that phase along with an instantaneous trendline
(a smoothed average of price over one cycle window). It then classifies the bar:

- when the sine / lead-sine crossover logic and the trendline agree that price is
  moving directionally rather than oscillating, it reports **`1.0`** (trend);
- otherwise it reports **`0.0`** (cycle).

The phase recovery reuses the same `compute_dc_phase` unwrap as `HtDcPhase`,
including the near-zero-imaginary `±90°` guard. The output is always exactly
`0.0` or `1.0` — never `None`/`NaN` after warmup. From *Rocket Science for
Traders* (Ehlers 2001), aligned with TA-Lib's `HT_TRENDMODE`. See
`crates/wickra-core/src/indicators/ht_trendmode.rs`.

## Parameters

`HtTrendMode` takes **no parameters** — `HtTrendMode::new()` in Rust,
`wickra.HtTrendMode()` in Python, `new ta.HtTrendMode()` in Node.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/ht_trendmode.rs`:

```rust
use wickra::{Indicator, HtTrendMode};
// HtTrendMode: Input = f64, Output = f64
const _: fn(&mut HtTrendMode, f64) -> Option<f64> = <HtTrendMode as Indicator>::update;
```

Python streams as `float | None` (`1.0` / `0.0` once ready), batches as a 1-D
`numpy.ndarray` (`NaN` for warmup). Node streams as `number | null`, batches as
`Array<number>` with `NaN` placeholders.

## Warmup

`HtTrendMode::new().warmup_period() == 50`. The engine's moving-average chain must
fill before a classification is emitted. The unit test `accessors_and_metadata`
pins `warmup_period() == 50`.

## Edge cases

- **Output is strictly binary.** Every emitted value is exactly `0.0` or `1.0`.
  The unit test `emits_binary_flag_and_visits_both_modes` pins this and confirms
  both modes appear on a ramp-then-cycle series.
- **Both modes are reachable.** A trending ramp segment reports `1.0`; a clean
  cyclic segment reports `0.0`. The same test pins that both are visited.
- **Near-zero imaginary part.** The underlying phase recovery collapses to `±90°`
  when the homodyne imaginary part is ~zero. The unit test
  `near_zero_imaginary_collapses_to_signed_ninety` pins this guard.

## Examples

### Rust

```rust
use wickra::{BatchExt, HtTrendMode, Indicator};

fn main() {
    // A trending ramp followed by a clean 18-bar cycle exercises both modes.
    let mut prices: Vec<f64> = (0..150).map(|i| 100.0 + f64::from(i) * 0.8).collect();
    prices.extend((0..200).map(|i| 220.0 + (f64::from(i) * 0.45).sin() * 12.0));
    let mut ht = HtTrendMode::new();
    let out = ht.batch(&prices);
    println!("ramp segment (expect 1.0): {:?}", out[120]);
    println!("cycle segment (expect 0.0): {:?}", out[300]);
}
```

### Python

```python
import numpy as np
import wickra as ta

ramp = 100 + np.arange(150) * 0.8
cycle = 220 + np.sin(np.arange(200) * 0.45) * 12
prices = np.concatenate([ramp, cycle])
ht = ta.HT_TRENDMODE()
out = ht.batch(prices)
print('ramp (expect 1.0):', out[120])
print('cycle (expect 0.0):', out[300])
```

### Node

```javascript
const ta = require('wickra');
const ramp = Array.from({ length: 150 }, (_, i) => 100 + i * 0.8);
const cycle = Array.from({ length: 200 }, (_, i) => 220 + Math.sin(i * 0.45) * 12);
const ht = new ta.HT_TRENDMODE();
const out = ht.batch([...ramp, ...cycle]);
console.log('ramp:', out[120], 'cycle:', out[300]);
```

### Streaming

```rust
use wickra::{HtTrendMode, Indicator, Rsi, Sma};

let mut mode = HtTrendMode::new();
let price_stream: Vec<f64> = Vec::new(); // your live price feed
for px in price_stream {
    if let Some(m) = mode.update(px) {
        if m == 1.0 {
            // Trend regime: favour a trend filter such as Sma / Ema crossovers.
            let _ = Sma::new(20);
        } else {
            // Cycle regime: favour a mean-reversion oscillator such as Rsi.
            let _ = Rsi::new(14);
        }
    }
}
```

## Interpretation

`HtTrendMode` is a regime switch, not a trade signal in itself. Its value is in
*which toolset to use*: in trend mode (`1`) trend-following indicators
(moving-average crossovers, breakouts, [`SarExt`](/Indicators/Indicator-SarExt)) tend to
work, while mean-reversion oscillators give false signals; in cycle mode (`0`) the
reverse holds — oscillators like [`Rsi`](/Indicators/Indicator-Rsi) and cycle tools shine and
trend systems whipsaw. Gating your strategy on `HtTrendMode` is the canonical
Ehlers way to avoid running the wrong tool in the wrong regime.

## Common pitfalls

- **Trading the flag directly.** A flip from `0` to `1` is a regime change, not a
  buy/sell — combine it with a directional signal (e.g. the sign of a moving
  average or [`HtDcPhase`](/Indicators/Indicator-HtDcPhase)) for direction.
- **Reacting to single-bar flips.** Near a regime boundary the flag can toggle;
  consider requiring persistence (e.g. `N` consecutive bars in one mode) before
  switching toolsets.

## References

John F. Ehlers, *Rocket Science for Traders* (2001); matches TA-Lib's
`HT_TRENDMODE`.

## See also

- [Indicator-HtDcPhase](/Indicators/Indicator-HtDcPhase) — the dominant-cycle phase it is built on.
- [Indicator-HtPhasor](/Indicators/Indicator-HtPhasor) — the underlying quadrature pair.
- [Indicator-HilbertDominantCycle](/Indicators/Indicator-HilbertDominantCycle) — the dominant cycle period.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
