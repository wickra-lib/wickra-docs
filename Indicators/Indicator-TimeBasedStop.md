# TimeBasedStop

> A holding-period timer — it ignores price entirely and fires after a fixed
> number of bars, reporting the fraction of the window elapsed.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trailing Stops |
| Input type | `Candle` (price ignored; only bars are counted) |
| Output type | `f64` |
| Output range | `[0, 1]` (`1.0` = stop fired) |
| Default parameters | `(max_bars = 10)` (Python) |
| Warmup period | `1` |
| Interpretation | `value == 1.0` → holding period elapsed, exit. |

## Formula

```
bars_held increments by 1 each bar (since the last reset)
progress  = min(bars_held / max_bars, 1.0)
stop fires when progress == 1.0  (bars_held >= max_bars)
```

A time stop closes a position that has overstayed its thesis — a mean-reversion
entry that has not reverted, or an event trade past its catalyst — regardless of
price. This indicator is a pure timer: it ignores the candle's OHLC and reports
how much of the `max_bars` holding window has elapsed, reaching `1.0` when the
stop fires. **Reset it on each entry** so the count starts from the position open.
Source: `crates/wickra-core/src/indicators/time_based_stop.rs`.

## Parameters

| Name       | Type    | Default | Valid range | Source | Description |
|------------|---------|---------|-------------|--------|-------------|
| `max_bars` | `usize` | `10`    | `>= 1`      | `time_based_stop.rs:46` | Holding period in bars before the stop fires. `0` errors with `Error::PeriodZero`. |

`max_bars()` returns the window; `bars_held()` the current count; `triggered()`
whether the stop has fired; `value` the current progress if ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/time_based_stop.rs`:

```rust
use wickra::{Candle, Indicator, TimeBasedStop};
// TimeBasedStop: Input = Candle, Output = f64
const _: fn(&mut TimeBasedStop, Candle) -> Option<f64> = <TimeBasedStop as Indicator>::update;
```

A `Candle` in (its prices are unused), an `Option<f64>` out. The Python binding
takes a candle for `update` and any single column (e.g. `close`) for `batch` —
only its length matters; Node takes `update(...)` and `batch(close[])`. With
`warmup_period == 1` there is no NaN prefix.

## Warmup

`warmup_period() == 1`. The first bar emits `1 / max_bars`
(`progress_climbs_to_one` pins this).

## Edge cases

- **Linear progress.** Each bar adds `1 / max_bars` until `1.0`
  (`progress_climbs_to_one` pins this).
- **Trigger.** `triggered()` becomes `true` exactly at `max_bars` bars
  (`triggers_after_max_bars` pins this).
- **Saturation.** Beyond `max_bars` the progress stays clamped at `1.0`
  (`progress_saturates_at_one` pins this).
- **Reset restarts.** `reset()` returns the timer to zero so the next entry starts
  fresh (`reset_restarts_timer` pins this).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, TimeBasedStop};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = TimeBasedStop::new(4)?;
    let c = Candle::new(100.0, 101.0, 99.0, 100.0, 1.0, 0)?;
    println!("{:?}", t.batch(&[c, c, c, c]));
    Ok(())
}
```

Output:

```
[Some(0.25), Some(0.5), Some(0.75), Some(1.0)]
```

### Python

```python
import numpy as np
import wickra as ta

t = ta.TimeBasedStop(4)
close = np.full(4, 100.0)   # only the length matters
print(t.batch(close))       # [0.25 0.5  0.75 1.  ]
```

### Node

```javascript
const ta = require('wickra');

const t = new ta.TimeBasedStop(4);
console.log(t.batch([100, 100, 100, 100])); // [0.25, 0.5, 0.75, 1]
```

### Streaming

```rust
use wickra::{Candle, Indicator, TimeBasedStop};

let mut t = TimeBasedStop::new(5).unwrap();
let c = Candle::new(100.0, 101.0, 99.0, 100.0, 1.0, 0).unwrap();
for _ in 0..5 {
    if t.update(c) == Some(1.0) { println!("time stop fired"); }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Overlay on an entry.** Reset at the entry bar; close the position when
   `value` hits `1.0`.
2. **Progress as urgency.** The `[0, 1]` reading doubles as a "how stale is this
   trade" gauge you can blend with other exits.
3. **Combine, don't replace.** A time stop is usually paired with a price stop;
   whichever fires first wins.

## Common pitfalls

- **Must be reset per entry.** Without a reset at each position open the timer
  keeps counting from construction and fires on the wrong bar.
- **Price-blind by design.** It will exit a winning trade if the clock runs out —
  that is the point.
- **Bar definition matters.** "Bars" are whatever you feed it; align the timeframe
  with your holding-period intent.

## References

Time-based exits are a standard risk-management building block; see Kaufman, P. J.
(2013), *Trading Systems and Methods*, and Pardo, R. (2008), *The Evaluation and
Optimization of Trading Strategies*.

## See also

- [Indicator-AtrRatchet](/Indicators/Indicator-AtrRatchet) — a time-tightening price stop.
- [Indicator-PercentageTrailingStop](/Indicators/Indicator-PercentageTrailingStop) — fixed-percent exit.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
