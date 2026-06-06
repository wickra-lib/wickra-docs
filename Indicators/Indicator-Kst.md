# KST

> Martin Pring's Know Sure Thing — a long-horizon momentum oscillator
> combining four SMA-smoothed [Roc](/Indicators/Indicator-Roc) series with Pring's fixed
> weights `1, 2, 3, 4`, plus an SMA signal line.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Momentum Oscillators |
| Input type | `f64` (single close) |
| Output type | `KstOutput { kst, signal }` |
| Output range | unbounded around zero |
| Default parameters | Pring's classic `(10, 15, 20, 30, 10, 10, 10, 15, 9)` |
| Warmup period | `max(roc_i + sma_i) + signal_period − 1` (`53` for classic) |
| Interpretation | A cross of the `kst` line above its `signal` is bullish; below is bearish. |

## Formula

```
RCMA_i = SMA(ROC(close, roc_i), sma_i)        for i = 1..=4
KST    = 1·RCMA_1 + 2·RCMA_2 + 3·RCMA_3 + 4·RCMA_4
Signal = SMA(KST, signal_period)
```

`Kst::classic()` applies Pring's recommended defaults: ROC lookbacks
`(10, 15, 20, 30)`, RCMA smoothing `(10, 10, 10, 15)`, signal `9`. The
ascending `1·…4·` weights make the longest-lookback ROC dominate, so KST is a
*long-term* momentum gauge — slower and smoother than a single ROC or MACD.

## Parameters

Nine `usize` parameters, all required non-zero (zero returns
[`Error::PeriodZero`]):

| Name            | Default        | Description |
|-----------------|----------------|-------------|
| `roc1 … roc4`   | 10, 15, 20, 30 | Lookback for the four ROC series. |
| `sma1 … sma4`   | 10, 10, 10, 15 | Smoothing length for each `RCMA_i`. |
| `signal`        | 9              | Smoothing length for the signal line. |

Source: `Kst::new` (`kst.rs:72`). `Kst::classic()` returns
`(10, 15, 20, 30, 10, 10, 10, 15, 9)`. Python defaults come from the pyo3
signature; the Node constructor takes all nine explicitly. The public class
is `KST` in both bindings.

## Inputs / Outputs

```rust
use wickra::{Indicator, Kst, KstOutput};
// Kst: Input = f64, Output = KstOutput
const _: fn(&mut Kst, f64) -> Option<KstOutput> = <Kst as Indicator>::update;
```

- **Python.** `update(value)` returns `(kst, signal)` or `None`;
  `batch(prices)` returns an `(n, 2)` `np.ndarray` with columns
  `[kst, signal]`; warmup rows are `NaN`.
- **Node.** `update(value)` returns a `{ kst, signal }` object or `null`;
  `batch(prices)` returns a flat `Array<number>` of length `2n`, interleaved
  `[kst0, signal0, …]`.

## Warmup

`warmup_period()` returns `max_i(roc_i + sma_i) + signal_period − 1`. Each
RCMA branch is ready once its inner ROC has warmed (`roc_i + 1` inputs) and
its SMA has filled; the four run in parallel, so the slowest branch dominates,
and the signal SMA adds `signal_period − 1` on top. For the classic config the
slowest branch is `ROC(30) + SMA(15) = 45`, plus `9 − 1 = 8`, so KST emits at
input `53`. Pinned by `warmup_emits_first_value_at_warmup_period`.

## Edge cases

- **Constant series.** ROC is `0` on a flat series, so every RCMA and the KST
  itself are `0`, and the signal inherits `0` (test `constant_series_yields_zero`).
- **Pure uptrend.** Every ROC > 0 ⇒ every RCMA > 0 ⇒ KST and signal > 0 (test
  `pure_uptrend_is_positive`).
- **Reset.** `reset()` resets all four ROCs, all five SMAs and both held
  values.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, Kst};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prices: Vec<f64> = (1..=120).map(|i| f64::from(i) * 2.0).collect();
    let mut kst = Kst::classic();
    if let Some(o) = kst.batch(&prices).into_iter().flatten().last() {
        println!("kst={:.4} signal={:.4}", o.kst, o.signal);
    }
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

kst = ta.KST(10, 15, 20, 30, 10, 10, 10, 15, 9)
out = kst.batch(prices)  # shape (n, 2): [kst, signal]
line, signal = out[:, 0], out[:, 1]
```

### Node

```javascript
const ta = require('wickra');
const kst = new ta.KST(10, 15, 20, 30, 10, 10, 10, 15, 9);
const o = kst.update(101.5); // null during warmup, else { kst, signal }
```

## Interpretation

KST reads long-term momentum by stacking four rate-of-change windows:

1. **Signal-line crossovers.** The primary signal is the `kst` line crossing
   its `signal` SMA — up is bullish, down is bearish. Because of the long
   lookbacks these are infrequent, high-conviction turns.
2. **Zero-line and divergence.** KST above zero confirms an uptrend regime;
   divergence between price and KST flags weakening momentum before price
   turns.

## Common pitfalls

- **Using it for short-term timing.** KST is deliberately slow (classic
  warmup 53 bars); it is a regime/position filter, not a scalping trigger.
- **Tuning all nine knobs blindly.** Pring's weights and periods are
  balanced; change them only with a clear reason, or stick to `classic()`.

## References

- Martin J. Pring, "Summed Rate of Change (KST)", *Technical Analysis of
  Stocks & Commodities*, 1992.

## See also

- [Roc](/Indicators/Indicator-Roc) — the building block KST sums.
- [Coppock](/Indicators/Indicator-Coppock) — another weighted-ROC long-term momentum
  curve.
- [Pmo](/Indicators/Indicator-Pmo) — the DecisionPoint Price Momentum Oscillator, a
  related smoothed-ROC gauge.
