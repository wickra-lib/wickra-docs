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
in-phase sine and lead-sine of that phase along with an instantaneous trendline.
The trendline averages the **raw input price** (not the WMA-smoothed price) over
the last `round(smooth_period)` bars — one dominant-cycle window, as TA-Lib does —
and then applies a 4-3-2-1 weighted smoothing to that running average. It then
classifies the bar:

- when the sine / lead-sine crossover logic and the trendline agree that price is
  moving directionally rather than oscillating, it reports **`1.0`** (trend);
- otherwise it reports **`0.0`** (cycle).

The phase recovery reuses the same `compute_dc_phase` unwrap as `HtDcPhase`,
including the near-zero-imaginary `±90°` guard. The output is always exactly
`0.0` or `1.0` — never `None`/`NaN` after warmup. From *Rocket Science for
Traders* (Ehlers 2001), aligned with TA-Lib's `HT_TRENDMODE`. See
`crates/wickra-core/src/indicators/ht_trendmode.rs`.

**TA-Lib parity.** `HtTrendMode` matches TA-Lib `HT_TRENDMODE` exactly from bar
75 on (on the 3000-bar TA-Lib reference series). Before that the two start-ups
differ: TA-Lib primes its Hilbert state with zeros after a WMA burn-in, Wickra
waits for its tap buffers to fill; the recursion then converges.

## Parameters

`HtTrendMode` takes **no parameters** — `HtTrendMode::new()` in Rust,
`wickra.HT_TRENDMODE()` in Python, `new ta.HT_TRENDMODE()` in Node.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/ht_trendmode.rs`:

```rust
use wickra::{Indicator, HtTrendMode};
// HtTrendMode: Input = f64, Output = f64
const _: fn(&mut HtTrendMode, f64) -> Option<f64> = <HtTrendMode as Indicator>::update;
```

Python streams as `float | None` (`1.0` / `0.0` once ready), batches as a 1-D
`array.array('d')` (`NaN` for warmup). Node streams as `number | null`, batches as
`Array<number>` with `NaN` placeholders.

## Warmup

`HtTrendMode::new().warmup_period() == 50`. The engine's moving-average chain must
fill before a classification is emitted. The unit test `accessors_and_metadata`
pins `warmup_period() == 50`.

## Edge cases

- **Output is strictly binary.** Every emitted value is exactly `0.0` or `1.0`.
  The unit test `emits_binary_flag_and_visits_both_modes` pins this and confirms
  both modes appear on a ramp-then-cycle series.
- **Both modes are reachable.** A steady ramp reports `1.0`; a clean
  small-amplitude cycle reports `0.0`. With a large swing relative to the
  price level the `|smooth − trendline| / trendline ≥ 1.5%` rule forces trend
  mode on the cycle's steep legs, so `0.0` only shows up in short runs near the
  sine / lead-sine crossings. The unit tests
  `emits_binary_flag_and_visits_both_modes` and
  `steady_ramp_reports_trend_and_clean_cycle_reports_cycle` pin this.
- **Near-zero imaginary part.** The underlying phase recovery collapses to `±90°`
  when the homodyne imaginary part is ~zero. The unit test
  `near_zero_imaginary_collapses_to_signed_ninety` pins this guard.

## Examples

The series is 150 bars of a pure 20-bar sine cycle (amplitude `1` around
`100`) followed by 150 bars of a steady ramp (`+0.5` per bar). The first value
is emitted at index `49`; the summary counts how many bars of each leg read
`1` (trend).

### Rust

```rust
use std::f64::consts::PI;
use wickra::{BatchExt, HtTrendMode};

fn main() {
    let mut prices: Vec<f64> = (0..150)
        .map(|i| 100.0 + (2.0 * PI * f64::from(i) / 20.0).sin())
        .collect();
    prices.extend((0..150).map(|i| 100.0 + 0.5 * f64::from(i + 1)));
    let out = HtTrendMode::new().batch(&prices);
    let ones = |a: usize, b: usize| out[a..b].iter().filter(|v| **v == Some(1.0)).count();
    println!("cycle leg: {}/101 bars read 1", ones(49, 150));
    println!("trend leg: {}/150 bars read 1", ones(150, 300));
    let first = out.iter().position(|v| *v == Some(1.0)).unwrap();
    println!("first trend bar: {first}");
}
```

Output:

```
cycle leg: 0/101 bars read 1
trend leg: 146/150 bars read 1
first trend bar: 154
```

The whole cycle leg reads `0` (cycle mode). Four bars into the ramp the
classifier switches, and from bar `154` on every bar reads `1` (trend mode).

### Python

```python
import numpy as np
import wickra as ta

i = np.arange(150)
prices = np.concatenate([100 + np.sin(2 * np.pi * i / 20), 100 + 0.5 * (i + 1)])
out = np.asarray(ta.HT_TRENDMODE().batch(prices))
print('cycle leg:', int((out[49:150] == 1).sum()), '/ 101 bars read 1')
print('trend leg:', int((out[150:] == 1).sum()), '/ 150 bars read 1')
print('first trend bar:', int(np.argmax(out == 1)))
```

Output:

```
cycle leg: 0 / 101 bars read 1
trend leg: 146 / 150 bars read 1
first trend bar: 154
```

### Node

```javascript
const ta = require('wickra');
const cycle = Array.from({ length: 150 }, (_, i) => 100 + Math.sin(2 * Math.PI * i / 20));
const ramp = Array.from({ length: 150 }, (_, i) => 100 + 0.5 * (i + 1));
const out = new ta.HT_TRENDMODE().batch([...cycle, ...ramp]);
const ones = (a, b) => out.slice(a, b).filter((v) => v === 1).length;
console.log(`cycle leg: ${ones(49, 150)}/101 bars read 1`);
console.log(`trend leg: ${ones(150, 300)}/150 bars read 1`);
console.log('first trend bar:', out.indexOf(1));
```

Output:

```
cycle leg: 0/101 bars read 1
trend leg: 146/150 bars read 1
first trend bar: 154
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
