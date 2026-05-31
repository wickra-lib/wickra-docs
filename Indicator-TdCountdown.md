# TD Countdown

> The second half of DeMark's TD Sequential, packaged as a
> standalone indicator. Runs the 9-bar setup detection internally and
> then exposes only the countdown count (and direction). Useful when
> callers only need the countdown value and not the running setup
> state — smaller streaming payload than
> [TdSequential](Indicator-TdSequential).

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | DeMark                                                               |
| Input type          | `Candle` (uses `high`, `low`, `close`)                               |
| Output type         | `f64` — signed countdown count                                       |
| Output range        | `[-countdown_target, +countdown_target]`                             |
| Default parameters  | `(4, 9, 2, 13)` — Setup `(4, 9)`, Countdown `(2, 13)`                 |
| Warmup period       | `max(setup_lookback, countdown_lookback) + 1`                         |
| Interpretation      | `+13` = buy countdown complete; `−13` = sell countdown complete       |

## Formula

```
Setup phase (internal, same as TdSetup):
  buy_setup advances on close[i] < close[i - setup_lookback]
  sell_setup advances on close[i] > close[i - setup_lookback]
  arms countdown on setup completion (setup_count == setup_target)

Buy countdown phase (after a buy setup completion):
  advances on close[i] <= low[i - countdown_lookback]
  (bars need not be consecutive)
  saturates at countdown_target

Sell countdown phase (mirror):
  advances on close[i] >= high[i - countdown_lookback]

Opposite-direction setup completion invalidates the active countdown.

Output:
  + buy_countdown    if buy direction active
  - sell_countdown   if sell direction active
  0                  if no countdown armed
```

See `crates/wickra-core/src/indicators/td_countdown.rs`.

## Parameters

| Name                 | Type    | Default | Description |
|----------------------|---------|---------|-------------|
| `setup_lookback`     | `usize` | `4`     | Setup-phase close-vs-close lookback. |
| `setup_target`       | `usize` | `9`     | Setup count needed to arm countdown. |
| `countdown_lookback` | `usize` | `2`     | Countdown-phase close-vs-high/low lookback. |
| `countdown_target`   | `usize` | `13`    | Countdown target (DeMark's classic). |

`TdCountdown::new` returns `Error::PeriodZero` for any zero
argument. `TdCountdown::classic()` returns `(4, 9, 2, 13)`.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python:
`TdCountdown(...).batch(high, low, close)` returns a 1-D
`np.ndarray` with `NaN` for warmup. Node: same shape;
`update(candle)` returns `number | null`.

## Warmup

`warmup_period() == max(setup_lookback, countdown_lookback) + 1`.
For classic params, that's `5`.

## Edge cases

- **Countdown can sit at a partial value.** A countdown count of
  `7/13` may sit across many bars while waiting for the next
  qualifying close.
- **Opposite-direction setup invalidates.** A buy setup completion
  while a sell countdown is active resets the sell countdown to
  zero in the buy direction (re-arming).
- **No countdown armed.** Output is `0.0` when no countdown is
  active in either direction.
- **Reset.** `reset()` clears all internal state.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, TdCountdown};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prices: Vec<f64> = (0..50).map(|i| 100.0 - f64::from(i) * 0.5).collect();
    let candles: Vec<Candle> = prices
        .iter()
        .enumerate()
        .map(|(i, &c)| Candle::new(c, c + 0.3, c - 0.3, c, 1.0, i as i64).unwrap())
        .collect();
    let mut td = TdCountdown::classic();
    let out = td.batch(&candles);
    println!("max buy countdown reached: {}",
             out.iter().flatten().fold(0.0f64, |a, &b| a.max(b)));
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

# Sustained downtrend → buy countdown should complete (13)
close = 100 - np.arange(50, dtype=float) * 0.5
td = ta.TdCountdown(4, 9, 2, 13)
out = td.batch(close + 0.3, close - 0.3, close)
print('max:', np.nanmax(out))
```

### Node

```javascript
const wickra = require('wickra');
const td = new wickra.TdCountdown(4, 9, 2, 13);
const close = Array.from({ length: 50 }, (_, i) => 100 - i * 0.5);
const out = td.batch(close.map(c => c + 0.3), close.map(c => c - 0.3), close);
console.log('max:', Math.max(...out.filter(x => x != null)));
```

### Streaming

```rust
use wickra::{Candle, Indicator, TdCountdown};

let mut td = TdCountdown::classic();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if let Some(v) = td.update(bar) {
        if v == 13.0 { /* buy countdown complete */ }
        if v == -13.0 { /* sell countdown complete */ }
    }
}
```

## Interpretation

- **Countdown 13.** The canonical DeMark exhaustion signal —
  high-conviction mean-reversion entry. Pair with TDST lines
  for stop placement.
- **Countdown progress.** A countdown of `8/13` is informational
  — it shows trend exhaustion is building but not complete. Some
  systems take entries on `Countdown 12 + price confirmation`.
- **Vs TdSequential.** Same trade logic; this indicator omits the
  running setup count from the output to save bandwidth. Use
  [TdSequential](Indicator-TdSequential) when both pieces are
  needed.

## Common pitfalls

- **Treating Setup 9 as the countdown signal.** Setup 9 just *arms*
  the countdown; the trade signal is Countdown 13.
- **Resetting on session boundaries.** Like TdSetup, this
  indicator should not be reset on session boundaries.
- **Missing the invalidation.** A countdown can be invalidated by
  an opposite-direction setup completion. Watch the *direction*
  of the output, not just its magnitude.

## References

- Tom DeMark, *The New Science of Technical Analysis* (1994) —
  original Countdown formulation.
- *DeMark on Day Trading Options* (1999) — refined edge-case
  rules.

## See also

- [TdSetup](Indicator-TdSetup) — Setup-only variant.
- [TdSequential](Indicator-TdSequential) — both Setup and
  Countdown emitted together.
- [TdCombo](Indicator-TdCombo) — stricter, faster countdown
  variant.
- [TdLines](Indicator-TdLines) — TDST support / resistance.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
