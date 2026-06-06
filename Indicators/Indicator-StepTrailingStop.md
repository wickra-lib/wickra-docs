# Step Trailing Stop

> A stop that ratchets in fixed-size discrete steps and flips to the
> opposite side on a close-through. Quantising the stop to a multiple
> of `step_size` keeps the level on a round-number grid, which
> mirrors how many discretionary traders move stops by hand — in
> $0.50, $1, or 10-pip increments. Useful when you want a "clean"
> visible stop level for execution screens.

## Quick reference

| Item                | Value                                                                  |
|---------------------|------------------------------------------------------------------------|
| Family              | Trailing Stops                                                         |
| Input type          | `f64` (close)                                                          |
| Output type         | `f64` — the snapped stop level                                         |
| Output range        | unbounded (price-units, snapped to `step_size`-grid)                   |
| Default parameters  | `step_size = 1.0` (`StepTrailingStop::classic()`)                      |
| Warmup period       | `1`                                                                    |
| Interpretation      | Stop on a round-number grid; flips to opposite side on close-through   |

## Formula

```
long:   target = close − step_size
        stop_t = max(stop_{t−1}, floor(target / step_size) · step_size)
                 while close ≥ stop_{t−1}

short:  target = close + step_size
        stop_t = min(stop_{t−1}, ceil(target / step_size) · step_size)
                 while close ≤ stop_{t−1}

flip-to-long  on close > prev short-stop
    -> stop = floor((close − step) / step) · step
flip-to-short on close < prev long-stop
    -> stop = ceil((close + step) / step) · step
```

The `floor` / `ceil` operations snap the stop to the nearest grid
line below (long) or above (short) the raw target. See
`crates/wickra-core/src/indicators/step_trailing_stop.rs`.

## Parameters

| Name        | Type  | Default | Constraint           | Description |
|-------------|-------|---------|----------------------|-------------|
| `step_size` | `f64` | `1.0`   | finite, `> 0`        | Grid spacing in price units. |

`StepTrailingStop::new` returns `Error::NonPositiveMultiplier` for
non-finite or non-positive `step_size`.
`StepTrailingStop::classic()` returns the `step_size = 1.0` factory.

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Python:
`StepTrailingStop(step).batch(close)` returns a 1-D `np.ndarray`
without warmup `NaN`s. Node: same shape; `update(close)` returns
`number`.

## Warmup

`warmup_period() == 1`. The first input seeds a long stop one step
below the snapped close.

## Edge cases

- **First bar.** Seeds long at `floor((close − step) / step) · step`.
  This is the snapped level *below* the first close.
- **Close exactly on a grid line.** `floor` snaps a long stop down
  one grid; `ceil` snaps a short stop up one grid. The stop never
  coincides with the close.
- **Step too large.** If `step_size` exceeds the typical bar-range,
  the stop barely moves between flips. Sanity-check `step_size` is
  on the order of `ATR(14)` or smaller for the instrument.
- **Negative close.** Treated normally — the `step_size` grid extends
  symmetrically across zero.
- **Reset.** `reset()` clears `prev_stop` to `None` and resets the
  side flag to long.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, StepTrailingStop};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prices: Vec<f64> = (0..20).map(|i| 100.0 + f64::from(i) * 0.7).collect();
    let mut s = StepTrailingStop::new(1.0)?;
    let out = s.batch(&prices);
    println!("first 5 stops: {:?}", &out[..5]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

prices = 100 + np.arange(20, dtype=float) * 0.7
s = ta.StepTrailingStop(1.0)
out = s.batch(prices)
print(out[:5])  # snapped to integer grid below close
```

### Node

```javascript
const wickra = require('wickra');
const s = new wickra.StepTrailingStop(1.0);
const prices = Array.from({ length: 20 }, (_, i) => 100 + i * 0.7);
console.log(s.batch(prices).slice(0, 5));
```

### Streaming

```rust
use wickra::{Indicator, StepTrailingStop};

let mut s = StepTrailingStop::new(0.5).unwrap();
let close_stream: Vec<f64> = Vec::new(); // your live close-price feed
for close in close_stream {
    let stop = s.update(close).unwrap();
    // Snapped to the 0.5 grid; ratchets in 0.5 steps as price advances.
}
```

## Interpretation

- **Round-number stops.** The output sits on a known grid; useful
  for instruments where round-number levels carry psychological
  weight (e.g. SPX with `step_size = 5`, EUR/USD with `step_size =
  0.001`).
- **Lower trail-jitter.** Unlike a percentage or ATR trail that
  micro-adjusts every bar, this stop only moves when the snapped
  target advances by a full step. The visible stop level is stable
  across many bars in mild trends.
- **Vs Renko stops.** `RenkoTrailingStop` also moves in fixed-size
  increments but anchors to a separate "brick" register; Step trails
  the raw price more directly. Renko ignores intra-brick noise more
  aggressively.

## Common pitfalls

- **Mismatched `step_size`.** Setting `step_size = 1.0` on EUR/USD
  (where 1.0 is ~100 big-figure pips) effectively disables the
  trail. Always pick a step that is small relative to the typical
  daily range.
- **Round-number coincidence.** Two close consecutive flips can
  both land on the same grid line, producing a stop that "doesn't
  move" — this is correct behaviour but can confuse manual chart
  reading.
- **Side-flip false-positive.** A spike that touches the prior
  long-stop grid line by `1 tick` flips to short; on next-bar mean
  reversion the indicator flips back to long. Use this indicator
  on bar-close logic only, not on intra-bar ticks.

## References

- Practitioner pattern, no single canonical reference. Implemented
  here against the round-number-grid convention used in commercial
  charting packages (TradeStation, MetaTrader).

## See also

- [PercentageTrailingStop](/Indicators/Indicator-PercentageTrailingStop) —
  continuous % cousin.
- [RenkoTrailingStop](/Indicators/Indicator-RenkoTrailingStop) — brick-anchored
  step cousin.
- [AtrTrailingStop](/Indicators/Indicator-AtrTrailingStop) — volatility-scaled
  trail.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
