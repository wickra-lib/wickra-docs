# Value Area (POC / VAH / VAL)

> Market-profile-style volume distribution. Buckets the last
> `period` candles' volumes into `bin_count` price bins (each bar's
> volume spread uniformly across its `[low, high]` range), finds the
> Point of Control (highest-volume bin), then expands outward from
> the POC until the configured percentage of total volume (default
> 70%) is enclosed — Value Area High (VAH) and Value Area Low (VAL).

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Market Profile                                                       |
| Input type          | `Candle` (uses `high`, `low`, `volume`)                              |
| Output type         | `ValueAreaOutput { poc, vah, val }`                                  |
| Output range        | unbounded (price-units)                                              |
| Default parameters  | `period`, `bin_count`, `value_area_pct` (typical `(20, 50, 0.70)`)   |
| Warmup period       | `period`                                                             |
| Interpretation      | Volume-weighted "fair value" zone over recent history                 |

## Formula

```
1. Spread each candle's volume uniformly across [low, high]
   among bin_count fixed price bins.
2. POC = price of bin with maximum cumulative volume.
3. Starting at POC, alternately absorb the higher-volume neighbour
   above or below the current Value Area until the absorbed volume
   reaches value_area_pct · total_volume.
4. VAH = upper boundary of absorbed bins; VAL = lower boundary.
```

Single-print bars (`low == high`) dump their whole volume into a
single bin. See `crates/wickra-core/src/indicators/value_area.rs`.

## Parameters

| Name             | Type    | Default | Constraint           | Description |
|------------------|---------|---------|----------------------|-------------|
| `period`         | `usize` | none    | `> 0`                | Rolling window of candles. |
| `bin_count`      | `usize` | none    | `> 1`                | Number of price bins. |
| `value_area_pct` | `f64`   | none    | finite, `(0, 1]`     | Target volume fraction (`0.70` = classic 70%). |

`ValueArea::new` returns `Error::InvalidPeriod` for out-of-range
parameters.

## Inputs / Outputs

`Indicator<Input = Candle, Output = ValueAreaOutput>` with three
fields. Python: `(n, 3)` array; Node: flat `number[]` of length
`n * 3`.

## Warmup

`warmup_period() == period`. The bin distribution needs the full
window to stabilise.

## Edge cases

- **Single-print bars.** `low == high` dumps full volume into one
  bin; no spreading needed.
- **Bin resolution.** Higher `bin_count` increases price precision
  but slows computation.
- **Volume = 0 candle.** Contributes nothing; doesn't change the
  distribution.
- **Reset.** Clears the rolling window.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, ValueArea};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..50).map(|i| {
        let b = 100.0 + (f64::from(i) * 0.3).sin() * 3.0;
        Candle::new(b, b + 1.0, b - 1.0, b, 10.0, i as i64).unwrap()
    }).collect();
    let mut va = ValueArea::new(20, 50, 0.70)?;
    if let Some(o) = va.batch(&candles)[30] {
        println!("POC={}  VAH={}  VAL={}", o.poc, o.vah, o.val);
    }
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

n = 50
base = 100 + np.sin(np.linspace(0, 15, n)) * 3
candles_h = base + 1
candles_l = base - 1
candles_v = np.full(n, 10.0)

va = ta.ValueArea(20, 50, 0.70)
print(va.batch(candles_h, candles_l, candles_v))  # (n, 3): [poc, vah, val]
```

### Node

```javascript
const wickra = require('wickra');
const va = new wickra.ValueArea(20, 50, 0.70);
// ... high, low, volume arrays
```

### Streaming

```rust
use wickra::{Candle, Indicator, ValueArea};

let mut va = ValueArea::new(78, 100, 0.70).unwrap();  // ~1 day on 5-min bars
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if let Some(o) = va.update(bar) {
        // POC = "magnet" price; VAH/VAL = boundaries of fair-value zone
    }
}
```

## Interpretation

- **POC.** The price level where the most volume traded — a
  "magnet" that price tends to revisit. High-frequency
  mean-reversion systems target the POC.
- **VAH / VAL.** Boundaries of the fair-value zone. Price
  trading outside VAH or below VAL signals "out-of-value" — a
  potential trend day or breakout setup.
- **Vs. session-level Market Profile.** This is a *rolling*
  Value Area, not the session-anchored TPO profile from
  Steidlmayer's original work. Useful for continuous adaptive
  fair-value reference.

## Common pitfalls

- **Bin resolution mismatch.** `bin_count = 10` with high-priced
  instruments → coarse POC. `bin_count = 200` on low-priced
  → over-resolution. Match bin count to typical price range.
- **Period choice.** Too short → noisy POC; too long → stale
  POC. ~1-day equivalent on the timeframe is typical.
- **Volume sensitivity.** Outlier high-volume bars dominate the
  distribution. Pre-filter or cap if necessary.

## References

- J. Peter Steidlmayer & Steven B. Hawkins, *Steidlmayer on
  Markets* (2003) — formal Market Profile / Value Area
  treatment.

## See also

- [InitialBalance](/Indicators/Indicator-InitialBalance) — first-bars range.
- [OpeningRange](/Indicators/Indicator-OpeningRange) — opening-range
  breakout reference.
- [Vwap](/Indicators/Indicator-Vwap) — closely-related volume-weighted
  price.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
