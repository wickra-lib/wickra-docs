# VolatilityCone

> Volatility Cone — where the current realized volatility sits inside its own
> historical envelope (min / median / max / percentile) over a lookback window.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Volatility & Bands |
| Input type | `Candle` (close only) |
| Output type | `VolatilityConeOutput` `{ current, min, median, max, percentile }` |
| Output range | `current/min/median/max` in `[0, ∞)`; `percentile` in `[0, 100]` |
| Default parameters | `(window = 20, lookback = 60)` (Python) |
| Warmup period | `window + lookback` |
| Interpretation | `percentile` near 100 = volatility historically high; near 0 = historically low. |

## Formula

```
r_t   = ln(close_t / close_{t−1})
vol_t = stddev_sample(r over window)               (rolling realized volatility)
cone  = { min, median, max, percentile } of vol over the last `lookback`
```

A volatility cone (Burghardt & Lane 1990) judges volatility *relative to its own
history* instead of as an absolute number. This streaming form tracks one
horizon: it maintains the rolling realized volatility of log returns over
`window`, then reports the latest reading (`current`) alongside the `min`,
`median`, `max` and percentile rank of that volatility series over the trailing
`lookback`. Because `current` is the newest member of the lookback set, it always
lies within `[min, max]`. The `percentile` is the share of stored volatilities
`<= current`, times 100. Source:
`crates/wickra-core/src/indicators/volatility_cone.rs`.

Only the candle's **close** is used; high and low are ignored. The volatility is
per-period (sample stddev of log returns, not annualised).

## Parameters

| Name       | Type    | Default       | Valid range | Source | Description |
|------------|---------|---------------|-------------|--------|-------------|
| `window`   | `usize` | `20` (Python) | `>= 2`      | `volatility_cone.rs:102` | Realized-volatility estimation window. `0` → `Error::PeriodZero`; `1` → `Error::InvalidPeriod`. |
| `lookback` | `usize` | `60` (Python) | `>= 2`      | `volatility_cone.rs:102` | Number of volatility readings forming the historical cone. |

`windows` returns `(window, lookback)`; `value` returns the current
`VolatilityConeOutput` if ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/volatility_cone.rs`:

```rust
use wickra::{Candle, Indicator, VolatilityCone, VolatilityConeOutput};
// VolatilityCone: Input = Candle, Output = VolatilityConeOutput
const _: fn(&mut VolatilityCone, Candle) -> Option<VolatilityConeOutput> = <VolatilityCone as Indicator>::update;
```

A `Candle` in, an `Option<VolatilityConeOutput>` out. The Python binding takes a
candle for `update` and returns a 5-tuple `(current, min, median, max,
percentile)`; `batch(high, low, close)` returns an `(n, 5)` array (NaN warmup
rows). Node `update(high, low, close)` returns an object
`{ current, min, median, max, percentile }`; `batch(high[], low[], close[])`
returns a flat array of length `n * 5`. WASM mirrors Node with camelCase object
keys.

## Warmup

`warmup_period() == window + lookback`. One previous close seeds the first
return, `window` returns yield the first volatility, and `lookback` volatilities
are then needed for the cone — so the first non-`None` output lands on input
`window + lookback` (`first_emission_at_warmup_period` pins this).

## Edge cases

- **Known cone.** With `window = 2`, `lookback = 2` on `[100, 110, 121, 100]` the
  envelope is `{current, min, median, max, percentile}` =
  `{0.2022, 0.0, 0.1011, 0.2022, 100.0}` (`known_value` pins this).
- **`current` is bracketed.** `min <= current <= max` and
  `min <= median <= max` always hold (`envelope_brackets_current` pins this).
- **Odd lookback.** An odd `lookback` takes the middle of the sorted envelope as
  the median (`odd_lookback_median_is_middle` pins this).
- **Constant series.** A flat close series gives every volatility `0`, so the
  whole cone is `0` and the percentile is `100`
  (`constant_series_yields_zero_cone` pins this).
- **Non-positive close.** A log return is undefined when the close is `<= 0`;
  such ticks are **skipped**, state is left untouched, and the next valid tick
  re-anchors (`skips_non_positive_close`, `skips_non_positive_before_first_close`).
- **Reset.** `vc.reset()` clears both windows and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, VolatilityCone};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut vc = VolatilityCone::new(2, 2)?;
    let candles: Vec<Candle> = [100.0, 110.0, 121.0, 100.0]
        .iter()
        .map(|&c| Candle::new(c, c, c, c, 1_000.0, 0).unwrap())
        .collect();
    let out = vc.batch(&candles);
    println!("warmup_period = {}", vc.warmup_period());
    println!("{:?}", out.last().unwrap());
    Ok(())
}
```

Output:

```
warmup_period = 4
Some(VolatilityConeOutput { current: 0.20218342336724174, min: 0.0, median: 0.10109171168362087, max: 0.20218342336724174, percentile: 100.0 })
```

### Python

```python
import numpy as np
import wickra as ta

vc = ta.VolatilityCone(2, 2)
close = np.array([100.0, 110.0, 121.0, 100.0])
print(vc.batch(close, close, close)[-1])  # high/low unused -> reuse close
```

Output:

```
[  0.20218342   0.           0.10109171   0.20218342 100.        ]
```

### Node

```javascript
const ta = require('wickra');

const vc = new ta.VolatilityCone(20, 60);
console.log('warmupPeriod:', vc.warmupPeriod()); // 80
const close = Array.from({ length: 120 }, (_, i) => 100 + Math.sin(i * 0.3) * 5);
console.log(vc.update(7, 5, 6));        // null during warmup
const flat = vc.batch(close, close, close); // length 120 * 5
console.log(flat.slice(-5));            // [current, min, median, max, percentile]
```

### Streaming

```rust
use wickra::{Indicator, VolatilityCone};
use wickra::Candle;

let mut vc = VolatilityCone::new(20, 60).unwrap();
let mut last = None;
for i in 0..120 {
    let c = 100.0 + (f64::from(i) * 0.3).sin() * 5.0;
    last = vc.update(Candle::new(c, c + 1.0, c - 1.0, c, 1_000.0, 0).unwrap());
}
println!("{:?}", last.map(|o| o.percentile));
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

The cone answers "is volatility cheap or expensive right now?" without you having
to remember absolute levels:

1. **Mean-reversion timing.** A `percentile` near `100` (current at the top of
   the cone) flags historically extreme volatility that tends to revert; near `0`
   flags compression that often precedes expansion.
2. **Option richness.** Compare an option's implied volatility to where realized
   volatility sits in its cone: implied well above the `max` suggests rich
   options, below the `min` suggests cheap ones.
3. **Regime context.** The `min`/`median`/`max` band frames the current reading —
   a `current` hugging the `median` is an ordinary regime, one pinned to `max` a
   stressed one.

For a true multi-horizon cone, run several `VolatilityCone`s with different
`window`s (e.g. 10/20/60/120) and read the percentiles together.

## Common pitfalls

- **Warmup is the sum of the windows.** With `(20, 60)` you need `80` bars before
  the first reading.
- **`percentile` includes the current bar.** Because `current` is in the lookback
  set, the percentile is never exactly `0`; the minimum possible is
  `100 / lookback`.
- **Per-period volatility.** Like
  [`RealizedVolatility`](/Indicators/Indicator-RealizedVolatility), no `√252`
  scaling is applied — annualise downstream if needed.
- **Single horizon.** This tracks one `window`; a classic cone plots several
  maturities side by side.

## References

Burghardt, G., & Lane, M. (1990), "How to Tell If Options Are Cheap," *Journal of
Portfolio Management* 16(2), 72–78 — the volatility-cone construction.

## See also

- [Indicator-HistoricalVolatility](/Indicators/Indicator-HistoricalVolatility) — the annualised realized-volatility level.
- [Indicator-VolatilityOfVolatility](/Indicators/Indicator-VolatilityOfVolatility) — dispersion of the volatility series.
- [Indicator-BollingerBandwidth](/Indicators/Indicator-BollingerBandwidth) — a related volatility-compression gauge.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
