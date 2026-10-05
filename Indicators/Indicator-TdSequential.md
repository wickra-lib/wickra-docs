# TD Sequential

> The full Tom DeMark Sequential indicator: a Setup count followed
> by a Countdown count. Setup runs the 9-bar momentum-exhaustion
> gate, Countdown then runs a separate 13-bar confirmation;
> together a completed Sequential is the canonical DeMark
> exhaustion signal. DeMark's bar-13 qualifier is enforced: the
> final countdown bar must also trade through the close of countdown
> bar 8, or it is deferred. Emits both phases in a single `Output` so
> the caller can read setup progress and countdown progress in one
> shot.

## Quick reference

| Item                | Value                                                                                       |
|---------------------|---------------------------------------------------------------------------------------------|
| Family              | DeMark                                                                                      |
| Input type          | `Candle` (uses `high`, `low`, `close`)                                                      |
| Output type         | `TdSequentialOutput { setup, countdown, direction: f64 }` (signed: positive = buy, negative = sell) |
| Output range        | `setup ∈ [-setup_target, setup_target]`, `countdown ∈ [-countdown_target, countdown_target]` |
| Default parameters  | `setup_lookback=4`, `setup_target=9`, `countdown_lookback=2`, `countdown_target=13`         |
| Warmup period       | `max(setup_lookback, countdown_lookback) + 1`                                               |
| Interpretation      | Buy `(setup=9, countdown=13)` or sell `(-9, -13)` signals momentum exhaustion                |

## Formula

Setup phase — same as [TdSetup](/Indicators/Indicator-TdSetup):

```
if close[t] < close[t - setup_lookback]:  buy_setup_streak += 1
if close[t] > close[t - setup_lookback]:  sell_setup_streak += 1
streak resets on the opposite direction or on equality
```

Once `buy_setup_streak == setup_target` (9), the Countdown phase
arms. From the next bar:

```
if close[t] <= low[t - countdown_lookback]:   buy_countdown += 1
if close[t] >= high[t - countdown_lookback]:  sell_countdown += 1
```

Countdown bars do not need to be consecutive. The final bar is
subject to DeMark's bar-13 qualifier: besides meeting the comparison
above, it must trade through the close of countdown bar
`countdown_target − 5` (bar 8 of 13):

```
buy  bar 13 counts only if  low[t]  <= close[countdown bar 8]
sell bar 13 counts only if  high[t] >= close[countdown bar 8]
otherwise the bar is deferred (count stays at 12)
```

Countdown completes at `countdown_target` (13). When
`countdown_target <= 5` there is no bar `countdown_target − 5`, so no
qualifier applies. See
`crates/wickra-core/src/indicators/td_sequential.rs`.

## Parameters

| Name                 | Type    | Default | Description |
|----------------------|---------|---------|-------------|
| `setup_lookback`     | `usize` | `4`     | Setup-phase close-vs-close lookback. |
| `setup_target`       | `usize` | `9`     | Setup-phase target count (Setup 9). |
| `countdown_lookback` | `usize` | `2`     | Countdown-phase close-vs-high/low lookback. |
| `countdown_target`   | `usize` | `13`    | Countdown-phase target count (Countdown 13). |

`TdSequential::classic()` constructs `(4, 9, 2, 13)`. `new` returns
`Error::PeriodZero` for any zero argument.

## Inputs / Outputs

`Indicator<Input = Candle, Output = TdSequentialOutput>`.
`TdSequentialOutput` carries `setup: f64`, `countdown: f64` and
`direction: f64`. `setup` and `countdown` are signed (positive =
buy-side counts, negative = sell-side); `direction` is `+1.0` while a
buy countdown is active, `-1.0` for a sell countdown, `0.0` otherwise.

- **Python.** `update` returns a `(setup, countdown, direction)`
  3-tuple per bar; `batch` returns an `(n, 3)` matrix.
- **Node.** `update` returns `{ setup, countdown, direction } | null`
  per bar; `batch` returns a flat `number[]` of length `n * 3`
  (`[setup0, countdown0, direction0, setup1, ...]`).

## Warmup

`warmup_period() == max(setup_lookback, countdown_lookback) + 1` —
fundamentally the same close-buffer requirement as TD Setup, just
with both lookbacks available.

## Edge cases

- **Setup completes before Countdown can arm.** Buy Setup 9 arms
  Buy Countdown; if a sell-side momentum bar then prints, the Buy
  Setup counter doesn't reset, but Buy Countdown bars don't
  increment either.
- **Countdown interrupted.** Countdown counts can sit at a partial
  value (e.g. 7/13) across many bars while waiting for the next
  qualifying close.
- **Deferred bar 13.** A bar that meets the countdown comparison
  while the count is at 12 but does not trade through the close of
  countdown bar 8 (buy: `low > close₈`; sell: `high < close₈`) is
  deferred — the count stays at 12 until a later bar satisfies both
  conditions.
- **Opposite-direction invalidation.** A sell setup completion can
  invalidate an active buy countdown — output direction flips and the
  stored bar-8 qualifier close is cleared.
- **Reset.** `reset()` clears both setup and countdown streaks and
  the bar-8 qualifier close.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, TdSequential};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prices: Vec<f64> = (0..60).map(|i| 100.0 - f64::from(i) * 0.4).collect();
    let candles: Vec<Candle> = prices.iter().enumerate()
        .map(|(i, &c)| Candle::new(c, c + 0.3, c - 0.3, c, 1.0, i as i64).unwrap())
        .collect();
    let mut td = TdSequential::classic();
    for c in &candles {
        if let Some(o) = td.update(*c) {
            if o.countdown == 13.0 { println!("buy countdown complete"); }
            if o.countdown == -13.0 { println!("sell countdown complete"); }
        }
    }
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

close = 100 - np.arange(60, dtype=float) * 0.4
td = ta.TDSequential()
out = td.batch(close + 0.3, close - 0.3, close)
# out shape (60, 3): columns [setup, countdown, direction]
print('row 30:', out[30])
```

### Node

```javascript
const wickra = require('wickra');
const td = new wickra.TDSequential(4, 9, 2, 13);
const close = Array.from({ length: 60 }, (_, i) => 100 - i * 0.4);
const flat = td.batch(close.map(c => c + 0.3), close.map(c => c - 0.3), close);
console.log('row 30: setup =', flat[30 * 3], 'countdown =', flat[30 * 3 + 1]);
```

### Streaming

```rust
use wickra::{Candle, Indicator, TdSequential};

let mut td = TdSequential::classic();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if let Some(o) = td.update(bar) {
        if o.countdown == 13.0 { /* high-conviction buy */ }
        if o.countdown == -13.0 { /* high-conviction sell */ }
    }
}
```

## Interpretation

- **Buy Setup 9 → Buy Countdown 13.** Capitulation-grade oversold —
  high-conviction long mean-reversion signal.
- **Sell Setup 9 → Sell Countdown 13.** Mirror — distribution
  topping signal.
- **Setup 9 without Countdown 13.** Momentum extreme but not the
  full DeMark setup-and-cool-off pattern. Still tradable as a
  short-term reversal setup, just with lower historical hit rate.
- **Risk management.** Pair with [TdLines](/Indicators/Indicator-TdLines) for
  invalidation levels and [TdRiskLevel](/Indicators/Indicator-TdRiskLevel) for
  protective stops.

## Common pitfalls

- **Trading on Setup 9 alone.** Setup 9 is the gate, Countdown 13
  is the entry. Mixing them up halves the signal's edge.
- **Resetting Countdown manually on session boundaries.**
  Sequential is bar-stream agnostic; do not reset on session
  boundaries.
- **Ignoring direction.** The signed output makes direction
  explicit; ignoring it produces inverted signals.
- **Expecting 13 on the first comparison-qualifying bar.** Because
  of the bar-13 qualifier, a bar can satisfy `close <= low[t-2]` (or
  `close >= high[t-2]`) at count 12 and still not complete the
  countdown. Implementations that skip the qualifier will print 13
  earlier than Wickra.

## References

- Tom DeMark, *The New Science of Technical Analysis* (1994) —
  original full Sequential treatment.
- *DeMark on Day Trading Options* (1999) — recycle, deferred
  countdown, and other edge-case rules. Wickra implements the bar-13
  deferral (qualifier against the close of countdown bar 8); recycle
  is not implemented.

## See also

- [TdSetup](/Indicators/Indicator-TdSetup) — Setup-only variant.
- [TdCountdown](/Indicators/Indicator-TdCountdown) — Countdown-only variant.
- [TdCombo](/Indicators/Indicator-TdCombo) — faster, stricter countdown
  variant.
- [TdLines](/Indicators/Indicator-TdLines) — TDST support/resistance lines.
- [TdRiskLevel](/Indicators/Indicator-TdRiskLevel) — protective-stop levels.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
