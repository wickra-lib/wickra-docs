# SmoothedHeikinAshi

> The Heikin-Ashi transform applied to EMA-smoothed OHLC — long, clean runs of
> same-colour candles for an even clearer trend read.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Ichimoku & Charts |
| Input type | `Candle` (open / high / low / close) |
| Output type | `SmoothedHeikinAshiOutput { open, high, low, close }` |
| Output range | price units; `low <= open,close <= high` |
| Default parameters | `(period = 10)` (Python) |
| Warmup period | `period` |
| Interpretation | `close > open` bullish candle; long runs = strong trend. |

## Formula

```
eo, eh, el, ec = EMA(open|high|low|close, period)
ha_close = (eo + eh + el + ec) / 4
ha_open  = (prev_ha_open + prev_ha_close) / 2     (seeded with (eo + ec)/2)
ha_high  = max(eh, ha_open, ha_close)
ha_low   = min(el, ha_open, ha_close)
```

Standard Heikin-Ashi averages the OHLC; this variant first smooths each input
series with an EMA, removing additional noise so trends print as uninterrupted
colour runs with crisp flips at turns — at the cost of `period`-proportional lag.
Source: `crates/wickra-core/src/indicators/smoothed_heikin_ashi.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `10` (Python) | `>= 1`      | `smoothed_heikin_ashi.rs:69` | EMA smoothing length applied to each OHLC series. `0` errors with `Error::PeriodZero`. |

The `period` getter returns the window; `value` returns the current candle if
ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/smoothed_heikin_ashi.rs`:

```rust
use wickra::{Candle, Indicator, SmoothedHeikinAshi, SmoothedHeikinAshiOutput};
// SmoothedHeikinAshi: Input = Candle, Output = SmoothedHeikinAshiOutput
const _: fn(&mut SmoothedHeikinAshi, Candle) -> Option<SmoothedHeikinAshiOutput> =
    <SmoothedHeikinAshi as Indicator>::update;
```

A `Candle` in, an `Option<SmoothedHeikinAshiOutput>` out. The Python binding returns
an `(open, high, low, close)` tuple from `update` and an `(n, 4)` array from
`batch(open, high, low, close)`; Node returns `{ open, high, low, close }` and a
flat `Float64Array` of length `n*4`; WASM mirrors the object with camelCase keys.

## Warmup

`warmup_period() == period`. The four EMAs seed before the first candle
(`first_emission_at_warmup_period` pins this).

## Edge cases

- **Bracketing.** `high >= open,close` and `low <= open,close`
  (`high_brackets_open_close` pins this).
- **Uptrend → bullish candle.** A clean rise prints `close > open`
  (`uptrend_close_above_open` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `s.reset()` clears the four EMAs, the prior candle and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, SmoothedHeikinAshi};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut s = SmoothedHeikinAshi::new(3)?;
    let candles: Vec<Candle> = (0..30)
        .map(|i| { let b = 100.0 + 2.0 * f64::from(i); Candle::new(b, b + 1.0, b - 1.0, b + 0.5, 1_000.0, 0).unwrap() })
        .collect();
    let out = s.batch(&candles).last().unwrap().unwrap();
    println!("bullish candle: {}", out.close > out.open);
    Ok(())
}
```

Output:

```
bullish candle: true
```

### Python

```python
import numpy as np
import wickra as ta

s = ta.SmoothedHeikinAshi(10)
o, h, l, c = (np.arange(40.0)+100, np.arange(40.0)+101, np.arange(40.0)+99, np.arange(40.0)+100.5)
ha = s.batch(o, h, l, c)  # (n, 4)
print(ha[-1])
```

### Node

```javascript
const ta = require('wickra');

const s = new ta.SmoothedHeikinAshi(10);
console.log('warmupPeriod:', s.warmupPeriod()); // 10
```

### Streaming

```rust
use wickra::{Candle, Indicator, SmoothedHeikinAshi};

let mut s = SmoothedHeikinAshi::new(10).unwrap();
let feed: Vec<Candle> = Vec::new(); // your live stream
for candle in feed {
    if let Some(ha) = s.update(candle) {
        // ha.close > ha.open -> bullish; colour flip -> trend change
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Trend persistence.** A run of bullish (close > open) candles with small lower
   wicks signals a strong, low-noise uptrend (mirror for downtrends).
2. **Colour flip.** The first opposite-colour candle after a long run is the
   earliest visual reversal cue.
3. **Lag awareness.** Bigger `period` = smoother but later flips; tune to your
   horizon.

## Common pitfalls

- **Not real prices.** Smoothed HA OHLC are synthetic; never use the levels for
  exact entries/stops — use them for direction.
- **Lag.** The double smoothing delays reversals more than plain HA.
- **Repaint-free here.** This is computed bar-closed; intraday updates will move
  the forming candle (as with any HA).

## References

Heikin-Ashi originates in Japanese candlestick practice; the smoothed variant is a
common platform extension (e.g. Dan Valcu's work on Heikin-Ashi).

## See also

- [Indicator-HeikinAshi](/Indicators/Indicator-HeikinAshi) — the unsmoothed transform.
- [Indicator-HeikinAshiOscillator](/Indicators/Indicator-HeikinAshiOscillator) — the HA body as an oscillator.
- [Indicator-Ema](/Indicators/Indicator-Ema) — the smoothing core.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
