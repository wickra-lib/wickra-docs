# TtmSqueeze

> John Carter's volatility squeeze: Bollinger Bands sitting *inside* a
> Keltner Channel signals a coiled market about to expand. Paired with a
> detrended-close momentum line that gives the breakout direction.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Bands & Channels |
| Input type | `Candle` (uses `high`, `low`, `close`) |
| Output type | `TtmSqueezeOutput { squeeze, momentum }` |
| Output range | `squeeze ∈ {0.0, 1.0}`; `momentum` unbounded |
| Default parameters | `period = 20`, `bb_mult = 2.0`, `kc_mult = 1.5` |
| Warmup period | `2 · period − 1` (39 at `period = 20`) |
| Interpretation | Squeeze releases (`squeeze` flips from `1.0` to `0.0`) signal a breakout; trade in the direction of `sign(momentum)`. |

## Formula

```
squeeze  = 1.0 if BollingerBands(period, bb_mult)
               ⊂ KeltnerChannels-like(SMA(period), ATR(period), kc_mult)
           else 0.0

hl_mid_t   = (max(high, period) + min(low, period)) / 2      // at bar t
detrend_t  = close_t − (hl_mid_t + SMA(close, period)_t) / 2
momentum_t = LinearRegression(detrend, period)_t           // endpoint
```

Every bar's detrended close is measured against that bar's *own*
baseline, and the regression runs over the last `period` of those values —
the common `linreg(close − avg(avg(highest(high, n), lowest(low, n)),
sma(close, n)), n, 0)`. Wickra 2.1 and earlier subtracted the *current*
bar's baseline from the whole window instead (#508); see the warmup
change below.

The "Keltner-like" envelope here uses an *SMA* centerline (not the EMA
of typical price that [Keltner](/Indicators/Indicator-Keltner) uses) plus an ATR
offset, exactly as Carter's original publication and every chart-vendor
implementation define it. The squeeze is *on* (`1.0`) when both Bollinger
rails sit inside the corresponding Keltner-like rails.

## Parameters

| Name      | Type    | Default | Constraint    | Source |
|-----------|---------|---------|---------------|--------|
| `period`  | `usize` | `20`    | `>= 2`        | `TtmSqueeze::new` (`ttm_squeeze.rs:93`) |
| `bb_mult` | `f64`   | `2.0`   | finite, `> 0` | `ttm_squeeze.rs:104` |
| `kc_mult` | `f64`   | `1.5`   | finite, `> 0` | `ttm_squeeze.rs:104` |

`period < 2` returns [`Error::InvalidPeriod`] (the momentum regression needs
at least 2 points); a non-finite or non-positive multiplier returns
[`Error::NonPositiveMultiplier`]. `TtmSqueeze::classic()` returns
`(20, 2.0, 1.5)`. Python defaults come from
`#[pyo3(signature = (period=20, bb_mult=2.0, kc_mult=1.5))]`; the Node
constructor takes all three arguments explicitly.

## Inputs / Outputs

```rust
use wickra::{Indicator, TtmSqueeze, Candle, TtmSqueezeOutput};
// TtmSqueeze: Input = Candle, Output = TtmSqueezeOutput
const _: fn(&mut TtmSqueeze, Candle) -> Option<TtmSqueezeOutput> = <TtmSqueeze as Indicator>::update;
```

- **Python streaming.** `update(candle)` returns `(squeeze, momentum)` or `None`.
- **Python batch.** `TtmSqueeze.batch(high, low, close)` returns an `(n, 2)`
  `Matrix` with columns `[squeeze, momentum]`; warmup rows are `NaN`.
- **Node streaming.** `update(high, low, close)` returns a
  `{ squeeze, momentum }` object or `null`.
- **Node batch.** `batch(high, low, close)` returns a flat `Array<number>`
  of length `n * 2`, interleaved `[squeeze0, momentum0, …]`.

## Warmup

`warmup_period()` returns `2 · period − 1`. The three sub-indicators
(Bollinger, SMA of close, ATR) are fed unconditionally so they warm up in
lock-step and are ready on candle `period`; that is the first bar with a
baseline, so the first detrended close. The regression then needs `period`
detrended closes, so `update` first emits on candle `2 · period − 1` (index
`2 · period − 2`). Pinned by `warmup_returns_none` (period 20: candles 1–38
return `None` and `is_ready()` stays `false`, candle 39 emits).

Before 2.2 the warmup was `period`; code that sized buffers or skipped rows
from `warmup_period()` adapts by itself, code that hard-coded `period` does
not.

## Edge cases

- **Flat market.** Both envelopes collapse to a point, so the squeeze is
  trivially on (`squeeze == 1.0`) and the detrended regression gives
  `momentum == 0` (test `flat_market_has_zero_momentum`).
- **Binary flag.** `squeeze` is always exactly `0.0` or `1.0` — never a
  fraction (test `squeeze_is_binary`).
- **Per-bar baseline.** `momentum` matches an independent from-scratch
  computation of every bar's own detrended close within `1e-9`, on a
  300-candle path where the old current-baseline form differs by more than
  `1e-3` (test `momentum_matches_per_bar_detrend_reference`).
- **Reset.** `reset()` resets all three sub-indicators and clears the
  rolling high/low windows and the detrended-close window.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, TtmSqueeze};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..40)
        .map(|i| {
            let m = 100.0 + (f64::from(i) * 0.4).sin() * 2.0;
            Candle::new(m, m + 1.0, m - 1.0, m, 10.0, i64::from(i)).unwrap()
        })
        .collect();
    let mut s = TtmSqueeze::classic(); // (20, 2.0, 1.5)
    for o in s.batch(&candles).into_iter().flatten() {
        println!("squeeze={} momentum={:.4}", o.squeeze, o.momentum);
    }
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

s = ta.TtmSqueeze(20, 2.0, 1.5)
out = s.batch(high, low, close)  # shape (n, 2): [squeeze, momentum]
squeeze, momentum = out[:, 0], out[:, 1]
```

### Node

```javascript
const ta = require('wickra');
const s = new ta.TtmSqueeze(20, 2.0, 1.5);
const o = s.update(101, 99, 100); // null during warmup, else { squeeze, momentum }
```

## Interpretation

Carter's setup reads in two steps — *when* and *which way*:

1. **The coil (`squeeze == 1.0`).** Bollinger inside Keltner means realised
   volatility has dropped below the ATR baseline. The longer the squeeze
   persists, the more energy is stored.
2. **The release (`1.0 → 0.0`).** When the squeeze turns off, volatility is
   expanding — enter in the direction of `sign(momentum)` at the release
   bar and hold while `momentum` keeps expanding in your favour.

`momentum` is a histogram-like reading: positive in a breakout up, negative
in a breakout down. Most charting renders it as colored bars; here it is the
raw regression endpoint so callers can color/scale it themselves.

## Common pitfalls

- **Trading the squeeze-on bar.** The signal is the *release* (`1.0 → 0.0`),
  not the squeeze itself — entering while still squeezed front-runs a
  breakout that may not come.
- **Expecting Wickra's [Keltner](/Indicators/Indicator-Keltner) numbers in the
  squeeze test.** TTM's internal Keltner-like envelope uses an SMA-of-close
  centerline, deliberately different from `Keltner`'s EMA-of-typical-price.

## References

- John Carter, *Mastering the Trade*, McGraw-Hill, 2005. The original "TTM
  Squeeze" was distributed as a proprietary TradeStation indicator through
  Carter's Trade The Markets / Simpler Trading service.

## See also

- [BollingerBands](/Indicators/Indicator-BollingerBands) — one of the two envelopes.
- [Keltner](/Indicators/Indicator-Keltner) — the other envelope (note Carter's
  Keltner-like definition uses an SMA centerline, not Keltner's EMA).
- [BollingerBandwidth](/Indicators/Indicator-BollingerBandwidth) — a continuous measure
  of "how squeezed" the bands are.
