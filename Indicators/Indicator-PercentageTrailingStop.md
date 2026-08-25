# Percentage Trailing Stop

> A fixed-percentage stop that ratchets with the trend and flips to
> the opposite side on a close-through. The trail width is purely
> proportional to the latest price, so it scales naturally across
> instruments without re-tuning — a 5% trail behaves the same on a
> $10 stock and a $1000 stock.

## Quick reference

| Item                | Value                                                              |
|---------------------|--------------------------------------------------------------------|
| Family              | Trailing Stops                                                     |
| Input type          | `f64` (close)                                                      |
| Output type         | `f64` — the active stop level                                      |
| Output range        | unbounded (price-units)                                            |
| Default parameters  | `percent = 5.0` (`PercentageTrailingStop::classic()`)              |
| Warmup period       | `1`                                                                |
| Interpretation      | Stop level; flips to opposite side on close-through                |

## Formula

```
step = |close| · percent / 100

long:   stop_t = max(stop_{t−1}, close − step)   while close ≥ stop_{t−1}
short:  stop_t = min(stop_{t−1}, close + step)   while close ≤ stop_{t−1}

flip-to-long  on a close > prev short-stop  ->  stop = close − step
flip-to-short on a close < prev long-stop   ->  stop = close + step
```

The first input seeds a long stop `percent` below price. Long stops
ratchet up monotonically; short stops ratchet down monotonically. See
`crates/wickra-core/src/indicators/percentage_trailing_stop.rs`.

## Parameters

| Name      | Type  | Default | Constraint           | Description |
|-----------|-------|---------|----------------------|-------------|
| `percent` | `f64` | `5.0`   | finite, `> 0`        | Trail width as a percentage of the *latest* close. |

`PercentageTrailingStop::new` returns `Error::NonPositiveMultiplier`
for non-finite or non-positive `percent`.
`PercentageTrailingStop::classic()` returns the `5.0%` factory.

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Python:
`PercentageTrailingStop(percent).batch(close)` returns a 1-D
`array.array('d')` — no warmup `NaN`s because the indicator emits on the
first input. Node: same shape; `update(close)` returns `number`.

## Warmup

`warmup_period() == 1`. The first input seeds a long stop at
`close · (1 − percent/100)` and the indicator emits immediately.

## Edge cases

- **First bar.** Always seeds long with stop `percent` below seed
  close.
- **`close == 0.0`.** `step == 0`, so the stop equals the close.
  The next non-zero close triggers a normal flip evaluation.
- **Negative close.** `|close|` is used to compute `step`, so the
  trail width stays positive for short-side equity-equivalents
  (futures with negative prices, spread products). The indicator
  treats the trail conceptually as one-sided per state, not on a
  signed axis.
- **Flat tape.** A constant close holds the stop fixed; no flip.
- **Reset.** `reset()` clears `prev_stop` to `None` and resets the
  side flag to long.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, PercentageTrailingStop};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prices: Vec<f64> = (0..40).map(|i| 100.0 + f64::from(i)).collect();
    let mut p = PercentageTrailingStop::classic();
    let out = p.batch(&prices);
    println!("row 10 = {:?}", out[10]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

prices = 100 + np.arange(40, dtype=float)
p = ta.PercentageTrailingStop(5.0)
out = p.batch(prices)
print('warmup:', p.warmup_period())  # 1
print('row 10:', out[10])
```

### Node

```javascript
const wickra = require('wickra');

const p = new wickra.PercentageTrailingStop(5.0);
const prices = Array.from({ length: 40 }, (_, i) => 100 + i);
const out = p.batch(prices);
console.log('row 10:', out[10]);
```

### Streaming

```rust
use wickra::{Indicator, PercentageTrailingStop};

let mut p = PercentageTrailingStop::classic();
let close_stream: Vec<f64> = Vec::new(); // your live close-price feed
for close in close_stream {
    let stop = p.update(close).unwrap();
    // The indicator's internal `long` bit is private; infer from stop position.
    let side = if close > stop { "long" } else { "short" };
    println!("close={close:.4}  stop={stop:.4}  side={side}");
}
```

## Interpretation

- **Trail width is proportional to price.** `5%` means $5 on a $100
  stock and $50 on a $1000 stock; the indicator self-scales.
- **Symmetric flip behaviour.** Unlike one-sided trailing exits
  (e.g. [YoyoExit](/Indicators/Indicator-YoyoExit)), this indicator flips both
  ways: a long close-through opens a short, and vice versa.
- **Vs ATR trailing stops.** Percentage trails are constant in
  *relative* terms; ATR trails are constant in *volatility-scaled*
  terms. Pick percentage when the instrument's volatility is roughly
  proportional to its price (most equities), ATR when volatility
  regime drifts independently (commodities, futures rolls).

## Common pitfalls

- **Choosing percent without backtest evidence.** `5%` is a default,
  not a recipe. Intraday systems may need `0.5%` - `1.0%`; weekly
  swing systems may need `8%` - `15%`.
- **Forgetting the flip.** Many traders think of "trailing stop" as
  one-sided; this indicator goes short on every long-side
  stopout. If you only want long exits and no short positions, use
  [YoyoExit](/Indicators/Indicator-YoyoExit) instead.
- **Gap risk.** A gap-down through the long stop fills you at the
  gap close — the percentage trail provides no buffer.

## References

- Wilder's *New Concepts in Technical Trading Systems* (1978)
  discusses parameter-based stops; the explicit "percentage trail"
  pattern dates to broker-side software in the 1980s.

## See also

- [AtrTrailingStop](/Indicators/Indicator-AtrTrailingStop) — volatility-scaled
  cousin.
- [StepTrailingStop](/Indicators/Indicator-StepTrailingStop) — discrete-grid
  cousin.
- [SuperTrend](/Indicators/Indicator-SuperTrend) — `(HL2 ± mult·ATR)`-based
  flip stop.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
