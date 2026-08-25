# Volty Stop

> Cynthia Kase's volatility-anchored trailing stop. The stop is hung
> off the *extreme close* recorded since the current trade was
> opened, not off the most recent bar, which keeps it tight without
> giving back gains when price pulls back inside the trend. Compared
> to the plain ATR trailing stop — which re-anchors on every bar's
> close — Volty Stop's extreme-anchor design gives back less on
> pullbacks while keeping the same ATR-based volatility scaling.

## Quick reference

| Item                | Value                                                                            |
|---------------------|----------------------------------------------------------------------------------|
| Family              | Trailing Stops                                                                   |
| Input type          | `Candle`                                                                         |
| Output type         | `f64` — the active stop level                                                    |
| Output range        | unbounded (price-units)                                                          |
| Default parameters  | `atr_period = 14`, `multiplier = 2.0` (`VoltyStop::classic()`)                  |
| Warmup period       | `atr_period + 1` — ATR seed needs the period, then the anchor needs one close   |
| Interpretation      | ATR-buffered extreme-anchored stop; flips to opposite side on close-through      |

## Formula

```
band = multiplier · ATR(atr_period)

long:   anchor = max(close_since_long_open)
        stop_t = anchor − band
        flip-to-short on close < stop_t
            -> anchor = close
               stop   = close + band

short:  anchor = min(close_since_short_open)
        stop_t = anchor + band
        flip-to-long  on close > stop_t
            -> anchor = close
               stop   = close − band
```

The anchor only ratchets in the trade's favour — it never moves
against you while the side is unchanged — so the stop tightens as
price reaches new extremes. See
`crates/wickra-core/src/indicators/volty_stop.rs`.

## Parameters

| Name         | Type    | Default | Constraint           | Description |
|--------------|---------|---------|----------------------|-------------|
| `atr_period` | `usize` | `14`    | `> 0`                | Period of the underlying ATR. |
| `multiplier` | `f64`   | `2.0`   | finite, `> 0`        | Number of ATRs the stop sits below/above the anchor close. |

`VoltyStop::new` returns `Error::PeriodZero` for `atr_period == 0`
and `Error::NonPositiveMultiplier` for non-finite or non-positive
`multiplier`. `VoltyStop::classic()` returns the `(14, 2.0)` factory.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python:
`VoltyStop(period, mult).batch(high, low, close)` returns a 1-D
`array.array('d')` with `NaN` in the warmup prefix. Node: same shape;
`update(candle)` returns `number | null`.

## Warmup

`warmup_period() == atr_period + 1`. The inner ATR needs
`atr_period` bars to seed; on the next bar the anchor is initialised
to the current close and the first stop is emitted.

## Edge cases

- **First side.** The first emission opens a long with the anchor at
  the seeding bar's close. Strategies that need a clean entry signal
  should ignore the first emit.
- **Flat tape.** When `close` is constant after warmup, the anchor
  stays at that level and the stop sits a fixed `band` below it; no
  flip ever fires.
- **Catastrophic gap.** A gap that closes below `stop_long` flips to
  short and re-anchors at the gap close — the indicator does not try
  to "skip" the gap.
- **Reset.** `reset()` clears the inner ATR, the anchor, and resets
  the side flag to long.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, VoltyStop};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..80)
        .map(|i| {
            let b = 100.0 + f64::from(i);
            Candle::new(b, b + 2.0, b - 2.0, b + 1.0, 10.0, i64::from(i)).unwrap()
        })
        .collect();
    let mut vs = VoltyStop::classic();
    let out = vs.batch(&candles);
    println!("row 30 stop = {:?}", out[30]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

n = 80
base = 100 + np.arange(n, dtype=float)
high  = base + 2.0
low   = base - 2.0
close = base + 1.0

vs = ta.VoltyStop(14, 2.0)
out = vs.batch(high, low, close)
print('warmup:', vs.warmup_period())  # 15
print('row 30:', out[30])
```

### Node

```javascript
const wickra = require('wickra');
const vs = new wickra.VoltyStop(14, 2.0);
const n = 80;
const base = Array.from({ length: n }, (_, i) => 100 + i);
const high  = base.map(b => b + 2);
const low   = base.map(b => b - 2);
const close = base.map(b => b + 1);
const out = vs.batch(high, low, close);
console.log('row 30:', out[30]);
```

### Streaming

```rust
use wickra::{Candle, Indicator, VoltyStop};

let mut vs = VoltyStop::classic();
let mut prev_stop: Option<f64> = None;
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if let Some(stop) = vs.update(bar) {
        if let Some(prev) = prev_stop {
            // Detect a side flip: stop jumped from below close to above (or vice versa).
            let crossed = (prev < bar.close) != (stop < bar.close);
            if crossed { /* side flipped, re-evaluate position */ }
        }
        prev_stop = Some(stop);
    }
}
```

## Interpretation

- **Extreme-anchored trail.** Once long, the anchor only goes up; if
  the trend gives back half its gain, the stop stays where it was at
  the previous high. This is the "no give-back" feature versus a
  Chandelier-style trail.
- **Volatility-scaled width.** The `multiplier · ATR` band widens in
  volatile periods and tightens in quiet ones, so the indicator
  self-adjusts across regimes without re-tuning.
- **Vs Chandelier Exit.** Chandelier uses the highest *high* (a
  noisier reference). Volty Stop uses the highest *close* — slower
  to react to wick-driven spikes but less prone to whipping on
  intraday extremes.

## Common pitfalls

- **Tuning multiplier on the wrong instrument.** `2.0` is reasonable
  for liquid US equities and major FX pairs. Highly volatile crypto
  or futures may need `3.0`+ to avoid intra-trend whips; very quiet
  rate products may want `1.5`.
- **Expecting the level to be the entry trigger.** Volty Stop only
  emits a stop level; entries belong to a separate signal. A common
  bug is "buy when the stop crosses from above price to below"
  which under-counts entries.
- **Forgetting that the warmup matters.** With `atr_period = 14`,
  the first 15 candles return `None`. Short backtests will look
  dominated by warmup.

## References

- Cynthia A. Kase, *Trading with the Odds: Using the Power of
  Statistics to Profit in the Futures Market* (1996) —
  introduction of the Volty (volatility) family of stops.

## See also

- [Atr](/Indicators/Indicator-Atr) — the underlying volatility unit.
- [AtrTrailingStop](/Indicators/Indicator-AtrTrailingStop) — re-anchors every
  bar instead of riding the extreme.
- [ChandelierExit](/Indicators/Indicator-ChandelierExit) — high/low-anchored
  cousin.
- [SuperTrend](/Indicators/Indicator-SuperTrend) — `(HL2 ± mult·ATR)`-based
  state machine.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
