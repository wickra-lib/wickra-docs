# ZigZag

> A non-repainting percent-threshold swing detector. Tracks the most
> recent extreme (high or low) and confirms a reversal once price
> has moved the configured percentage away from it. Emits
> `Some(swing)` only on the bar where a reversal is confirmed,
> returning the price and direction of the just-completed extreme.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Pivots & S/R                                                         |
| Input type          | `Candle` (uses `high`, `low`, `close`)                               |
| Output type         | `ZigZagOutput { swing: f64, direction: f64 }` (`+1.0` = high, `-1.0` = low) |
| Output range        | price-units; direction is `±1.0`                                     |
| Default parameters  | `threshold` is required (typical `0.05` = 5%)                        |
| Warmup period       | `2` — first bar bootstraps state; emission only on confirmation       |
| Interpretation      | Marks confirmed swing pivots only — not a per-bar signal              |

## Formula

```
uptrend (last swing was a low):
    while highs make new highs, keep updating the pivot high
    once close (or low) drops by ≥ threshold·high → confirm pivot high

downtrend (last swing was a high):
    while lows make new lows, keep updating the pivot low
    once close (or high) rises by ≥ threshold·low → confirm pivot low
```

The threshold is a fractional change (`0.05` ≈ 5%); must be
strictly positive and below `1.0`. The price reported in the output
is the actual extreme that the swing turns from — not the bar that
triggered confirmation. See
`crates/wickra-core/src/indicators/zig_zag.rs`.

## Parameters

| Name        | Type  | Default | Constraint           | Description |
|-------------|-------|---------|----------------------|-------------|
| `threshold` | `f64` | none    | finite, `(0, 1)`     | Fractional reversal threshold (e.g. `0.05` for 5%). |

`ZigZag::new` returns `Error::InvalidPeriod` for non-finite,
non-positive, or `>= 1.0` thresholds.

## Inputs / Outputs

`Indicator<Input = Candle, Output = ZigZagOutput>` with two fields:

| Field       | Description |
|-------------|-------------|
| `swing`     | Price of the confirmed swing extreme. |
| `direction` | `+1.0` for a high swing, `-1.0` for a low swing. |

- **Python.** `ZigZag(threshold).batch(high, low, close)` returns
  an `(n, 2)` `float64` array — `NaN` where no swing was confirmed.
- **Node.** Flat `number[]` of length `n * 2`; streaming
  `update(candle)` returns `{ swing, direction } | null`.

## Warmup

`warmup_period() == 2`. The first bar bootstraps reference price
state; emissions only happen on confirmation bars, which may be
many bars later — most bars return `None`.

## Edge cases

- **Sparse output.** Most bars return `None`. Only bars where a
  reversal is *confirmed* emit a value. On low-volatility runs you
  may go dozens of bars without an emission.
- **Non-repainting.** Once confirmed, a swing is fixed. Many naive
  ZigZag implementations repaint (move the most recent swing as
  new extremes appear); Wickra's does not.
- **Lag between swing and confirmation.** The reported `swing`
  price was set at some earlier bar; the emission lands on the bar
  where the `threshold`-percentage move away from that swing is
  observed. Practically, you find out about the swing some bars
  after it actually happened.
- **Threshold near 0 or 1.** Rejected by validation; `0.001` is
  hyper-active (lots of swings), `0.5` is essentially trend-only.
- **Reset.** `reset()` clears the swing state and the bootstrap
  flag.

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, ZigZag};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut zz = ZigZag::new(0.10)?;  // 10% threshold
    for (i, p) in [100.0, 105.0, 115.0, 100.0, 90.0, 100.0].iter().enumerate() {
        let c = Candle::new(*p, *p + 0.5, *p - 0.5, *p, 1.0, i as i64)?;
        if let Some(swing) = zz.update(c) {
            let kind = if swing.direction > 0.0 { "high" } else { "low" };
            println!("bar {}: confirmed swing {} at {:.2}", i, kind, swing.swing);
        }
    }
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

# Price series with a clear swing
p = np.array([100.0, 105.0, 115.0, 100.0, 90.0, 100.0])
zz = ta.ZigZag(0.10)
out = zz.batch(p + 0.5, p - 0.5, p)  # high, low, close
print(out)  # NaN on bars without confirmation
```

### Node

```javascript
const wickra = require('wickra');
const zz = new wickra.ZigZag(0.10);
const p = [100.0, 105.0, 115.0, 100.0, 90.0, 100.0];
const flat = zz.batch(
  p.map(x => x + 0.5),
  p.map(x => x - 0.5),
  p,
);
console.log(flat);  // pairs of [swing, direction] or [NaN, NaN]
```

### Streaming

```rust
use wickra::{Candle, Indicator, ZigZag};

let mut zz = ZigZag::new(0.05).unwrap();
let mut last: Option<(f64, f64)> = None;
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if let Some(o) = zz.update(bar) {
        last = Some((o.swing, o.direction));
        // Use as dynamic structural pivot
    }
}
```

## Interpretation

- **Structural skeleton.** ZigZag traces the major swing highs
  and lows of price action — useful as input to higher-level
  pattern recognition (head-and-shoulders, Elliott waves,
  trendlines).
- **Trend filter.** A series of higher swing highs and higher
  lows = uptrend. A series of lower highs and lower lows =
  downtrend. The threshold controls how much you smooth away
  minor pullbacks.
- **Threshold choice.** Equity intraday: `0.5%`-`2%`. Equity
  daily: `3%`-`10%`. Crypto: `5%`-`20%`. Higher threshold = fewer,
  larger swings.

## Common pitfalls

- **Trading on the emission bar.** The emission tells you a swing
  was already confirmed — the actual extreme happened many bars
  earlier. ZigZag is for *structure*, not real-time entries.
- **Repainting expectations.** Common in retail platforms but not
  here. Wickra's ZigZag never moves a confirmed swing.
- **Threshold too tight.** `threshold = 0.005` on a low-volatility
  instrument produces ZigZag noise — every micro-bounce is a
  swing. Match threshold to the bar timeframe and instrument
  volatility.

## References

- ZigZag dates to floor traders' hand-drawn swing pivots; no
  single attributed inventor. Documented in most technical
  analysis surveys; Martin Pring's *Technical Analysis Explained*
  (1991) covers a clear formulation.

## See also

- [WilliamsFractals](/Indicators/Indicator-WilliamsFractals) — alternative
  swing detector based on 5-bar pattern.
- [ClassicPivots](/Indicators/Indicator-ClassicPivots) — session-fixed pivots.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
