# ElderImpulse

> Alexander Elder's Impulse System — a tri-state momentum gauge combining
> the slope of an EMA trend filter with the slope of the MACD histogram.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Oscillators |
| Input type | `f64` (single close) |
| Output type | `f64` — one of `{−1, 0, +1}` |
| Output range | `{−1, 0, +1}` |
| Default parameters | `ema_period = 13`, `macd = 12 / 26 / 9` |
| Warmup period | `max(ema_period, macd_slow + macd_signal − 1) + 1` |
| Interpretation | `+1` green / buy, `−1` red / sell, `0` blue / neutral. |

## Formula

On each bar, after warmup:

```
ema_rising  = EMA(close, ema_period)_t > EMA(close, ema_period)_{t-1}
hist_rising = MACD.histogram_t        > MACD.histogram_{t-1}

if  ema_rising  and  hist_rising : Impulse = +1
if  ema_falling and  hist_falling: Impulse = −1
otherwise                        : Impulse =  0
```

The trend filter (EMA) and momentum filter (MACD histogram) are fed on every
input so they warm up in parallel. Judging *direction* needs one extra bar
past the slowest branch, since both branches are compared against their own
previous value.

## Parameters

| Name          | Type    | Default | Constraint            | Source |
|---------------|---------|---------|-----------------------|--------|
| `ema_period`  | `usize` | `13`    | `>= 1`                | `ElderImpulse::new` (`elder_impulse.rs:49`) |
| `macd_fast`   | `usize` | `12`    | `>= 1`, `< macd_slow` | inner [MacdIndicator](/Indicators/Indicator-MacdIndicator) |
| `macd_slow`   | `usize` | `26`    | `>= 1`, `> macd_fast` | inner MACD |
| `macd_signal` | `usize` | `9`     | `>= 1`                | inner MACD |

`ema_period == 0` returns [`Error::PeriodZero`]; invalid MACD periods are
forwarded from [`MacdIndicator::new`] (e.g. `macd_fast >= macd_slow`).
`ElderImpulse::classic()` returns `(13, 12, 26, 9)`. Python defaults come
from the pyo3 signature; the Node constructor takes all four arguments
explicitly.

## Inputs / Outputs

```rust
use wickra::{Indicator, ElderImpulse};
// ElderImpulse: Input = f64, Output = f64
const _: fn(&mut ElderImpulse, f64) -> Option<f64> = <ElderImpulse as Indicator>::update;
```

A single `f64` close in, an `Option<f64>` out that is always one of
`{−1.0, 0.0, +1.0}`. Python maps this to `float | None` / a `float64`
`np.ndarray` with `NaN` warmup; Node to `number | null` / `Array<number>`.

## Warmup

`warmup_period()` returns `max(ema_period, macd_slow + macd_signal − 1) + 1`.
The `+ 1` is the extra bar needed to compare each branch with its previous
value. For the classic config that is `max(13, 26 + 9 − 1) + 1 = 35`. Pinned
by `warmup_emits_first_value_at_warmup_period` ((3, 2, 4, 3) → warmup 7:
inputs 1–6 return `None`, input 7 emits).

## Edge cases

- **Constant series.** Both the EMA and the MACD histogram are flat, so
  neither is rising nor falling ⇒ Impulse `= 0` (test
  `constant_series_yields_neutral`).
- **Pure uptrend.** The EMA rises and the histogram (eventually) rises with
  it, so the reading is `+1` or `0` — never `−1` (test
  `pure_uptrend_signals_buy`).
- **Reset.** `reset()` resets both branches and clears the previous-value
  state used for the slope comparison.

## Examples

### Rust

```rust
use wickra::{BatchExt, ElderImpulse, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prices: Vec<f64> = (1..=300).map(f64::from).collect();
    let mut elder = ElderImpulse::classic(); // (13, 12, 26, 9)
    let last = elder.batch(&prices).into_iter().flatten().last().unwrap();
    println!("impulse on a clean uptrend = {last}"); // 1.0 or 0.0, never -1.0
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

elder = ta.ElderImpulse(13, 12, 26, 9)
out = elder.batch(np.arange(1, 301, dtype=float))  # values in {-1, 0, 1}, NaN warmup
```

### Node

```javascript
const ta = require('wickra');
const elder = new ta.ElderImpulse(13, 12, 26, 9);
const v = elder.update(101.0); // null during warmup, else -1 | 0 | 1
```

## Interpretation

Elder's system colours each bar by the *agreement* of trend and momentum:

- **Green (`+1`).** Both the EMA trend and the MACD histogram are rising —
  Elder permits *long* entries and forbids shorts.
- **Red (`−1`).** Both are falling — *short* entries permitted, longs
  forbidden.
- **Blue (`0`).** They disagree — Elder's rule is to *hold* existing
  positions but take no new ones.

The Impulse is a permission filter layered on top of another entry method,
not a stand-alone signal: it tells you which *direction* of trade is allowed
this bar, not exactly when to pull the trigger.

## Common pitfalls

- **Trading the blue bars.** A `0` is not a reversal signal — it just means
  trend and momentum disagree. Elder uses it only to *block* new entries.
- **Expecting it before bar 35.** The two-derivative construction (slope of
  EMA, slope of MACD histogram) makes the warmup one bar longer than the
  slower of the two sub-indicators.

## References

- Alexander Elder, *Come Into My Trading Room*, Wiley, 2002 — the Impulse
  System chapter.

## See also

- [MacdIndicator](/Indicators/Indicator-MacdIndicator) — the momentum branch.
- [Ema](/Indicators/Indicator-Ema) — the trend branch.
- [Apo](/Indicators/Indicator-Apo) — the raw MACD line without the histogram slope.
