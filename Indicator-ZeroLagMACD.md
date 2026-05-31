# ZeroLagMACD

> The classic MACD topology with ZLEMA (zero-lag exponential moving
> average) substituted for EMA everywhere. The de-lagged construction
> of ZLEMA makes the MACD line react faster to trend changes at the
> cost of slightly noisier readings — particularly useful for
> shorter-timeframe systems where the standard `MACD(12, 26, 9)`
> signal arrives too late to be actionable.

## Quick reference

| Item                | Value                                                                                       |
|---------------------|---------------------------------------------------------------------------------------------|
| Family              | Price Oscillators                                                                            |
| Input type          | `f64` (close)                                                                                |
| Output type         | `ZeroLagMacdOutput { macd, signal, histogram }`                                              |
| Output range        | unbounded; centred near zero                                                                 |
| Default parameters  | `fast = 12`, `slow = 26`, `signal = 9` (`ZeroLagMacd::classic()`)                            |
| Warmup period       | `zlema_warmup(slow) + zlema_warmup(signal) − 1` (50 for the classic configuration)           |
| Interpretation      | Same crossover semantics as MACD; ZLEMA substitution leads MACD by `~(period−1)/2` bars      |

## Formula

```
ZLEMA_n(x) = zero-lag exponential moving average of x over n periods
             ZLEMA seeds from a simple average of the first n inputs,
             then applies the de-lagged recursion (Ehlers 2002).

macd_t   = ZLEMA_fast(close)_t  −  ZLEMA_slow(close)_t
signal_t = ZLEMA_signal(macd)_t
hist_t   = macd_t − signal_t
```

`fast` must be strictly less than `slow`. The signal ZLEMA does not
start consuming inputs until `macd_t` becomes defined (i.e. until both
the fast and slow ZLEMAs have seeded). The internal `update` feeds
both inner ZLEMAs on every input so the slow one warms in parallel
with the fast one
(`crates/wickra-core/src/indicators/zero_lag_macd.rs:92-105`).

## Parameters

| Name     | Type    | Default | Constraint        | Description |
|----------|---------|---------|-------------------|-------------|
| `fast`   | `usize` | `12`    | `>= 1` and `< slow` | Fast ZLEMA period. |
| `slow`   | `usize` | `26`    | `>= 1` and `> fast` | Slow ZLEMA period. |
| `signal` | `usize` | `9`     | `>= 1`            | ZLEMA period applied to the raw MACD line. |

`ZeroLagMacd::new` returns `Error::PeriodZero` if any period is zero
and `Error::InvalidPeriod { message: "ZeroLagMACD fast period must be
strictly less than slow" }` if `fast >= slow`. `ZeroLagMacd::classic()`
returns the `(12, 26, 9)` factory (`zero_lag_macd.rs:78-80`).

## Inputs / Outputs

From `impl Indicator for ZeroLagMacd`:

```rust
use wickra::{Indicator, ZeroLagMacd, ZeroLagMacdOutput};
// ZeroLagMacd: Input = f64, Output = ZeroLagMacdOutput
const _: fn(&mut ZeroLagMacd, f64) -> Option<ZeroLagMacdOutput> = <ZeroLagMacd as Indicator>::update;
```

`ZeroLagMacdOutput` carries three fields:

| Field       | Description |
|-------------|-------------|
| `macd`      | `ZLEMA(fast) − ZLEMA(slow)` of the input series. |
| `signal`    | `ZLEMA(signal)` of `macd`. |
| `histogram` | `macd − signal`. |

- **Python.** `ZeroLagMACD.batch(prices)` returns an `(n, 3)`
  `float64` array with columns `[macd, signal, histogram]`; warmup
  rows are entirely `NaN`.
- **Node.** `ZeroLagMACD.batch(prices)` returns a flat `number[]` of
  length `n * 3` with `macd` / `signal` / `histogram` interleaved at
  indices `i*3`, `i*3+1`, `i*3+2`. The streaming `update(value)`
  returns `{ macd, signal, histogram } | null`.

## Warmup

`warmup_period()` returns `zlema_warmup(slow) + zlema_warmup(signal) − 1`
where `zlema_warmup(period) = (period − 1) / 2 + period`. The first
expression seats the slow ZLEMA; the signal ZLEMA then needs its own
`(period − 1) / 2 + period` MACD values on top, minus 1 because the
two phases overlap by exactly one bar.

| Config | `zlema_warmup(slow)` | `zlema_warmup(signal)` | warmup |
|--------|----------------------|------------------------|--------|
| `(12, 26, 9)` | `12 + 26 = 38` | `4 + 9 = 13` | `38 + 13 − 1 = 50` |
| `(3, 5, 3)`   | `2 + 5 = 7`    | `1 + 3 = 4`  | `7 + 4 − 1 = 10`  |

Pinned by the unit test `warmup_period_matches_zlema_chain`
(`zero_lag_macd.rs:213-225`).

## Edge cases

- **Constant input.** Each ZLEMA reproduces a constant, so `macd`
  approaches `0`; with no movement in `macd`, the signal ZLEMA also
  approaches `0`, and so does the histogram. Pinned by
  `constant_series_converges_to_zero`.
- **Histogram identity.** `histogram == macd − signal` is enforced
  by construction; the test
  `histogram_is_macd_minus_signal` checks it on a sine-wave price
  series.
- **`fast >= slow`.** Rejected by `new`; common bug when reading
  parameters from a config file.
- **Reset.** `reset()` resets all three inner ZLEMAs; the next
  `warmup_period()` updates return `None` again.
- **Non-finite input.** Delegated to the underlying ZLEMA; the EMA
  branch of ZLEMA preserves the previous value rather than poisoning
  the recursion with `NaN`.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, ZeroLagMacd};

fn main() {
    let prices: Vec<f64> = (1..=120)
        .map(|i| 100.0 + (f64::from(i) * 0.2).sin() * 5.0)
        .collect();
    let mut z = ZeroLagMacd::classic();
    let out = z.batch(&prices);
    let v = out[55].unwrap();
    println!("row 55  macd={:.6} signal={:.6} hist={:.6}",
             v.macd, v.signal, v.histogram);
}
```

### Python

```python
import numpy as np
import wickra as ta

prices = np.linspace(100.0, 120.0, 80)
z = ta.ZeroLagMACD(12, 26, 9)
out = z.batch(prices)
print('shape :', out.shape)        # (80, 3)
print('warmup:', z.warmup_period()) # 50
print('row 60:', out[60])           # macd, signal, hist
```

### Node

```javascript
const wickra = require('wickra');

const z = new wickra.ZeroLagMACD(12, 26, 9);
const prices = Array.from({ length: 80 }, (_, i) => 100 + i * 20 / 79);
const flat = z.batch(prices);
console.log('flat length:', flat.length); // 240
console.log('row 60:', flat[60 * 3], flat[60 * 3 + 1], flat[60 * 3 + 2]);
```

### Streaming

```rust
use wickra::{Indicator, ZeroLagMacd};

let mut z = ZeroLagMacd::classic();
let price_stream: Vec<f64> = Vec::new(); // your live price feed
for px in price_stream {
    if let Some(v) = z.update(px) {
        if v.histogram > 0.0 && /* prev hist <= 0 */ true {
            // bullish histogram cross
        }
    }
}
```

## Interpretation

- **Signal-line crossover.** As with MACD, `macd` crossing above
  `signal` is bullish; the symmetric crossover below is bearish. The
  `histogram` makes this explicit — it crosses zero on the same bar.
- **Earlier than MACD.** The ZLEMA substitution removes roughly
  `(period − 1) / 2` bars of lag at each smoothing stage. For
  classic `(12, 26, 9)` parameters that means the ZeroLagMACD signal
  fires ~5-6 bars before MACD on a clean trend turn. The cost is a
  higher false-cross rate during chop.
- **Pairs with MACD.** Some traders run both indicators side by side:
  trade only when ZeroLagMACD *and* MACD agree on direction —
  ZeroLagMACD provides the early entry trigger, MACD provides the
  confirmation gate.

## Common pitfalls

- **Treating it as a drop-in MACD replacement.** The warmup is
  longer (50 vs 34 for classic params) because ZLEMA's `period +
  (period−1)/2` warmup is longer than EMA's `period`. Allocate enough
  history before the first signal.
- **Misreading the "zero-lag" promise.** ZLEMA reduces lag against a
  linear-trend reference; it does not eliminate it. Against a
  step-change input the response is still smoothed.
- **Histogram-only systems.** A histogram-zero-cross trigger on
  ZeroLagMACD fires more often than on MACD; pair it with a wider
  trend filter (e.g. a slow EMA slope, or ADX > threshold) to avoid
  whipsaw in ranges.

## References

- John Ehlers, *Rocket Science for Traders* (2001), Chapter on
  ZLEMA / removing lag from EMAs.
- John Ehlers & Ric Way, *Zero Lag (well, almost)*, *Technical
  Analysis of Stocks & Commodities*, November 2010 — refined
  treatment of the ZLEMA construction used here.
- Gerald Appel, *Technical Analysis: Power Tools for Active
  Investors* (2005) — canonical MACD topology that ZeroLagMACD
  inherits.

## See also

- [MacdIndicator](Indicator-MacdIndicator) — the EMA-based original
  this indicator de-lags.
- [Zlema](Indicator-Zlema) — the building block; understanding its
  warmup is key to understanding ZeroLagMACD's warmup.
- [Stc](Indicator-Stc) — Schaff Trend Cycle, another faster-than-MACD
  alternative built on top of MACD.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
