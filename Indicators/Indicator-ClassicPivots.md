# Classic Pivots (Floor-Trader Pivots)

> The standard pivot/resistance/support levels computed from a
> completed candle's high, low, and close. Three resistances and
> three supports above and below the central pivot, derived from
> the typical price `(H + L + C) / 3`. These are the textbook
> "floor-trader pivots" — the most widely-used reference levels in
> intraday and short-swing trading.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Pivots & S/R                                                         |
| Input type          | `Candle` (uses `high`, `low`, `close`)                               |
| Output type         | `ClassicPivotsOutput { pp, r1, r2, r3, s1, s2, s3 }`                 |
| Output range        | unbounded (price-units)                                              |
| Default parameters  | none — `ClassicPivots::new()`                                        |
| Warmup period       | `1`                                                                  |
| Interpretation      | Fixed reference levels for the next session                          |

## Formula

```
PP = (H + L + C) / 3

R1 = 2·PP − L          S1 = 2·PP − H
R2 = PP + (H − L)      S2 = PP − (H − L)
R3 = H + 2·(PP − L)    S3 = L − 2·(H − PP)
```

The `(H − L)` width drives R2/S2; the doubled-range additions drive
R3/S3. See `crates/wickra-core/src/indicators/classic_pivots.rs`.

## Parameters

None — `ClassicPivots::new()` takes no arguments.

## Inputs / Outputs

`Indicator<Input = Candle, Output = ClassicPivotsOutput>` with seven
fields (`pp`, `r1`, `r2`, `r3`, `s1`, `s2`, `s3`).

- **Python.** `ClassicPivots().batch(high, low, close)` returns an
  `(n, 7)` `float64` array with columns `[pp, r1, r2, r3, s1, s2, s3]`.
- **Node.** Returns a flat `number[]` of length `n * 7` interleaved
  in the same order. Streaming `update(candle)` returns an object
  with the same field names.

## Warmup

`warmup_period() == 1`. The first candle produces the first set of
levels.

## Edge cases

- **Session aggregation.** Pivots are conventionally built from the
  **previous** session's bar (daily/weekly/monthly) and used as
  fixed levels for the next session. This indicator simply
  evaluates the formula on every candle it sees — wire it to a
  pre-aggregated session bar from `wickra-data` or a custom
  aggregator.
- **`H == L`** (flat bar). All seven levels collapse to `PP` (or
  to `H`/`L`); not actionable.
- **`H < L`.** Rejected by `Candle::new` upstream.
- **Reset.** Stateless; `reset()` is a no-op functionally.

## Examples

### Rust

```rust
use wickra::{Candle, ClassicPivots, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prev = Candle::new(100.0, 110.0, 90.0, 105.0, 1.0, 0)?;
    let mut cp = ClassicPivots::new();
    let levels = cp.update(prev).unwrap();
    println!("PP={}  R1={}  S1={}", levels.pp, levels.r1, levels.s1);
    // PP = (110 + 90 + 105)/3 = 101.667
    // R1 = 2·101.667 − 90 = 113.333
    // S1 = 2·101.667 − 110 = 93.333
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

high  = np.array([110.0])
low   = np.array([ 90.0])
close = np.array([105.0])

cp = ta.ClassicPivots()
out = cp.batch(high, low, close)
print('shape:', out.shape)        # (1, 7)
print('row 0:', out[0])           # pp, r1, r2, r3, s1, s2, s3
```

### Node

```javascript
const wickra = require('wickra');

const cp = new wickra.ClassicPivots();
const flat = cp.batch([110], [90], [105]);
console.log('pp:', flat[0], 'r1:', flat[1], 's1:', flat[4]);
```

### Streaming on session bars

```rust
use wickra::{Candle, ClassicPivots, Indicator};

let mut cp = ClassicPivots::new();
let session_aggregator: Vec<wickra::Candle> = Vec::new(); // your stream of completed session bars
for session_bar in session_aggregator {
    let levels = cp.update(session_bar).unwrap();
    // Use `levels.pp`, `levels.r1`, etc. as reference for the next session
}
```

## Interpretation

- **Central pivot.** Bias gauge. Price > PP = bullish bias for the
  session; price < PP = bearish bias.
- **R1 / S1.** First reaction targets. Most intraday systems
  expect price to test R1 or S1; the further bands (R2+, S2+) only
  trade on strong directional days.
- **R3 / S3.** Trend-day extension targets. Reached only on
  high-conviction directional sessions.
- **Vs other pivots.** Classic Pivots are widely watched, so
  levels carry self-fulfilling reaction value even when the
  underlying math is not theoretically motivated.

## Common pitfalls

- **Feeding bar-by-bar.** Pivots are session-anchored. Feeding
  every minute bar produces minute-by-minute pivots, which is not
  the conventional use. Aggregate to daily/weekly first.
- **Wrong session window.** US equity pivots traditionally use the
  RTH (9:30-16:00) session only. Including overnight or extended
  hours changes H/L and shifts the pivots.
- **Treating R3/S3 as common targets.** They're reached < 10% of
  trading days; using them as default profit targets will
  underfill.

## References

- The standard floor-trader pivot formula is uncredited; it dates
  to floor traders' rules-of-thumb in the 1970s.
- Robert Miner, *High Probability Trading Strategies* (2008) —
  modern treatment of pivots for swing systems.

## See also

- [FibonacciPivots](/Indicators/Indicator-FibonacciPivots) — Fib-ratio variant.
- [Camarilla](/Indicators/Indicator-Camarilla) — close-anchored four-tier
  variant.
- [WoodiePivots](/Indicators/Indicator-WoodiePivots) — close-weighted variant.
- [DemarkPivots](/Indicators/Indicator-DemarkPivots) — conditional one-tier
  variant.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
