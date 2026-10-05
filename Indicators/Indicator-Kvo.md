# Klinger Volume Oscillator (KVO)

> Stephen Klinger's long / short-term volume-force MACD with
> trend-aware cumulative-money-flow weighting. Each bar produces a
> "volume force" whose sign tracks the daily trend (from `H + L + C`)
> and whose magnitude scales with how the current bar's range
> compares to the range accumulated since the trend last flipped.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Volume                                                               |
| Input type          | `Candle` (uses `high`, `low`, `close`, `volume`)                     |
| Output type         | `f64` (the KVO line; no built-in signal line)                        |
| Output range        | unbounded (centred near zero)                                         |
| Default parameters  | `fast = 34`, `slow = 55` (Klinger's defaults)                        |
| Warmup period       | `slow + 1` (`56` for defaults)                                        |
| Interpretation      | Volume-force MACD; zero-line / signal-line crosses = trade triggers   |

## Formula

```
hlc_t  = high_t + low_t + close_t        (decides the trend)
trend  = sign(hlc_t - hlc_{t-1})         (carried over when equal)
dm_t   = high_t - low_t                  (daily measurement)

cm_t   = cm_{t-1} + dm_t       if trend unchanged
cm_t   = dm_{t-1} + dm_t       if trend just flipped

vf_t   = volume_t · |2 · (dm_t / cm_t - 1)| · trend · 100

KVO_t  = EMA(vf, fast)_t - EMA(vf, slow)_t
```

The trend comes from `H + L + C`, but the measurement that is
accumulated is the bar's **range** `high - low`. Note the `- 1` sits
*inside* the parentheses: `|2 · (dm/cm - 1)|`, not `|2 · dm/cm - 1|`.
On the very first trend read (trend was still `0`) `cm` is seeded from
the two-bar sum as on a flip. A zero `cm_t` (only possible when every
bar since the last flip has a zero range) collapses `vf` to `0`.

Wickra does not emit Klinger's 13-period signal line; compose it
yourself as `EMA(KVO, 13)` if needed.

See `crates/wickra-core/src/indicators/kvo.rs`.

## Parameters

| Name     | Type    | Default | Constraint        | Description |
|----------|---------|---------|-------------------|-------------|
| `fast`   | `usize` | `34`    | `> 0`, `< slow`   | Fast EMA period. |
| `slow`   | `usize` | `55`    | `> 0`, `> fast`   | Slow EMA period. |

`Kvo::new` (`kvo.rs:65-84`) returns `Error::PeriodZero` for a zero
period and `Error::InvalidPeriod` when `fast >= slow`. `Kvo::classic()`
is `(34, 55)`; Python defaults are
`#[pyo3(signature = (fast=34, slow=55))]`.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python:
`KVO.batch(high, low, close, volume)` returns a 1-D array of length `n`
with `NaN` during warmup. Node: `batch(high, low, close, volume)`
returns a `number[]` of length `n`.

## Warmup

`warmup_period() == slow + 1` (`56` for the defaults). The first bar
only seeds `dm_{t-1}` / `hlc_{t-1}`, so the first `vf` lands on bar 2;
the slow EMA then needs `slow` raw `vf` values, so the first KVO value
lands at index `slow` (pinned by `warmup_emits_at_slow_plus_one`).

## Edge cases

- **Constant input.** `H + L + C` flat → trend stays `0` → vf = 0 →
  KVO = 0 (`constant_series_yields_zero`).
- **Zero range.** All-zero bars give `cm == 0`, which collapses vf to
  `0` (`zero_ohlc_collapses_vf_to_zero`).
- **Volume = 0.** Bar contributes zero force.
- **Trend-flip-on-equal.** `hlc == hlc_prev` is treated as
  unchanged, preserving the prior trend.
- **Invalid params.** Zero period or `fast >= slow` is rejected
  (`rejects_zero_period`, `rejects_fast_geq_slow`).
- **Reset.** Clears both EMAs, the previous-bar measurements, the trend
  and the cumulative measure (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, Kvo};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..120).map(|i| {
        let b = 100.0 + (f64::from(i) * 0.2).sin() * 5.0;
        Candle::new(b, b + 1.0, b - 1.0, b + 0.3, 1000.0, i as i64).unwrap()
    }).collect();
    let mut k = Kvo::classic();
    if let Some(o) = k.batch(&candles)[80] {
        println!("KVO={o:.2}");
    }
    Ok(())
}
```

Output:

```
KVO=-21528.41
```

### Python

```python
import numpy as np
import wickra as ta

n = 120
base = 100 + np.sin(np.linspace(0, 25, n)) * 5
k = ta.KVO(34, 55)
out = k.batch(base + 1, base - 1, base + 0.3, np.full(n, 1000.0))
print(out[80])
```

Output:

```
-27918.755410676218
```

### Node

```javascript
const wickra = require('wickra');
const k = new wickra.KVO(34, 55);
// feed h, l, c, v
```

### Streaming

```rust
use wickra::{Candle, Indicator, Kvo};

let mut k = Kvo::classic();
let mut prev: Option<f64> = None;
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if let Some(v) = k.update(bar) {
        if let Some(p) = prev {
            if p <= 0.0 && v > 0.0 { /* bullish zero-line cross */ }
            if p >= 0.0 && v < 0.0 { /* bearish zero-line cross */ }
        }
        prev = Some(v);
    }
}
```

## Interpretation

- **KVO above zero.** Buying pressure dominates short-term.
- **Signal-line crossover.** Klinger's canonical signal — KVO
  crossing above a 13-period EMA of itself (computed separately) is
  bullish; below is bearish.
- **Divergence detection.** Like other volume oscillators, KVO
  divergences vs price flag exhaustion.

## Common pitfalls

- **Comparing to MACD scales.** KVO operates on volume-weighted
  forces; its absolute magnitude depends on raw volume scale.
  Threshold-based systems need per-instrument calibration.
- **Trend-flip surprise.** A flip in the `H + L + C` trend resets the
  cumulative range measure to `dm_{t-1} + dm_t`, which can produce
  sharp KVO jumps.
- **Older `H + L + C` measurement.** Some implementations use
  `H + L + C` as the accumulated measurement as well as the trend
  test, or write the factor as `|2 · dm/cm - 1|`; their values will
  not match Wickra's range-based form.

## References

- Stephen J. Klinger, *Volume Oscillator*, *Technical Analysis of
  Stocks & Commodities*, December 1997.

## See also

- [Obv](/Indicators/Indicator-Obv) — simpler cumulative volume.
- [ChaikinOscillator](/Indicators/Indicator-ChaikinOscillator) — alternative
  ADL-based volume oscillator.
- [MacdIndicator](/Indicators/Indicator-MacdIndicator) — closely-related
  topology.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
