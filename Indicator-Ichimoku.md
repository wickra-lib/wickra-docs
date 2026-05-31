# Ichimoku Kinko Hyo

> The five-line Ichimoku cloud chart. Bundles Tenkan-sen,
> Kijun-sen, Senkou Span A, Senkou Span B, and Chikou Span into a
> single indicator output. The two Senkou Spans form the **Kumo**
> (cloud) which acts as dynamic support/resistance; Chikou shows
> the close of the *current* bar lagged backwards onto the chart.
> Standard parameters are `(9, 26, 52, 26)`.

## Quick reference

| Item                | Value                                                                                                       |
|---------------------|-------------------------------------------------------------------------------------------------------------|
| Family              | Ichimoku & Charts                                                                                            |
| Input type          | `Candle`                                                                                                    |
| Output type         | `IchimokuOutput { tenkan, kijun, senkou_a, senkou_b, chikou: Option<f64> }`                                 |
| Output range        | unbounded (price-units)                                                                                     |
| Default parameters  | `tenkan = 9`, `kijun = 26`, `senkou_b = 52`, `displacement = 26`                                            |
| Warmup period       | `senkou_b_period + displacement - 1` (77 at defaults)                                                       |
| Interpretation      | Multi-line trend / support / resistance system; price above cloud = bull, below = bear                       |

## Formula

```
tenkan_t   = (max(high, tenkan_period) + min(low, tenkan_period)) / 2
kijun_t    = (max(high, kijun_period)  + min(low, kijun_period))  / 2

leading_a_t = (tenkan_t + kijun_t) / 2
leading_b_t = (max(high, senkou_b_period) + min(low, senkou_b_period)) / 2

// What's visible at step t:
senkou_a_visible_t = leading_a_{t - displacement}
senkou_b_visible_t = leading_b_{t - displacement}
chikou_visible_t   = close_{t - displacement}
```

The two Senkou spans are computed at time `t - displacement` and
displayed at time `t` — the indicator emits the *visible* values
(i.e. lagged), which matches every TA library that processes
candles in chronological order. See
`crates/wickra-core/src/indicators/ichimoku.rs`.

## Parameters

| Name              | Type    | Default | Constraint | Description |
|-------------------|---------|---------|------------|-------------|
| `tenkan_period`   | `usize` | `9`     | `> 0`      | Conversion-line midpoint window. |
| `kijun_period`    | `usize` | `26`    | `> 0`      | Base-line midpoint window. |
| `senkou_b_period` | `usize` | `52`    | `> 0`      | Leading Span B midpoint window. |
| `displacement`    | `usize` | `26`    | `> 0`      | Forward shift for Senkou A/B and backward shift for Chikou. |

`Ichimoku::new` returns `Error::PeriodZero` for any zero argument.
`Ichimoku::classic()` returns the `(9, 26, 52, 26)` factory.

## Inputs / Outputs

`Indicator<Input = Candle, Output = IchimokuOutput>` with five
`Option<f64>` fields. Any field that doesn't have enough history is
`None` independently — Tenkan can emit while Senkou B is still
`None`, etc.

- **Python.** `Ichimoku(...).batch(high, low, close)` returns an
  `(n, 5)` `float64` array with columns
  `[tenkan, kijun, senkou_a, senkou_b, chikou]`; `NaN` for `None`.
- **Node.** Flat `number[]` of length `n * 5`; streaming
  `update(candle)` returns `{ tenkan, kijun, senkouA, senkouB,
  chikou } | null`.

## Warmup

`warmup_period() == senkou_b_period + displacement − 1`. At
defaults that's `52 + 26 − 1 = 77` — Senkou B needs its own 52-bar
midpoint **and** a 26-bar history of those midpoints to displace
from. Intermediate fields fill earlier:

- `tenkan`: `tenkan_period` bars.
- `kijun`: `kijun_period` bars.
- `senkou_a` (visible): requires `kijun_period + displacement − 1`
  bars (`51` at defaults).
- `senkou_b` (visible): requires `senkou_b_period + displacement
  − 1` bars (`77`).
- `chikou`: `displacement + 1` bars.

## Edge cases

- **Insufficient history.** Each field is independently `None`
  until its own backing window has filled; the multi-field
  output gracefully reflects partial availability.
- **Constant input.** All five lines converge to the constant
  (`tenkan` and `kijun` equal the midpoint of the constant
  high/low pair).
- **Reset.** Clears all rolling buffers and the candle history.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Ichimoku, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..100).map(|i| {
        let b = 100.0 + (f64::from(i) * 0.2).sin() * 5.0;
        Candle::new(b, b + 1.0, b - 1.0, b, 1.0, i as i64).unwrap()
    }).collect();
    let mut ich = Ichimoku::classic();
    if let Some(o) = ich.batch(&candles)[80] {
        println!("tenkan={:?} kijun={:?} senkou_a={:?}",
                 o.tenkan, o.kijun, o.senkou_a);
    }
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

t = np.arange(100)
base = 100 + np.sin(t * 0.2) * 5
high = base + 1
low  = base - 1
close = base

ich = ta.Ichimoku(9, 26, 52, 26)
out = ich.batch(high, low, close)
print('shape:', out.shape)  # (100, 5)
print('row 80:', out[80])  # tenkan, kijun, senkou_a, senkou_b, chikou
```

### Node

```javascript
const wickra = require('wickra');
const ich = new wickra.Ichimoku(9, 26, 52, 26);
const t = Array.from({ length: 100 }, (_, i) => i);
const base = t.map(i => 100 + Math.sin(i * 0.2) * 5);
const flat = ich.batch(base.map(b => b + 1), base.map(b => b - 1), base);
console.log('row 80 tenkan:', flat[80 * 5 + 0]);
console.log('row 80 kijun :', flat[80 * 5 + 1]);
```

### Streaming

```rust
use wickra::{Candle, Ichimoku, Indicator};

let mut ich = Ichimoku::classic();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if let Some(o) = ich.update(bar) {
        // Cloud-state classification
        if let (Some(a), Some(b)) = (o.senkou_a, o.senkou_b) {
            let above_cloud = bar.close > a.max(b);
            let below_cloud = bar.close < a.min(b);
            // ...
        }
    }
}
```

## Interpretation

- **Cloud (Kumo).** Bounded above by `max(senkou_a, senkou_b)` and
  below by `min(...)`. Price above the cloud = bullish; below =
  bearish; inside = neutral / consolidation. Cloud thickness
  reflects regime strength.
- **Tenkan / Kijun cross.** Tenkan above Kijun = short-term
  bullish; Tenkan crossing above Kijun = bullish trigger.
  Symmetric for sell.
- **Chikou.** Confirms momentum — Chikou above prior price action
  = bullish confirmation.
- **Cloud twist (Senkou A crosses B).** Foreshadows a future
  trend shift. Because Senkou spans are displaced forward by
  `displacement` bars in their *target* representation, a visible
  twist today happened in the underlying data `displacement` bars
  ago — read carefully.

## Common pitfalls

- **Conflating forward and backward shifts.** Senkou Spans are
  displaced forward (shown ahead of the current bar);
  Chikou backward (shown behind). Wickra emits the values that
  are *visible at the current bar* — i.e. the lagged versions.
- **Reading partial output.** Tenkan can be `Some` while Senkou B
  is `None` — each field is independent. Downstream code must
  check each `Option` separately.
- **Long warmup.** 77 bars at defaults. Backtests on short data
  see mostly warmup.

## References

- Goichi Hosoda (publishing as "Ichimoku Sanjin"), 1968 — original
  Japanese-language treatment.
- Manesh Patel, *Trading with Ichimoku Clouds* (2010) — modern
  English-language reference.

## See also

- [HeikinAshi](Indicator-HeikinAshi) — paired Japanese-charting
  transform.
- [SuperTrend](Indicator-SuperTrend) — alternative
  trend-and-stop system.
- [BollingerBands](Indicator-BollingerBands) — Western analogue
  for dynamic support/resistance.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
