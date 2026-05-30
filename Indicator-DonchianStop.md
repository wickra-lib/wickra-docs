# Donchian Channel Stop

> The original Turtle-trader exit rule. A long is trailed at the
> lowest low of the last `period` bars; a short at the highest high.
> There is no ATR, no multiplier, and no flip-bit — the two levels
> are always emitted simultaneously and the caller selects whichever
> side matches the current position.

## Quick reference

| Item                | Value                                                              |
|---------------------|--------------------------------------------------------------------|
| Family              | Trailing Stops                                                     |
| Input type          | `Candle` (uses `high`, `low`)                                      |
| Output type         | `DonchianStopOutput { stop_long, stop_short }`                     |
| Output range        | unbounded (price-units)                                            |
| Default parameters  | `period = 10` (`DonchianStop::classic()`, the Turtle exit channel) |
| Warmup period       | `period`                                                           |
| Interpretation      | `stop_long` for longs, `stop_short` for shorts; no built-in side state |

## Formula

```
stop_long_t  = min(low,  over last period bars)
stop_short_t = max(high, over last period bars)
```

The bar that fills the `period`-bar window emits the first pair of
stops. See `crates/wickra-core/src/indicators/donchian_stop.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | `10`    | `> 0`      | Rolling window length in bars. |

`DonchianStop::new` returns `Error::PeriodZero` for `period == 0`.
`DonchianStop::classic()` returns the `10`-bar factory — the original
Turtle exit window. Dennis' entry channel was `20`-bar; feed the
exit window here.

## Inputs / Outputs

`Indicator<Input = Candle, Output = DonchianStopOutput>` with fields:

| Field        | Description |
|--------------|-------------|
| `stop_long`  | Lowest low over the lookback — use as trailing stop for a long. |
| `stop_short` | Highest high over the lookback — use as trailing stop for a short. |

- **Python.** `DonchianStop(period).batch(high, low)` returns an
  `(n, 2)` `float64` array with columns `[stop_long, stop_short]`;
  warmup rows are entirely `NaN`.
- **Node.** Returns a flat `number[]` of length `n * 2` with the two
  fields interleaved (`stop_long` at `i*2`, `stop_short` at `i*2+1`).
  `update(candle)` returns `{ stopLong, stopShort } | null`.

## Warmup

`warmup_period() == period`. The window fills on bar `period`; that's
the first bar that emits a non-`None` output.

## Edge cases

- **Constant candles.** `stop_long == low` and `stop_short == high`,
  both constant — no stop motion until the window slides off a
  different bar.
- **All-time-high market.** `stop_long` ratchets up smoothly with
  the rising lows; `stop_short` keeps pace with the rising highs.
- **No flip logic.** The indicator does not maintain a "side". If
  your strategy is bidirectional, you must track the position
  externally and pick the matching field.
- **Reset.** `reset()` clears both rolling buffers; the next
  `period` candles return `None`.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, DonchianStop, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..40)
        .map(|i| {
            let b = 100.0 + f64::from(i);
            Candle::new(b, b + 2.0, b - 2.0, b + 1.0, 10.0, i64::from(i)).unwrap()
        })
        .collect();
    let mut ds = DonchianStop::classic();
    let out = ds.batch(&candles);
    if let Some(v) = out[20] {
        println!("row 20  long_stop={} short_stop={}", v.stop_long, v.stop_short);
    }
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

n = 40
base = 100 + np.arange(n, dtype=float)
high = base + 2.0
low  = base - 2.0

ds = ta.DonchianStop(10)
out = ds.batch(high, low)
print('shape :', out.shape)         # (40, 2)
print('warmup:', ds.warmup_period())  # 10
print('row 20:', out[20])           # [stop_long, stop_short]
```

### Node

```javascript
const wickra = require('wickra');

const ds = new wickra.DonchianStop(10);
const n = 40;
const base = Array.from({ length: n }, (_, i) => 100 + i);
const high = base.map(b => b + 2);
const low  = base.map(b => b - 2);
const flat = ds.batch(high, low);
console.log('row 20 long :', flat[20 * 2]);
console.log('row 20 short:', flat[20 * 2 + 1]);
```

### Streaming

```rust
use wickra::{Candle, DonchianStop, Indicator};

let mut ds = DonchianStop::classic();
let mut position: i32 = 1; // tracked externally
for bar in candle_stream {
    if let Some(o) = ds.update(bar) {
        let stop = if position > 0 { o.stop_long } else { o.stop_short };
        if (position > 0 && bar.close < stop) || (position < 0 && bar.close > stop) {
            position = 0; // stopped out
        }
    }
}
```

## Interpretation

- **Turtle exit rule.** Dennis & Eckhardt's original system entered
  on a `DonchianChannel(20)` breakout and exited on a
  `DonchianStop(10)`-cross — a 2:1 asymmetric channel that locked in
  trends faster than the entry. This indicator emits exactly that
  exit channel.
- **No volatility scaling.** Unlike ATR-based stops, the trail is
  whatever the recent extreme happens to be. Wide in volatile
  periods, tight in quiet ones — but not proportional to anything
  systematic.
- **Pairs with Donchian channel entries.** Most Donchian-stop
  systems pair this exit indicator with a longer-period
  `Donchian` channel for entries.

## Common pitfalls

- **Treating it as one-sided.** Both stops are emitted on every
  bar regardless of position. Always select the field matching your
  position; consuming `stop_long` while short will produce nonsense.
- **Whipsaw on tight channels.** `period = 5` (very tight) flips
  positions every minor pullback in choppy markets. Stick to `10`+
  unless you are short-timeframe and accept the noise.
- **Gap behaviour.** A gap-down through `stop_long` exits at the
  gap close. The indicator does not "skip" gaps — your fill price
  may be well below the emitted level.

## References

- Richard Donchian's channel-breakout work (1950s-60s) is the
  parent concept.
- Curtis Faith, *Way of the Turtle* (2007) — the canonical modern
  reference for the Dennis / Eckhardt Turtle system, which used a
  10-bar Donchian channel as the exit rule.

## See also

- [Donchian](Indicator-Donchian) — the entry-channel cousin.
- [HiLoActivator](Indicator-HiLoActivator) — SMA-based rather than
  min/max-based.
- [AtrTrailingStop](Indicator-AtrTrailingStop) — volatility-scaled
  alternative.
- [ChandelierExit](Indicator-ChandelierExit) — uses highest high
  with an ATR offset.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
