# HiLo Activator

> Robert Krausz's adaptation of the Raschke / Connors "HiLo" rule,
> popularised by Toby Crabel. Two simple moving averages — of the
> high and of the low — bracket price; the trailing stop for a long
> sits at the SMA-of-low, and for a short at the SMA-of-high. A
> minimal, parameter-light trailing-stop / regime-switch indicator
> with no ATR and no multiplier.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Trailing Stops                                                       |
| Input type          | `Candle` (uses `high`, `low`, `close`)                               |
| Output type         | `f64` — the active stop level                                        |
| Output range        | unbounded (price-units)                                              |
| Default parameters  | `period` is required; Crabel's common choice is `3`                  |
| Warmup period       | `period + 1` (SMAs fill at `period`; first signal compares to `prev`)|
| Interpretation      | Active trailing stop; flips when close crosses the opposite SMA      |

## Formula

Two parallel SMAs over the high and low series:

```
hi_sma_t = SMA(high, period)_t        // potential short stop
lo_sma_t = SMA(low,  period)_t        // potential long stop
```

The state machine compares the close to the *previous* bar's SMAs
to avoid look-ahead:

```
long  while close > hi_sma_{t−1}  ->  emit lo_sma_{t−1}
short while close < lo_sma_{t−1}  ->  emit hi_sma_{t−1}
else: hold the previously active side
```

The first input that fills the SMA window seeds a long. See
`crates/wickra-core/src/indicators/hilo_activator.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 0`      | SMA window for both the high and low SMAs. |

`HiLoActivator::new` returns `Error::PeriodZero` for `period == 0`.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python:
`HiLoActivator(period).batch(high, low, close)` returns a 1-D
`np.ndarray` with `NaN` for the warmup prefix. Node:
`HiLoActivator(period).batch(...)` returns `Array<number>`;
`update(candle)` returns `number | null`.

## Warmup

`warmup_period() == period + 1`. The SMAs fill at exactly `period`
candles; the state-machine compares to the *previous* bar's SMAs, so
the first signal lands one bar later, on candle `period + 1`.

## Edge cases

- **Constant candles.** `hi_sma == lo_sma == close` after warmup;
  neither flip condition triggers, the active side stays long, and
  the emitted stop equals the SMA of the low — which is constant
  too.
- **Flat ranges.** If `close == hi_sma_{t−1}` (no strict inequality)
  the state machine does *not* flip — it holds the current side.
- **Reset.** `reset()` clears both SMA buffers, both running sums,
  the previous-SMA cache, and the `long` / `started` flags. The next
  `update` re-seeds.
- **NaN / infinity.** Rejected by `Candle::new` upstream.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, HiLoActivator, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..40)
        .map(|i| {
            let b = 100.0 + f64::from(i);
            Candle::new(b, b + 1.0, b - 1.0, b, 10.0, i64::from(i)).unwrap()
        })
        .collect();
    let mut hl = HiLoActivator::new(3)?;
    let out = hl.batch(&candles);
    println!("row 10 stop = {:?}", out[10]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

n = 40
base = 100 + np.arange(n, dtype=float)
high = base + 1.0
low  = base - 1.0
close = base

hl = ta.HiLoActivator(3)
out = hl.batch(high, low, close)
print('warmup:', hl.warmup_period())  # 4
print('row 10:', out[10])
```

### Node

```javascript
const wickra = require('wickra');

const n = 40;
const base = Array.from({ length: n }, (_, i) => 100 + i);
const high = base.map(b => b + 1);
const low  = base.map(b => b - 1);
const close = base;

const hl = new wickra.HiLoActivator(3);
const out = hl.batch(high, low, close);
console.log('row 10:', out[10]);
```

### Streaming

```rust
use wickra::{Candle, HiLoActivator, Indicator};

let mut hl = HiLoActivator::new(3).unwrap();
for bar in candle_stream {
    if let Some(stop) = hl.update(bar) {
        if bar.close < stop { /* long stopped out — flip-to-short next bar */ }
    }
}
```

## Interpretation

- **Stop trailing.** When long, the emitted level is the SMA of
  recent lows — a relatively tight, fast-following stop. When short,
  it's the SMA of recent highs.
- **Trend regime filter.** Many systems do not use HiLo as a stop at
  all; they read the *side* (long vs short) to gate trend-following
  entries. "Trade only longs while HiLo is on the long side" is the
  Crabel-style rule of thumb.
- **Vs ATR-based trailing stops.** HiLo has no volatility scaling —
  the trail width is whatever `SMA(high) − SMA(low)` happens to be,
  which is roughly proportional to recent range but not equal to
  ATR. Faster to react in tight ranges, slower in volatile sprints.

## Common pitfalls

- **Treating the stop as a hard exit.** The state machine flips only
  on a close-through of the *opposite* SMA, not on a close-through
  of the emitted stop. Backtests that exit "when close crosses the
  emitted level" will not match the indicator's internal regime
  bit.
- **Short windows are noisy.** `period = 3` (Crabel's choice) is
  aggressive — it whips on any 2-3 bar pullback. Lengthen to 5-9 for
  smoother behaviour on liquid instruments.
- **Reset on session boundaries.** The SMA buffers are not session-
  aware. If you trade intraday sessions distinct from each other,
  call `reset()` at session start.

## References

- Toby Crabel, *Day Trading with Short Term Price Patterns and
  Opening Range Breakout* (1990) — the canonical Crabel treatment
  of HiLo-style state-machines.
- Linda Bradford Raschke & Lawrence Connors, *Street Smarts:
  High-Probability Short-Term Trading Strategies* (1995) — the
  original HiLo rule that Crabel and Krausz adapted.

## See also

- [Donchian](Indicator-Donchian) — sibling rolling-window indicator
  that uses min/max rather than SMA.
- [DonchianStop](Indicator-DonchianStop) — sibling trailing-stop on
  the same rolling-window basis.
- [AtrTrailingStop](Indicator-AtrTrailingStop) — ATR-anchored
  alternative.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
