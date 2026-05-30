# Heikin-Ashi

> "Average bar" — a Japanese candle-smoothing transform that
> emphasises trend continuity. Each Heikin-Ashi candle's OHLC is
> derived from the real candle plus the previous Heikin-Ashi
> candle, so consecutive same-colour HA bars confirm a trend more
> cleanly than raw candles. Streaming O(1) state machine — one HA
> candle per real candle, starting from the very first bar.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Ichimoku & Charts                                                    |
| Input type          | `Candle`                                                             |
| Output type         | `HeikinAshiOutput { open, high, low, close: f64 }`                   |
| Output range        | unbounded (price-units)                                              |
| Default parameters  | none — `HeikinAshi::new()`                                           |
| Warmup period       | `1`                                                                  |
| Interpretation      | Smoothed candle series; same-colour HA streaks confirm trend         |

## Formula

```
ha_close_t = (open_t + high_t + low_t + close_t) / 4

ha_open_t  = (ha_open_{t-1} + ha_close_{t-1}) / 2    (recursive)
ha_open_1  = (open_1 + close_1) / 2                    (seed for first bar)

ha_high_t  = max(high_t, ha_open_t, ha_close_t)
ha_low_t   = min(low_t,  ha_open_t, ha_close_t)
```

See `crates/wickra-core/src/indicators/heikin_ashi.rs`. The
transform is purely local except for `ha_open`, which depends on
the previous HA candle.

## Parameters

None — `HeikinAshi::new()` takes no arguments.

## Inputs / Outputs

`Indicator<Input = Candle, Output = HeikinAshiOutput>` with four
fields (`open, high, low, close`).

- **Python.** `HeikinAshi().batch(open, high, low, close)` returns
  an `(n, 4)` `float64` array with columns
  `[open, high, low, close]`.
- **Node.** Flat `number[]` of length `n * 4`; streaming
  `update(candle)` returns `{ open, high, low, close } | null`
  (only `null` on a non-finite candle, never on first bar).

## Warmup

`warmup_period() == 1`. The first input emits a Heikin-Ashi candle
seeded with `ha_open_1 = (open + close) / 2`.

## Edge cases

- **First bar seeding.** `ha_open` for bar 1 uses the seed
  formula, not the recursion. Subsequent bars use the recursion.
- **Constant input.** All four HA fields converge to the constant
  (the average of identical values is the same value).
- **Strict trend confirmation.** When `ha_open > ha_close` for
  many consecutive bars, the HA candle bodies are all bearish
  (red) — a continuous "no-wick on top" sequence is the canonical
  HA strong-downtrend visual.
- **Reset.** Clears the previous-HA cache.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, HeikinAshi, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..10).map(|i| {
        let b = 100.0 + f64::from(i);
        Candle::new(b, b + 1.0, b - 1.0, b + 0.5, 1.0, i as i64).unwrap()
    }).collect();
    let mut ha = HeikinAshi::new();
    let out = ha.batch(&candles);
    if let Some(o) = out[5] {
        println!("HA row 5: open={}  close={}", o.open, o.close);
    }
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

n = 10
base = 100 + np.arange(n, dtype=float)
o = base
h = base + 1
l = base - 1
c = base + 0.5

ha = ta.HeikinAshi()
out = ha.batch(o, h, l, c)
print('shape:', out.shape)  # (10, 4)
print('row 5:', out[5])     # [ha_open, ha_high, ha_low, ha_close]
```

### Node

```javascript
const wickra = require('wickra');
const ha = new wickra.HeikinAshi();
const n = 10;
const base = Array.from({ length: n }, (_, i) => 100 + i);
const flat = ha.batch(base, base.map(b => b + 1), base.map(b => b - 1), base.map(b => b + 0.5));
console.log('row 5 ha_open :', flat[5 * 4]);
console.log('row 5 ha_close:', flat[5 * 4 + 3]);
```

### Streaming

```rust
use wickra::{Candle, HeikinAshi, Indicator};

let mut ha = HeikinAshi::new();
for bar in candle_stream {
    let o = ha.update(bar).unwrap();
    let bullish = o.close > o.open;
    // Use HA candle colour as trend confirmation
}
```

## Interpretation

- **Trend smoothing.** Consecutive same-colour HA candles confirm
  a trend; a HA candle with a small body and long wicks signals
  potential reversal.
- **No-wick HA candles.** A bullish HA candle with no lower wick
  (`ha_low == ha_open`) means the bar's true low was inside the
  HA body — a strong-trend visual.
- **Vs raw candles.** HA hides individual-bar noise; great for
  reading regimes at a glance. But because HA candles aren't
  actual prices, any *level* read off HA (e.g. "support at HA
  low") will not match real-price stops.

## Common pitfalls

- **Trading HA levels as real prices.** HA candles are smoothed
  averages — `ha_high` is not necessarily a touched price. Stop
  orders set at HA levels will be wrong.
- **Confusing HA candles with real candles.** Many beginners
  apply pattern-recognition (e.g. doji, hammer) to HA candles.
  These patterns were developed on raw candles; their statistical
  edge does not transfer to HA.
- **Multi-timeframe surprises.** HA on a 1-min chart aggregated
  to 5-min HA is **not** equivalent to HA on 5-min raw candles.
  HA is order-dependent.

## References

- Steve Nison, *Beyond Candlesticks* (1994) — covers Heikin-Ashi
  among Japanese charting variants.
- Various Japanese-trading practitioner texts (Heikin-Ashi was
  popularised in Japan long before its Western adoption).

## See also

- [Ichimoku](Indicator-Ichimoku) — companion Japanese-charting
  system.
- [Doji](Indicator-Doji), [Hammer](Indicator-Hammer),
  [Engulfing](Indicator-Engulfing) — candlestick patterns
  (use on raw candles, *not* HA).
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
