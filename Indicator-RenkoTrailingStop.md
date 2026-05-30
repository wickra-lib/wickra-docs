# Renko Trailing Stop

> A trailing stop that follows a Renko-style brick anchor: the stop
> only moves when price has advanced (or fallen) by at least one
> full `block_size`, and then jumps the same fixed distance. Like a
> Renko chart, the stop ignores intra-block noise — it sits one full
> block behind the last "printed" brick and only ratchets in
> whole-block increments.

## Quick reference

| Item                | Value                                                                  |
|---------------------|------------------------------------------------------------------------|
| Family              | Trailing Stops                                                         |
| Input type          | `f64` (close)                                                          |
| Output type         | `f64` — the active stop level                                          |
| Output range        | unbounded (price-units, in block-size increments)                      |
| Default parameters  | `block_size = 1.0` (`RenkoTrailingStop::classic()`)                    |
| Warmup period       | `1`                                                                    |
| Interpretation      | Stop one block behind the anchor; flips on close-through               |

## Formula

```
long:  advance = floor((close − anchor) / block_size)
       if advance ≥ 1  ->  anchor += advance · block_size
       stop = anchor − block_size

       flip-to-short on close < stop
            -> anchor = close
               stop   = anchor + block_size

short: advance = floor((anchor − close) / block_size)
       if advance ≥ 1  ->  anchor −= advance · block_size
       stop = anchor + block_size

       flip-to-long on close > stop
            -> anchor = close
               stop   = anchor − block_size
```

The first input seeds a long anchor at the close. The anchor only
moves when `close` has cleared the next brick; otherwise the stop
stays still. See
`crates/wickra-core/src/indicators/renko_trailing_stop.rs`.

## Parameters

| Name         | Type  | Default | Constraint           | Description |
|--------------|-------|---------|----------------------|-------------|
| `block_size` | `f64` | `1.0`   | finite, `> 0`        | Brick height in price units. |

`RenkoTrailingStop::new` returns `Error::NonPositiveMultiplier` for
non-finite or non-positive `block_size`.
`RenkoTrailingStop::classic()` returns the `1.0` factory.

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Python:
`RenkoTrailingStop(block).batch(close)` returns a 1-D `np.ndarray`
without warmup `NaN`s. Node: same shape; `update(close)` returns
`number`.

## Warmup

`warmup_period() == 1`. The first input seeds `anchor = close` and
emits `stop = anchor − block_size`.

## Edge cases

- **First bar.** Seeds long at `close − block_size`.
- **Sub-block advances.** Any close within one block of the anchor
  leaves the anchor unchanged → stop unchanged. This is the
  noise-suppression property.
- **Multi-block jumps.** `floor((close − anchor) / block_size)` can
  be `> 1`; the anchor jumps multiple blocks at once on a gap or a
  large single-bar move.
- **Flip on close-through.** Crossing the stop flips the side and
  re-seeds the anchor at the *current* close (not the stop level).
- **`block_size` larger than typical bar range.** The stop barely
  moves; choose a block roughly equal to ATR for sensible behaviour.
- **Reset.** `reset()` clears the anchor and resets the side flag to
  long.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, RenkoTrailingStop};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prices: Vec<f64> = (0..20).map(|i| 100.0 + f64::from(i) * 0.5).collect();
    let mut r = RenkoTrailingStop::new(1.0)?;
    let out = r.batch(&prices);
    println!("first 5: {:?}", &out[..5]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

prices = 100 + np.arange(20, dtype=float) * 0.5
r = ta.RenkoTrailingStop(1.0)
out = r.batch(prices)
print(out[:5])  # anchor only advances every 2 bars (block = 1.0, advance = 0.5/bar)
```

### Node

```javascript
const wickra = require('wickra');
const r = new wickra.RenkoTrailingStop(1.0);
const prices = Array.from({ length: 20 }, (_, i) => 100 + i * 0.5);
console.log(r.batch(prices).slice(0, 5));
```

### Streaming

```rust
use wickra::{Indicator, RenkoTrailingStop};

let mut r = RenkoTrailingStop::new(0.25).unwrap();
let mut prev_stop = None;
for close in close_stream {
    let stop = r.update(close).unwrap();
    if prev_stop.is_some_and(|p| (close > p) != (close > stop)) {
        /* side flipped */
    }
    prev_stop = Some(stop);
}
```

## Interpretation

- **Noise filter.** The block-size acts as a noise gate. Setting
  `block_size = 0.5 · ATR(14)` gives a Renko-style filter that
  ignores ~half-ATR pullbacks but reacts cleanly to multi-block
  trends.
- **Discrete trail.** Unlike continuous trails, the stop sits still
  for many bars at a time, then jumps a full block. This makes the
  level easy to read and place orders against.
- **Vs Step Trailing Stop.** `StepTrailingStop` snaps the *raw stop
  target* to a grid (price-anchored); `RenkoTrailingStop` snaps the
  *anchor* (brick-printed). The latter is more Renko-faithful — it
  truly ignores sub-block intermediate moves.

## Common pitfalls

- **`block_size` mismatch with instrument range.** A `0.01` block on
  a `100`-priced equity creates a hyper-active stop; a `5` block on
  EUR/USD `1.10` never moves. Pick block ~ATR.
- **First-bar entry.** The seed places the stop one block below the
  first close — a tight initial risk. Consider warming up over
  several bars before treating the stop as actionable.
- **Whipsaw on equal-magnitude oscillations.** If close oscillates
  exactly `block_size` around the anchor, the indicator flips on
  every bar. Pair with a slower trend filter (e.g. SMA cross) to
  gate entries.

## References

- Renko charting was popularised in Japan (the name comes from
  *renga*, brick). No single attributed inventor; documented in
  Steve Nison, *Beyond Candlesticks* (1994).

## See also

- [StepTrailingStop](Indicator-StepTrailingStop) — grid-snapped
  cousin without brick anchoring.
- [PercentageTrailingStop](Indicator-PercentageTrailingStop) —
  continuous-percentage trail.
- [AtrTrailingStop](Indicator-AtrTrailingStop) — ATR-scaled trail.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
