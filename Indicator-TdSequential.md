# TD Sequential

> The full Tom DeMark Sequential indicator: a Setup count followed
> by a Countdown count. Setup runs the 9-bar momentum-exhaustion
> gate, Countdown then runs a separate 13-bar confirmation;
> together a completed Sequential is the canonical DeMark
> exhaustion signal. Emits both phases in a single `Output` so the
> caller can read setup progress and countdown progress in one shot.

## Quick reference

| Item                | Value                                                                                       |
|---------------------|---------------------------------------------------------------------------------------------|
| Family              | DeMark                                                                                      |
| Input type          | `Candle` (uses `high`, `low`, `close`)                                                      |
| Output type         | `TdSequentialOutput { setup, countdown: i32 }` (signed: positive = buy, negative = sell)    |
| Output range        | `setup ∈ [-setup_target, setup_target]`, `countdown ∈ [-countdown_target, countdown_target]` |
| Default parameters  | `setup_lookback=4`, `setup_target=9`, `countdown_lookback=2`, `countdown_target=13`         |
| Warmup period       | `max(setup_lookback, countdown_lookback) + 1`                                               |
| Interpretation      | Buy `(setup=9, countdown=13)` or sell `(-9, -13)` signals momentum exhaustion                |

## Formula

Setup phase — same as [TdSetup](Indicator-TdSetup):

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

Countdown completes at `countdown_target` (13). See
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
`TdSequentialOutput` carries `setup: i32` and `countdown: i32`,
both signed (positive = buy-side counts, negative = sell-side).

- **Python.** Returns a `(setup, countdown)` 2-tuple per bar in an
  `(n, 2)` array.
- **Node.** Returns `{ setup, countdown } | null` per bar; flat
  `number[]` of length `n * 2` for batch.

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
- **Opposite-direction invalidation.** A sell setup completion can
  invalidate an active buy countdown — output direction flips.
- **Reset.** `reset()` clears both setup and countdown streaks.

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
            if o.countdown == 13 { println!("buy countdown complete"); }
            if o.countdown == -13 { println!("sell countdown complete"); }
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
td = ta.TdSequential()
out = td.batch(close + 0.3, close - 0.3, close)
# out shape (60, 2): columns [setup, countdown]
print('row 30:', out[30])
```

### Node

```javascript
const wickra = require('wickra');
const td = new wickra.TdSequential();
const close = Array.from({ length: 60 }, (_, i) => 100 - i * 0.4);
const flat = td.batch(close.map(c => c + 0.3), close.map(c => c - 0.3), close);
console.log('row 30: setup =', flat[30 * 2], 'countdown =', flat[30 * 2 + 1]);
```

### Streaming

```rust
use wickra::{Candle, Indicator, TdSequential};

let mut td = TdSequential::classic();
for bar in candle_stream {
    if let Some(o) = td.update(bar) {
        if o.countdown == 13 { /* high-conviction buy */ }
        if o.countdown == -13 { /* high-conviction sell */ }
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
- **Risk management.** Pair with [TdLines](Indicator-TdLines) for
  invalidation levels and [TdRiskLevel](Indicator-TdRiskLevel) for
  protective stops.

## Common pitfalls

- **Trading on Setup 9 alone.** Setup 9 is the gate, Countdown 13
  is the entry. Mixing them up halves the signal's edge.
- **Resetting Countdown manually on session boundaries.**
  Sequential is bar-stream agnostic; do not reset on session
  boundaries.
- **Ignoring direction.** The signed output makes direction
  explicit; ignoring it produces inverted signals.

## References

- Tom DeMark, *The New Science of Technical Analysis* (1994) —
  original full Sequential treatment.
- *DeMark on Day Trading Options* (1999) — recycle, deferred
  countdown, and other edge-case rules.

## See also

- [TdSetup](Indicator-TdSetup) — Setup-only variant.
- [TdCountdown](Indicator-TdCountdown) — Countdown-only variant.
- [TdCombo](Indicator-TdCombo) — faster, stricter countdown
  variant.
- [TdLines](Indicator-TdLines) — TDST support/resistance lines.
- [TdRiskLevel](Indicator-TdRiskLevel) — protective-stop levels.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
