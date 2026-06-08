# CentralPivotRange

> The pivot point plus its two central lines — the width of the range forecasts a
> trending vs. range-bound session.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Pivots & S/R |
| Input type | `Candle` (a completed period bar) |
| Output type | `CentralPivotRangeOutput { pivot, tc, bc }` |
| Output range | price units; `tc >= bc` |
| Default parameters | None (parameter-free) |
| Warmup period | `1` |
| Interpretation | Narrow CPR → trend day; wide CPR → range day. |

## Formula

```
pivot = (high + low + close) / 3
bc'   = (high + low) / 2
tc'   = 2·pivot − bc'
TC    = max(tc', bc'),   BC = min(tc', bc')
```

Feed the **previous** completed bar (daily/weekly). The headline read is the width
`TC − BC`: a narrow range means a small balance area and a likely trending
session, a wide range means a balanced, range-bound one. The raw `tc'`/`bc'` are
symmetric about the pivot; the output labels the larger `TC` and the smaller `BC`
so ordering always holds. Source:
`crates/wickra-core/src/indicators/central_pivot_range.rs`.

## Parameters

| Name | Type | Default | Valid range | Source | Description |
|------|------|---------|-------------|--------|-------------|
| — | — | — | — | None. | The CPR is parameter-free; `CentralPivotRange::new()` is infallible. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/central_pivot_range.rs`:

```rust
use wickra::{Candle, Indicator, CentralPivotRange, CentralPivotRangeOutput};
// CentralPivotRange: Input = Candle, Output = CentralPivotRangeOutput
const _: fn(&mut CentralPivotRange, Candle) -> Option<CentralPivotRangeOutput> =
    <CentralPivotRange as Indicator>::update;
```

A `Candle` in, an `Option<CentralPivotRangeOutput>` out. The Python binding returns
a `(pivot, tc, bc)` tuple from `update` and an `(n, 3)` array from `batch(high,
low, close)`; Node returns `{ pivot, tc, bc }` and a flat `Float64Array` of length
`n*3`; WASM mirrors the object with camelCase keys.

## Warmup

`warmup_period() == 1`. Each completed bar yields one CPR immediately
(`ready_after_first_update` pins this).

## Edge cases

- **Reference values.** Verified against `H=110, L=90, C=105`
  (`formula_reference_values` pins this).
- **Ordering.** `TC >= BC` always (`tc_never_below_bc` pins this).
- **Constant bar.** `H = L = C` collapses every level to the price
  (`constant_bar_collapses_range` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `cpr.reset()` clears readiness (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, CentralPivotRange};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut cpr = CentralPivotRange::new();
    let prev_day = Candle::new(101.0, 110.0, 90.0, 105.0, 1_000.0, 0)?;
    let out = cpr.update(prev_day).unwrap();
    println!("pivot={:.2} tc={:.2} bc={:.2}", out.pivot, out.tc, out.bc);
    Ok(())
}
```

Output:

```
pivot=101.67 tc=103.33 bc=100.00
```

### Python

```python
import numpy as np
import wickra as ta

cpr = ta.CentralPivotRange()
pivot, tc, bc = cpr.batch(np.array([110.0]), np.array([90.0]), np.array([105.0])).T
print(pivot[0], tc[0], bc[0])
```

### Node

```javascript
const ta = require('wickra');

const cpr = new ta.CentralPivotRange();
console.log(cpr.update(110, 90, 105)); // { pivot: 101.67, tc: 103.33, bc: 100 }
```

### Streaming

```rust
use wickra::{Candle, Indicator, CentralPivotRange};

let mut cpr = CentralPivotRange::new();
let completed_daily_bars: Vec<Candle> = Vec::new(); // your daily bars
for day in completed_daily_bars {
    if let Some(out) = cpr.update(day) {
        println!("CPR width = {:.2}", out.tc - out.bc);
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Day-type forecast.** Compare today's CPR width to recent widths: a contracting
   CPR over consecutive days often precedes a strong trending breakout.
2. **Open location.** Price opening above `TC` is bullish, below `BC` bearish,
   inside the range neutral/two-sided.
3. **Magnet levels.** The pivot and central lines act as intraday support/resistance
   and mean-reversion targets.

## Common pitfalls

- **Use the prior bar.** CPR is forward-looking: compute it from the completed
  previous period and project it onto the next.
- **Timeframe.** Daily CPR for day trading, weekly for swing — match the bar to the
  horizon.
- **Not the same as classic R/S pivots.** CPR is the three central lines; combine
  with [`ClassicPivots`](/Indicators/Indicator-ClassicPivots) for the R/S ladder.

## References

The Central Pivot Range is popularised by Frank Ochoa, *Secrets of a Pivot
Boss* (2010).

## See also

- [Indicator-ClassicPivots](/Indicators/Indicator-ClassicPivots) — the R/S pivot ladder.
- [Indicator-Camarilla](/Indicators/Indicator-Camarilla) — Camarilla levels.
- [Indicator-WoodiePivots](/Indicators/Indicator-WoodiePivots) — Woodie's pivots.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
