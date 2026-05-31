# WaveTrend

> LazyBear's Wave Trend Oscillator — a two-line mean-reverting momentum gauge
> built from the typical price and three cascaded EMAs. Most useful at
> extremes, where `wt1` crossing back through `wt2` flags reversals.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trend & Directional |
| Input type | `Candle` (uses `high`, `low`, `close` to form the typical price `ap`) |
| Output type | `WaveTrendOutput { wt1, wt2 }` |
| Output range | unbounded; typically `[−100, +100]` in practice, extremes near `±60` |
| Default parameters | `channel_period = 10`, `average_period = 21`, `signal_period = 4` |
| Warmup period | `2 · channel + average + signal − 3` (`42` for classic) |
| Interpretation | `wt1` crossing above `wt2` from `< −60` is bullish; crossing below from `> +60` is bearish. |

## Formula

```
ap_t  = (high_t + low_t + close_t) / 3
esa_t = EMA(ap, channel)
d_t   = EMA(|ap − esa|, channel)
ci_t  = (ap_t − esa_t) / (0.015 · d_t)
wt1_t = EMA(ci, average)
wt2_t = SMA(wt1, signal)
```

On a perfectly flat market the SMA-seeded EMA introduces a single-ULP drift
between `ap` and `esa`, which would otherwise make the ratio explode to
`−1/0.015 = −66.67`. The implementation guards with a price-scaled flat
tolerance (`d <= 16 · EPSILON · max(|esa|, 1)` ⇒ `ci := 0`), so a fully
motionless market reports `(0, 0)`.

## Parameters

| Name             | Type    | Default | Constraint | Source |
|------------------|---------|---------|------------|--------|
| `channel_period` | `usize` | `10`    | `>= 1`     | `WaveTrend::new` (`wave_trend.rs:77`) |
| `average_period` | `usize` | `21`    | `>= 1`     | `wave_trend.rs:77` |
| `signal_period`  | `usize` | `4`     | `>= 1`     | `wave_trend.rs:77` |

Any zero period returns [`Error::PeriodZero`]. `WaveTrend::classic()` returns
`(10, 21, 4)` (as a `Result`). Python defaults come from the pyo3 signature;
the Node constructor takes all three explicitly. The public class is
`WaveTrend` in both bindings.

## Inputs / Outputs

```rust
use wickra::{Indicator, WaveTrend, Candle, WaveTrendOutput};
// WaveTrend: Input = Candle, Output = WaveTrendOutput
const _: fn(&mut WaveTrend, Candle) -> Option<WaveTrendOutput> = <WaveTrend as Indicator>::update;
```

- **Python.** `update(candle)` returns `(wt1, wt2)` or `None`;
  `batch(high, low, close)` returns an `(n, 2)` `np.ndarray` with columns
  `[wt1, wt2]`; warmup rows are `NaN`.
- **Node.** `update(high, low, close)` returns a `{ wt1, wt2 }` object or
  `null`; `batch(high, low, close)` returns a flat `Array<number>` of length
  `2n`, interleaved `[wt1_0, wt2_0, …]`.

## Warmup

`warmup_period()` returns `2 · channel + average + signal − 3`. `esa` emits at
`channel` inputs; the deviation EMA needs `channel` of its own values
(ready at `2·channel − 1`); `wt1`'s EMA adds `average − 1`; the `wt2` SMA adds
`signal − 1`. For the classic config that is `2·10 + 21 + 4 − 3 = 42`. Pinned
by `first_emission_at_warmup_period`.

## Edge cases

- **Flat market.** The flat-tolerance guard collapses `ci` to `0`, so both
  lines stay at `0` (test `constant_series_yields_zero_lines`).
- **Pure trend.** A clean uptrend drives both lines positive (test
  `pure_uptrend_is_positive`); the downtrend mirror is negative.
- **Always finite.** Both lines stay finite across volatile inputs (test
  `outputs_remain_finite`).
- **Reset.** `reset()` resets all three EMAs and the signal SMA.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, WaveTrend};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..120)
        .map(|i| {
            let base = 100.0 + f64::from(i) * 0.5;
            Candle::new(base, base + 1.0, base - 0.5, base + 0.5, 1.0, i64::from(i)).unwrap()
        })
        .collect();
    let mut w = WaveTrend::classic()?; // (10, 21, 4)
    if let Some(o) = w.batch(&candles).into_iter().flatten().last() {
        println!("wt1={:.3} wt2={:.3}", o.wt1, o.wt2);
    }
    Ok(())
}
```

### Python

```python
import wickra as ta
w = ta.WaveTrend(10, 21, 4)
out = w.batch(high, low, close)  # shape (n, 2): [wt1, wt2]
```

### Node

```javascript
const ta = require('wickra');
const w = new ta.WaveTrend(10, 21, 4);
const o = w.update(101, 99, 100); // null during warmup, else { wt1, wt2 }
```

## Interpretation

WaveTrend is a CCI-like typical-price oscillator with extra EMA smoothing,
designed to be read at its extremes:

1. **Crossover at extremes.** The canonical LazyBear signal is `wt1` crossing
   above `wt2` while both are oversold (`wt1 < −60`), and the mirror in the
   overbought zone (`wt1 > +60`). Mid-range crossovers are weak.
2. **Divergence.** Price making a new high while `wt1` does not is a classic
   momentum-divergence reversal cue.

## Common pitfalls

- **Trading mid-range crossovers.** WaveTrend is intentionally mean-reverting;
  signals away from the `±60` zones are low-conviction.
- **`classic()` returns a `Result`.** Unlike most `classic()` constructors in
  the library, `WaveTrend::classic()` is fallible — unwrap or `?` it.

## References

- LazyBear, "Indicator: WaveTrend Oscillator [WT]" — TradingView Pine script,
  2014. The construction mirrors the typical-price CCI with an added EMA
  smoothing on the `0.015`-scaled deviation.

## See also

- [Cci](Indicator-Cci) — the typical-price oscillator WaveTrend generalises.
- [StochRsi](Indicator-StochRsi) — another bounded mean-reverting oscillator.
- [Smi](Indicator-Smi) — Blau's doubly-smoothed stochastic momentum.
