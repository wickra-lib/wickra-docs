# QQE

> QQE — Quantitative Qualitative Estimation: a smoothed RSI with an "ATR of the
> RSI" trailing line, for cleaner momentum crossover signals.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Momentum Oscillators |
| Input type | `f64` (single price) |
| Output type | `QqeOutput { rsi_ma, trailing_line }` |
| Output range | `[0, 100]`-ish (RSI-scale); both lines move together |
| Default parameters | `rsi_period` (14), `smoothing` (5), `factor` (4.236) |
| Warmup period (`warmup_period()`) | `rsi_period + smoothing + 2·(2·rsi_period−1) − 2` (72 for defaults) |
| Interpretation | Smoothed RSI vs. its volatility trailing stop. |

## Formula

```
rsi_ma   = EMA(RSI(price, rsi_period), smoothing)
atr_rsi  = |rsi_ma − rsi_ma_prev|
ma_atr   = EMA(atr_rsi, 2·rsi_period − 1)          // Wilder length
dar      = EMA(ma_atr, 2·rsi_period − 1) · factor  // smoothed band width

long_band  = (rsi_ma_prev > long_band_prev  && rsi_ma > long_band_prev)
             ? max(long_band_prev,  rsi_ma − dar) : rsi_ma − dar
short_band = (rsi_ma_prev < short_band_prev && rsi_ma < short_band_prev)
             ? min(short_band_prev, rsi_ma + dar) : rsi_ma + dar
trend      = cross-up of short_band → +1, cross-down of long_band → −1, else hold
trailing_line = trend == +1 ? long_band : short_band
```

QQE smooths the RSI, measures that smoothed line's own "ATR" (the smoothed
absolute bar-to-bar change), and builds a trailing stop `±dar` around it. The
trailing line ratchets in the trend direction — only ever tightening until the
smoothed RSI crosses it — exactly like a [`SuperTrend`](Indicator-SuperTrend) on
the RSI. The `rsi_ma` crossing the `trailing_line` is the QQE signal.

Source: `crates/wickra-core/src/indicators/qqe.rs`.

## Parameters

| Name         | Type    | Default | Valid range | Source | Description |
|--------------|---------|---------|-------------|--------|-------------|
| `rsi_period` | `usize` | 14      | `>= 1`      | `qqe.rs:88` | RSI period (also sets the Wilder length `2·rsi_period−1`). |
| `smoothing`  | `usize` | 5       | `>= 1`      | `qqe.rs:88` | EMA smoothing of the RSI. |
| `factor`     | `f64`   | 4.236   | `> 0`, finite | `qqe.rs:92` | Trailing band width multiplier. |

`rsi_period`/`smoothing` of 0 error with `Error::PeriodZero`; a non-positive or
non-finite `factor` errors with `Error::InvalidPeriod`. (Python
`wickra.QQE(rsi_period, smoothing, factor)`; Node `new ta.QQE(...)`.)

## Inputs / Outputs

From `crates/wickra-core/src/indicators/qqe.rs`:

```rust
use wickra::{Indicator, Qqe, QqeOutput};
// Qqe: Input = f64, Output = QqeOutput
const _: fn(&mut Qqe, f64) -> Option<QqeOutput> = <Qqe as Indicator>::update;
```

Two outputs per bar. Node: `update(value)` returns
`{ rsiMa, trailingLine } | null`; `batch(values)` returns a flat `Array<number>`
of length `n*2` (`[rsiMa, trailingLine, …]`, `NaN` for warmup). Python:
`update(value)` returns `(rsi_ma, trailing_line) | None`; `batch(values)` returns
an `(n, 2)` `ndarray`.

## Warmup

`warmup_period()` chains the component warmups: `RSI (rsi_period + 1)` →
`rsi_ma EMA` → one bar to form the first `atr_rsi` → `ma_atr EMA` → `dar EMA`,
giving `rsi_period + smoothing + 2·(2·rsi_period − 1) − 2` = **72** for the
defaults. Pinned by `first_emission_matches_warmup` (first `Some` exactly at
`warmup_period() − 1`).

## Edge cases

- **Steady trend → both lines equal.** A pure trend pins the RSI, so `atr_rsi`,
  `ma_atr`, and `dar` collapse to `0` and both lines equal the smoothed RSI;
  shown below and checked by `trailing_line_below_rsi_ma_in_uptrend`.
- **Equivalence to the full recurrence.** `matches_naive_over_full_cycle` replays
  the entire band/trend state machine over an up-range-down series and asserts
  both outputs match bar-for-bar.
- **Bad params.** `rejects_bad_params` pins each error path.
- **Reset.** `reset_clears_state`. **Streaming/batch:** `batch_equals_streaming`.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, Qqe};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut qqe = Qqe::new(14, 5, 4.236)?;
    let prices: Vec<f64> = (1..=120).map(f64::from).collect();
    let last = qqe.batch(&prices).into_iter().flatten().last().unwrap();
    println!("warmup_period = {}", qqe.warmup_period());
    println!("rsi_ma={} trailing_line={}", last.rsi_ma, last.trailing_line);
    Ok(())
}
```

Output:

```
warmup_period = 72
rsi_ma=100 trailing_line=100
```

On a steady uptrend the RSI is pinned at `100`; its "ATR" is `0`, so `dar = 0`
and the trailing line sits exactly on the smoothed RSI at `100`.

### Python

```python
import numpy as np
import wickra as ta

qqe = ta.QQE(14, 5, 4.236)
out = qqe.batch(np.arange(1.0, 121.0))   # (120, 2): [rsi_ma, trailing_line]
print("warmup_period =", qqe.warmup_period())
print(out[-1])
```

Output:

```
warmup_period = 72
[100. 100.]
```

### Node

```javascript
const ta = require('wickra');
const qqe = new ta.QQE(14, 5, 4.236);
const prices = Array.from({ length: 120 }, (_, i) => i + 1);
const out = qqe.batch(prices); // flat [rsiMa, trailingLine, …], NaN warmup
console.log('warmupPeriod:', qqe.warmupPeriod());
console.log(out.slice(-2)); // [100, 100]
```

Output:

```
warmupPeriod: 72
[ 100, 100 ]
```

### Streaming

```rust
use wickra::{Indicator, Qqe};

let mut qqe = Qqe::new(14, 5, 4.236)?;
let mut last = None;
for i in 0..200 {
    last = qqe.update(100.0 + (f64::from(i) * 0.1).sin() * 8.0);
}
if let Some(v) = last {
    println!("rsi_ma={:.2} trailing_line={:.2}", v.rsi_ma, v.trailing_line);
}
# Ok::<(), Box<dyn std::error::Error>>(())
```

## Interpretation

QQE is a momentum-crossover system, not a level oscillator. The signal is the
**smoothed RSI crossing its trailing line**: `rsi_ma` crossing above
`trailing_line` is a long trigger, crossing below a short trigger. Because the
trailing line is a volatility-scaled stop on the RSI, it filters the small RSI
wiggles that would trip a raw RSI level cross.

Typical uses:

1. **Cross signals.** `rsi_ma` vs `trailing_line` crossovers time entries; the
   `dar` band makes them robust to RSI noise.
2. **Trend persistence.** The ratcheting trailing line keeps you in a move until
   a genuine momentum reversal crosses it.
3. **50-line context.** Combine crosses with the `rsi_ma`'s position relative to
   50 for a trend-filtered version.

## Common pitfalls

- **Treating `trailing_line` as overbought/oversold.** It is a trailing *stop*
  on the RSI, not a fixed level; read crossovers, not absolute values.
- **Long warmup.** With the defaults QQE needs 72 bars to start (two stacked
  Wilder-length EMAs); ensure enough history.

## References

Igor Livshin, *"Quantitative Qualitative Estimation"*, 2010 — the QQE built on
Wilder's RSI (1978).

## See also

- [Indicator-Rsi](Indicator-Rsi) — the oscillator QQE smooths and trails.
- [Indicator-SuperTrend](Indicator-SuperTrend) — the same trailing-stop idea on price.
- [Indicator-Rsx](Indicator-Rsx) — another smoothed-RSI refinement.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
