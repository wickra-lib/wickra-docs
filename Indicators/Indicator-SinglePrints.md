# SinglePrints

> The count of price levels touched by exactly one bar — Market Profile "single
> prints" that mark fast, low-acceptance moves.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Market Profile |
| Input type | `Candle` (high / low) |
| Output type | `f64` (count) |
| Output range | `[0, bins]` |
| Default parameters | `(period = 20, bins = 24)` (Python) |
| Warmup period | `period` |
| Interpretation | High = fast/trending (low rotation); low = balanced range. |

## Formula

```
for each of `bins` price levels over the last `period` candles:
  touches = number of bars whose high-low range covers that level
SinglePrints = count of levels with touches == 1
```

A "single print" is a price the market traded through so fast that only one
time-period printed there — a footprint of an aggressive, one-sided move with
little two-way trade. Single prints often act as S/R on a retest and mark the
edges of rapid moves. The count gauges how much of the range was traversed without
acceptance. Source: `crates/wickra-core/src/indicators/single_prints.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `20` (Python) | `>= 1`      | `single_prints.rs:56` | Rolling profile window. |
| `bins`   | `usize` | `24` (Python) | `>= 1`      | `single_prints.rs:56` | Price levels. `0` for either errors with `Error::PeriodZero`. |

`params()` returns `(period, bins)`; `value` returns the current count if ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/single_prints.rs`:

```rust
use wickra::{Candle, Indicator, SinglePrints};
// SinglePrints: Input = Candle, Output = f64
const _: fn(&mut SinglePrints, Candle) -> Option<f64> = <SinglePrints as Indicator>::update;
```

A `Candle` in, an `Option<f64>` out (a count). Python `update(candle)` / `batch(high,
low)`; Node `update(high, low)` / `batch(...)`.

## Warmup

`warmup_period() == period`. The profile window must fill first
(`first_emission_at_warmup_period` pins this).

## Edge cases

- **Flat range → 0.** A zero-span window has no single prints
  (`flat_range_has_no_single_prints` pins this).
- **Ramp → many.** A one-directional ramp visits most levels once
  (`ramp_has_many_single_prints` pins this).
- **Non-negative.** The count is `>= 0` (`output_non_negative` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `s.reset()` clears the window and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, SinglePrints};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut s = SinglePrints::new(10, 24)?;
    let candles: Vec<Candle> = (0..10)
        .map(|i| { let b = 100.0 + f64::from(i); Candle::new(b, b + 0.5, b - 0.5, b, 1_000.0, 0).unwrap() })
        .collect();
    println!("single prints: {}", s.batch(&candles).last().unwrap().unwrap());
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

s = ta.SinglePrints(20, 24)
high = np.arange(40.0) + 100.5; low = np.arange(40.0) + 99.5
print(s.batch(high, low)[-1])  # number of single-print levels
```

### Node

```javascript
const ta = require('wickra');
const s = new ta.SinglePrints(20, 24);
console.log('warmupPeriod:', s.warmupPeriod()); // 20
```

### Streaming

```rust
use wickra::{Candle, Indicator, SinglePrints};

let mut s = SinglePrints::new(20, 24).unwrap();
for candle in feed {
    if let Some(n) = s.update(candle) {
        // n high -> fast, low-rotation move; expect retests of the single-print zone
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Move quality.** Many single prints = a fast, emotional move; expect it to be
   revisited ("repaired") later.
2. **Support/resistance.** The single-print zone often halts a retest — a fade or
   continuation decision point.
3. **Regime.** A collapsing single-print count signals the market is balancing and
   accepting price.

## Common pitfalls

- **TPO vs. range.** This counts touches by bar *range*, a practical proxy for the
  classic TPO single print.
- **Bin resolution.** Finer bins create more single prints; keep `bins` consistent
  when comparing.
- **Session framing.** Set `period` to a session for traditional reads.

## References

Steidlmayer, J. P. — Market Profile; Dalton, J. F. (1993), *Mind Over Markets*
(single prints and range extension).

## See also

- [Indicator-TpoProfile](/Indicators/Indicator-TpoProfile) — the time-price-opportunity profile.
- [Indicator-HighLowVolumeNodes](/Indicators/Indicator-HighLowVolumeNodes) — HVN/LVN levels.
- [Indicator-ValueArea](/Indicators/Indicator-ValueArea) — the value area.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
