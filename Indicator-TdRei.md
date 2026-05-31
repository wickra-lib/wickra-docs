# TD REI (Range Expansion Index)

> DeMark's Range Expansion Index. A short-window (default 5-bar)
> oscillator that conditionally weights the high/low expansions of
> each bar — bars where the high or low has not expanded relative to
> the recent baseline are zero-weighted — then normalises the signed
> expansion to a `[-100, +100]` range. Designed as a fast
> short-cycle momentum oscillator within DeMark's larger toolset.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | DeMark                                                               |
| Input type          | `Candle` (uses `high`, `low`, `close`)                              |
| Output type         | `f64`                                                                |
| Output range        | `[-100, +100]`                                                       |
| Default parameters  | `period = 5`                                                         |
| Warmup period       | `period + 7` (conditional weights need a 7-bar baseline)             |
| Interpretation      | Above `+60` overbought; below `−60` oversold; near 0 neutral         |

## Formula

For each bar within the window:

```
condition_up = (high_t >= max(close_{t-2}, close_{t-3}))   // expansion up
condition_dn = (low_t  <= min(close_{t-2}, close_{t-3}))   // expansion down

w = 1 if (condition_up AND high_t >= low_{t-5} AND high_t >= low_{t-6})
    AND (condition_dn AND low_t <= high_{t-5} AND low_t <= high_{t-6})
    else 0

num = sum over period: w · ((high_t − high_{t-2}) + (low_t − low_{t-2}))
den = sum over period: w · (|high_t − high_{t-2}| + |low_t − low_{t-2}|)

REI = 100 · num / den         (0 if den == 0)
```

The conditional weighting filters out bars that don't represent a
"genuine" range expansion. See
`crates/wickra-core/src/indicators/td_rei.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | `5`     | `> 0`      | Rolling-sum window. Most DeMark literature uses `5`. |

`TdRei::classic()` constructs the 5-period default. `new` returns
`Error::PeriodZero` for `period == 0`.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python:
`TdRei(period).batch(high, low, close)` returns a 1-D `np.ndarray`
with `NaN` in the warmup prefix. Node: same shape;
`update(candle)` returns `number | null`.

## Warmup

`warmup_period() == period + 7`. The 7-bar lag is the maximum
look-back inside the conditional-weight check (`low_{t-5}`,
`low_{t-6}` etc.).

## Edge cases

- **All weights zero.** Indicator returns `0.0` (neutral). Common
  in ranging markets where neither high nor low has expanded.
- **Pure expansion up.** All weighted differences positive → REI
  approaches `+100`.
- **Reset.** Clears the rolling buffers.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, TdRei};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..30).map(|i| {
        let b = 100.0 + f64::from(i);
        Candle::new(b, b + 1.0, b - 1.0, b, 1.0, i as i64).unwrap()
    }).collect();
    let mut r = TdRei::classic();
    println!("row 20 = {:?}", r.batch(&candles)[20]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

base = 100 + np.arange(30, dtype=float)
r = ta.TdRei(5)
out = r.batch(base + 1, base - 1, base)
print('warmup:', r.warmup_period())  # 12
print('row 20:', out[20])
```

### Node

```javascript
const wickra = require('wickra');
const r = new wickra.TdRei(5);
const base = Array.from({ length: 30 }, (_, i) => 100 + i);
console.log('row 20:',
  r.batch(base.map(b => b + 1), base.map(b => b - 1), base)[20]);
```

### Streaming

```rust
use wickra::{Candle, Indicator, TdRei};

let mut r = TdRei::classic();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if let Some(v) = r.update(bar) {
        if v > 60.0 { /* overbought */ }
        if v < -60.0 { /* oversold */ }
    }
}
```

## Interpretation

REI is the **short-window momentum oscillator** in the DeMark
toolbox:

- **REI > +60.** Recent range expansion has been dominated by new
  highs — overbought.
- **REI < −60.** Range expansion dominated by new lows — oversold.
- **Persistent zero readings.** No genuine range expansion in
  either direction; the market is consolidating.
- **As Sequential precondition.** Some DeMark traders use
  `REI > +45 / < −45` as a momentum gate for TD Sequential
  signals — REI confirms the momentum context.

## Common pitfalls

- **Comparing REI to RSI thresholds.** Different scales (`-100..+100`
  vs `0..100`) and different neutral points (`0` vs `50`).
- **Reading every zero-cross.** REI sits at zero for long periods
  in ranges; only the move *off* zero is meaningful.
- **Conditional-weight surprise.** Two seemingly-similar price
  patterns can produce very different REI readings because the
  weight gate kicks in differently. The implementation matches
  DeMark's published rules exactly; if you're getting unexpected
  output, compare against the rule, not against your intuition.

## References

- Tom DeMark, *The New Science of Technical Analysis* (1994),
  ch. 4: Range Expansion Index.

## See also

- [TdDeMarker](Indicator-TdDeMarker) — wider-window DeMark
  momentum oscillator.
- [TdPressure](Indicator-TdPressure) — volume-aware DeMark
  momentum sibling.
- [TdSequential](Indicator-TdSequential) — paired with REI for
  confirmation in some setups.
- [Rsi](Indicator-Rsi) — close-based momentum analogue.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
