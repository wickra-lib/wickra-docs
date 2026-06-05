# Connors RSI (CRSI)

> Larry Connors' three-component composite RSI. Averages a fast RSI
> on close, an RSI on the up/down streak run-length, and a percent
> rank of the 1-period return — all individually bounded in
> `[0, 100]`, so the composite is too. Designed for short-term
> mean-reversion: Connors' rule-of-thumb is `CRSI < 5` is oversold
> and `CRSI > 95` is overbought, both rare conditions on the
> recommended `(3, 2, 100)` configuration.

## Quick reference

| Item                | Value                                                                                          |
|---------------------|------------------------------------------------------------------------------------------------|
| Family              | Momentum Oscillators                                                                            |
| Input type          | `f64` (close)                                                                                  |
| Output type         | `f64`                                                                                          |
| Output range        | `[0, 100]`                                                                                     |
| Default parameters  | `period_rsi = 3`, `period_streak = 2`, `period_rank = 100` (`ConnorsRsi::classic()`)           |
| Warmup period       | `max(period_rsi + 1, period_streak + 2, period_rank + 1)` — `101` for classic                  |
| Interpretation      | `< 5` oversold, `> 95` overbought; cross of 50 is the mid-bias flip                            |

## Formula

Three components, each bounded in `[0, 100]`:

```
1. close_rsi_t    = RSI(close, period_rsi)_t

2. streak_t       = +1, +2, ...  for runs of consecutive up closes
                    -1, -2, ...  for runs of consecutive down closes
                    0            on an unchanged close
   streak_rsi_t   = RSI(streak, period_streak)_t

3. roc1_t         = (close_t − close_{t−1}) / close_{t−1}
   percent_rank_t = 100 * count(r in last period_rank rocs where r < roc1_t)
                    / period_rank

CRSI_t = (close_rsi_t + streak_rsi_t + percent_rank_t) / 3
```

The streak counter resets to `0` on an unchanged close. The ROC
window is skipped on bars where `prev_close == 0.0` (return
undefined). See
`crates/wickra-core/src/indicators/connors_rsi.rs:89-135`.

## Parameters

| Name             | Type    | Default | Constraint | Description |
|------------------|---------|---------|------------|-------------|
| `period_rsi`     | `usize` | `3`     | `> 0`      | Period of the close-based RSI component. |
| `period_streak`  | `usize` | `2`     | `> 0`      | Period of the streak-based RSI component. |
| `period_rank`    | `usize` | `100`   | `> 0`      | Lookback for the 1-period return percent rank. |

`ConnorsRsi::new` returns `Error::PeriodZero` if any of the three
periods is zero. `ConnorsRsi::classic()` returns the `(3, 2, 100)`
factory (`connors_rsi.rs:74-77`).

## Inputs / Outputs

`Indicator<Input = f64, Output = f64>`. Python: `ConnorsRSI.batch(prices)`
returns a 1-D `np.ndarray` with `NaN` in the warmup prefix. Node:
`ConnorsRSI.batch(prices)` returns `Array<number>` (`NaN` in warmup
slots); `update(value)` returns `number | null`.

## Warmup

`warmup_period() == max(period_rsi + 1, period_streak + 2, period_rank + 1)`.

- The close-RSI needs `period_rsi + 1` prices to seed.
- The streak-RSI needs `period_streak + 1` *streak* values, each of
  which itself requires a prior price — so `period_streak + 2` prices.
- The percent-rank branch needs `period_rank + 1` prices
  (`period_rank` 1-period returns).

For classic `(3, 2, 100)` parameters the rank branch dominates at
`101`. Pinned by `accessors_and_metadata`
(`connors_rsi.rs:181-187`) and `warmup_emits_first_value_at_warmup_period`
(`connors_rsi.rs:195-206`).

## Edge cases

- **Unchanged close.** Streak resets to `0`; pinned by
  `streak_resets_to_zero_on_unchanged_close`
  (`connors_rsi.rs:241-254`).
- **Non-finite input.** `NaN` / `±∞` are dropped — the indicator
  returns its previous value without advancing state. Pinned by
  `ignores_non_finite_input`.
- **`prev_close == 0.0`.** The 1-period return is undefined; the
  ROC window is left unchanged on that bar. Pinned by
  `zero_prev_skips_roc_update`.
- **Output bounded `[0, 100]`.** Each component is in `[0, 100]`,
  so the average must be too. Pinned by `output_is_bounded` on a
  300-bar sine wave.
- **Pure uptrend.** All three components are pushed toward 100; the
  composite stays well above 50 (`pure_uptrend_saturates_high`
  asserts > 60 on a monotonic 1..=200 ramp with classic params).
- **Reset.** `reset()` clears both inner RSIs, the streak counter,
  the previous price, the ROC window, and the cached output.

## Examples

### Rust

```rust
use wickra::{BatchExt, ConnorsRsi, Indicator};

fn main() {
    let prices: Vec<f64> = (1..=200)
        .map(|i| 100.0 + (f64::from(i) * 0.2).sin() * 5.0 + f64::from(i) * 0.1)
        .collect();
    let mut crsi = ConnorsRsi::classic();
    let out = crsi.batch(&prices);
    let v = out[120].unwrap();
    println!("row 120 CRSI = {v:.4}");
}
```

### Python

```python
import numpy as np
import wickra as ta

prices = 100 + np.sin(np.linspace(0, 30, 200)) * 5 + np.arange(200) * 0.1
crsi = ta.ConnorsRSI(3, 2, 100)
out = crsi.batch(prices)
print('warmup:', crsi.warmup_period())  # 101
print('row 120:', out[120])
```

### Node

```javascript
const wickra = require('wickra');

const crsi = new wickra.ConnorsRSI(3, 2, 100);
const prices = Array.from({ length: 200 },
  (_, i) => 100 + Math.sin(i * 0.2) * 5 + i * 0.1);
const out = crsi.batch(prices);
console.log('row 120:', out[120]);
```

### Streaming

```rust
use wickra::{ConnorsRsi, Indicator};

let mut crsi = ConnorsRsi::classic();
let price_stream: Vec<f64> = Vec::new(); // your live price feed
for bar in price_stream {
    if let Some(v) = crsi.update(bar) {
        if v < 5.0 { /* extreme oversold — Connors fade-the-dip setup */ }
        if v > 95.0 { /* extreme overbought */ }
    }
}
```

## Interpretation

CRSI is a **short-term mean-reversion oscillator**. Connors'
canonical use:

- **CRSI < 5.** Enter long with a price-confirmation trigger
  (e.g. close above the prior bar's high), exit when CRSI > 50 or
  on a fixed N-day timeout.
- **CRSI > 95.** Symmetric short setup, though much less common in
  bull-biased equity tape.

Because each component is itself a mean-reversion-flavoured measure,
CRSI extremes are rarer than RSI extremes. A standard 2-period RSI
hits `< 5` reasonably often; CRSI `< 5` requires *all three*
components to be near zero simultaneously, which is a much stronger
condition.

## Common pitfalls

- **Treating CRSI like RSI.** Same scale, very different
  distribution. CRSI 30 is not "oversold" — it's roughly average.
  Calibrate thresholds against the historical CRSI distribution of
  the instrument you're trading.
- **Insufficient warmup.** The default `period_rank = 100` means
  the first 101 bars return no value. Short backtests on small data
  windows will look entirely like warmup.
- **Streak-reset surprise.** A single unchanged close resets the
  streak to 0, which sharply drops the streak-RSI component. On
  thinly-traded instruments with frequent flat closes this can
  generate spurious CRSI swings.

## References

- Larry Connors & Cesar Alvarez, *Short Term Trading Strategies
  That Work* (2009) — the original introduction of CRSI as a
  refinement over RSI(2).
- Connors Research, *An Introduction to ConnorsRSI* (2012, white
  paper) — formal definition.

## See also

- [Rsi](/Indicators/Indicator-Rsi) — the underlying building block.
- [LaguerreRsi](/Indicators/Indicator-LaguerreRsi) — Ehlers' alternative
  smoothing-based RSI variant.
- [StochRsi](/Indicators/Indicator-StochRsi) — another RSI composite that
  rescales RSI through a stochastic.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
