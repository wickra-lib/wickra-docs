# TD DeMarker

> Tom DeMark's oscillator. Compares rolling sums of "DeMax" (high
> above previous high) against "DeMin" (low below previous low) to
> produce a 0-1 bounded momentum oscillator. Conceptually similar to
> RSI but built from extreme-bar comparisons rather than
> close-to-close differences — diverges from RSI in high-wick
> markets where RSI ignores the wicks but DeMark captures them.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | DeMark                                                               |
| Input type          | `Candle` (uses `high`, `low`)                                        |
| Output type         | `f64`                                                                |
| Output range        | `[0, 1]`                                                             |
| Default parameters  | `period = 14`                                                        |
| Warmup period       | `period + 1`                                                         |
| Interpretation      | Above `0.7` overbought; below `0.3` oversold                         |

## Formula

```
demax_t = max(high_t - high_{t-1}, 0)
demin_t = max(low_{t-1} - low_t, 0)

DeMarker_t = sum(demax over period) /
             (sum(demax over period) + sum(demin over period))
```

A 0-1 bounded oscillator: `1` = pure new-high streak; `0` = pure
new-low streak; `0.5` = balanced. See
`crates/wickra-core/src/indicators/td_demarker.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | `14`    | `> 0`      | Rolling-sum window. |

`TdDeMarker::new` returns `Error::PeriodZero` for `period == 0`.
`TdDeMarker::classic()` returns the `14` factory.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python:
`TdDeMarker(period).batch(high, low)` returns a 1-D `np.ndarray`
with `NaN` in the warmup prefix. Node: same shape;
`update(candle)` returns `number | null`.

## Warmup

`warmup_period() == period + 1`. The first `demax` / `demin`
calculation needs a previous bar; the rolling sum then needs
`period` of those.

## Edge cases

- **Both DeMax and DeMin sums zero.** Indicator returns `0.5` by
  convention (matches DeMark's published rule for the all-flat
  case).
- **Constant series.** `demax = demin = 0` every bar → indicator
  = `0.5`.
- **Reset.** Clears the high/low buffer and both rolling sums.
- **NaN / infinity.** Rejected by `Candle::new` upstream.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, TdDeMarker};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..30).map(|i| {
        let b = 100.0 + f64::from(i);
        Candle::new(b, b + 1.0, b - 1.0, b, 1.0, i as i64).unwrap()
    }).collect();
    let mut td = TdDeMarker::new(14)?;
    println!("row 20 = {:?}", td.batch(&candles)[20]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

base = 100 + np.arange(30, dtype=float)
td = ta.TdDeMarker(14)
out = td.batch(base + 1, base - 1)
print('row 20:', out[20])
```

### Node

```javascript
const wickra = require('wickra');
const td = new wickra.TdDeMarker(14);
const base = Array.from({ length: 30 }, (_, i) => 100 + i);
console.log('row 20:', td.batch(base.map(b => b + 1), base.map(b => b - 1))[20]);
```

### Streaming

```rust
use wickra::{Candle, Indicator, TdDeMarker};

let mut td = TdDeMarker::new(14).unwrap();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if let Some(v) = td.update(bar) {
        if v > 0.7 { /* overbought */ }
        if v < 0.3 { /* oversold */ }
    }
}
```

## Interpretation

- **DeMarker > 0.7.** Recent action dominated by new highs —
  overbought, look for distribution.
- **DeMarker < 0.3.** Recent action dominated by new lows —
  oversold, look for accumulation.
- **Crossings of 0.5.** Trend-strength changes; less actionable
  than the extremes.
- **Vs RSI.** Both 0-1 oscillators but DeMarker is built on
  high/low extensions (extreme-bar comparisons), RSI on
  close-to-close differences. DeMarker diverges from RSI in
  high-wick markets (e.g. crypto on news bars) where wicks carry
  important information that RSI's close-based view misses.

## Common pitfalls

- **Confusing DeMarker with RSI thresholds.** Different scales
  (`0..1` vs `0..100`) and different distributional properties.
  Don't translate `RSI < 30` literally into `DeMarker < 0.3`.
- **Treating crossings of 0.5 as signals.** They're informational
  drifts; canonical signals are the `0.7` / `0.3` extremes.
- **Too-short period.** `period = 5` gives a hyper-active oscillator
  that whips on every bar. DeMark's published default `14` is the
  recommended starting point.

## References

- Tom DeMark, *The New Science of Technical Analysis* (1994),
  ch. 4 — DeMarker derivation.

## See also

- [Rsi](Indicator-Rsi) — close-based momentum oscillator.
- [TdRei](Indicator-TdRei) — DeMark's narrower 5-bar oscillator.
- [TdSequential](Indicator-TdSequential) — paired
  Setup + Countdown system.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
