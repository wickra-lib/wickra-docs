# TtmTrend

> TTM Trend — John Carter's bar-coloring filter: is the close above or below the
> average of recent median prices?

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trend & Directional |
| Input type | `Candle` (uses high, low, close) |
| Output type | `f64` |
| Output range | `{+1.0, -1.0}` (regime label) |
| Default parameters | `period` is required (Carter uses 6) |
| Warmup period (`warmup_period()`) | `period` |
| Interpretation | `+1` uptrend bar, `-1` downtrend bar — a trend on/off filter. |

## Formula

```
reference = SMA((high + low) / 2, period)
TtmTrend  = +1  if close > reference
            -1  otherwise
```

TTM Trend colors each bar by comparing its close to the simple moving average of
the recent median prices. A close above that reference paints an uptrend bar
(`+1`); a close at or below it a downtrend bar (`-1`). It is a regime label, not
a level — strong, persistent runs of one sign mark a trending market, while
rapid alternation marks chop.

Source: `crates/wickra-core/src/indicators/ttm_trend.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | 6       | `>= 1`      | `ttm_trend.rs:52` | Lookback for the median-price average. `0` errors with `Error::PeriodZero`. |

(Python class `wickra.TTM_TREND(period)`; Node `new ta.TTM_TREND(period)`.)

## Inputs / Outputs

From `crates/wickra-core/src/indicators/ttm_trend.rs`:

```rust
use wickra::{Candle, Indicator, TtmTrend};
// TtmTrend: Input = Candle, Output = f64
const _: fn(&mut TtmTrend, Candle) -> Option<f64> = <TtmTrend as Indicator>::update;
```

The indicator reads only the high, low and close, so the batch bindings take
those three columns. Node: `update(high, low, close)` / `batch(h[], l[], c[])`.
Python: `update(candle)` (a full candle object) / `batch(high, low, close)` →
`array.array('d')` (`NaN` for warmup). Node returns `number | null` /
`Array<number>` with `NaN`.

## Warmup

`warmup_period()` returns `period`: the inner SMA of median prices needs
`period` bars before the first label (bar `period`, index `period − 1`). Pinned
by `accessors_and_metadata` (`warmup_period() == 6`) and `warmup_then_emits`.

## Edge cases

- **Uptrend label.** `close_above_reference_is_uptrend` holds the median at `10`
  with a close of `12`; the reference is `10` and `12 > 10` → `+1`.
- **Downtrend label (equality).** `close_at_or_below_reference_is_downtrend`
  holds median and close both at `10`; the close is *not strictly above* the
  reference, so the bar is `-1`. The comparison is strict `>`.
- **Reset.** `reset_clears_state` clears the inner SMA.
- **Streaming/batch:** `batch_equals_streaming`.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, TtmTrend};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = TtmTrend::new(3)?;
    let bars = [
        Candle::new(10.0, 13.0, 9.0, 12.0, 1.0, 0)?,
        Candle::new(10.0, 13.0, 9.0, 12.0, 1.0, 1)?,
        Candle::new(10.0, 13.0, 9.0, 12.0, 1.0, 2)?,
    ];
    for v in t.batch(&bars).into_iter().flatten() {
        println!("{v}");
    }
    Ok(())
}
```

Output:

```
1
```

The median `(13 + 9) / 2 = 11` is constant, so the SMA(3) reference is `11`; the
close `12` is above it → `+1`.

### Python

```python
import numpy as np
import wickra as ta

t = ta.TTM_TREND(3)
hi = np.array([13.0, 13.0, 13.0])
lo = np.array([9.0, 9.0, 9.0])
cl = np.array([12.0, 12.0, 12.0])
print(t.batch(hi, lo, cl))   # NaN, NaN, 1.0
```

Output:

```
[nan nan  1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.TTM_TREND(3);
const high = [13, 13, 13];
const low = [9, 9, 9];
const close = [12, 12, 12];
console.log(t.batch(high, low, close)); // [ NaN, NaN, 1 ]
```

Output:

```
[ NaN, NaN, 1 ]
```

### Streaming

```rust
use wickra::{Candle, Indicator, TtmTrend};

let mut t = TtmTrend::new(6)?;
let mut last = None;
for i in 0..40 {
    let base = 100.0 + f64::from(i);
    last = t.update(Candle::new(base, base + 1.0, base - 1.0, base + 0.5, 1.0, i64::from(i))?);
}
println!("{last:?}");
# Ok::<(), Box<dyn std::error::Error>>(())
```

## Interpretation

TTM Trend is a binary trend filter, most useful as a gate on other signals:

1. **Trend gate.** Take long setups only while TTM Trend is `+1`, shorts only
   while it is `-1`.
2. **Persistence = trend strength.** Long unbroken runs of one sign indicate a
   sustained trend; frequent flips mark a choppy, range-bound regime.
3. **Flip = candidate reversal.** A change of sign is an early heads-up that the
   close has crossed the recent value area.

## Common pitfalls

- **Whipsaw in chop.** In a flat market the close oscillates around the
  reference and the label flips bar-to-bar; pair it with a volatility or
  range filter.
- **Lag from the period.** A longer `period` smooths the reference but delays
  the flip; the trade-off is the usual smoothness-vs-lag balance.

## References

John Carter, *Mastering the Trade*, 2005 — the TTM Trend bar-coloring system.

## See also

- [Indicator-SuperTrend](/Indicators/Indicator-SuperTrend) — another trend on/off filter, ATR-banded.
- [Indicator-TrendLabel](/Indicators/Indicator-TrendLabel) — a regime label from a different construction.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
