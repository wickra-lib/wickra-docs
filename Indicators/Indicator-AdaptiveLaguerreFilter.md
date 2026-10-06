# AdaptiveLaguerre

> Ehlers' Adaptive Laguerre Filter — a four-stage Laguerre smoother whose
> smoothing factor `alpha` adapts each bar to how well it is tracking price:
> a large tracking error speeds the filter up, a small one smooths harder.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Moving Averages |
| Input type | `f64` (single price) |
| Output type | `f64` (smoothed price) |
| Output range | same scale as price; stays inside the recent price range once settled |
| Default parameters | `period` (error-window length) is required |
| Warmup period (`warmup_period()`) | `period` — first emission once the error window is full |
| Interpretation | Self-tuning smoother: speeds up when it falls behind price, smooths heavily while it tracks well. |

## Formula

```
diff_t  = |price_t − filter_{t-1}|                (0 on the first bar)
HH_t, LL_t = max / min of the last `period` diffs
mid_t   = (diff_t − LL_t) / (HH_t − LL_t)          (only when HH_t ≠ LL_t)
alpha_t = median(mid over the last 5 bars)          (held when HH_t = LL_t;
                                                     1 before the first mid)
L0_t = alpha·price_t + (1 − alpha)·L0_{t-1}
L1_t = −(1 − alpha)·L0_t + L0_{t-1} + (1 − alpha)·L1_{t-1}
L2_t = −(1 − alpha)·L1_t + L1_{t-1} + (1 − alpha)·L2_{t-1}
L3_t = −(1 − alpha)·L2_t + L2_{t-1} + (1 − alpha)·L3_{t-1}
filter_t = (L0_t + 2·L1_t + 2·L2_t + L3_t) / 6
L0..L3 are seeded with the first price.
```

The Laguerre cascade is the same one [`LaguerreRsi`](/Indicators/Indicator-LaguerreRsi)
wraps (with `gamma = 1 − alpha`), but here the factor is **adaptive**. Each bar
the filter measures its own tracking error `|price − filter|`, normalises the
*newest* error against the range (`HH − LL`) of the last `period` errors, and
takes the **median of the last five** normalised errors as `alpha`. A large
tracking error relative to the recent range gives a large `alpha` — the filter
speeds up to catch price; small errors give a small `alpha` and heavy
smoothing. When every error in the window is identical (`HH == LL`) no new
normalised error is recorded and `alpha` is held at its previous value.

The four stages are seeded with the first price, so the cascade starts settled
rather than climbing up from zero. Until a first `alpha` can be measured it is
`1`, which makes the cascade a plain `(1, 2, 2, 1) / 6` weighting of the last
four prices.

Source: `crates/wickra-core/src/indicators/adaptive_laguerre_filter.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= 1`      | `adaptive_laguerre_filter.rs:83` | Length of the error window whose high/low (`HH`, `LL`) normalise the newest tracking error. `period = 0` errors with `Error::PeriodZero`. The median length (5) is fixed. |

(Python class `wickra.AdaptiveLaguerre(period)` has no `#[pyo3(signature)]`
default; pass `period` explicitly.)

## Inputs / Outputs

From `crates/wickra-core/src/indicators/adaptive_laguerre_filter.rs`:

```rust
use wickra::{AdaptiveLaguerreFilter, Indicator};
// AdaptiveLaguerreFilter: Input = f64, Output = f64
const _: fn(&mut AdaptiveLaguerreFilter, f64) -> Option<f64> =
    <AdaptiveLaguerreFilter as Indicator>::update;
```

Python returns `float | None` (streaming) / `array.array('d')` (batch, `NaN` for
warmup). Node returns `number | null` / `Array<number>` with `NaN`.

## Warmup

`warmup_period()` returns `period`: the adaptive `alpha` is only meaningful once
the error window holds `period` values, so the first non-`None` output lands on
input `period` (index `period − 1`). Pinned by `accessors_and_metadata`
(`warmup_period() == 13` for `AdaptiveLaguerreFilter::new(13)`) and by
`warmup_returns_none_until_window_full`, which asserts the first two inputs of a
filter with `period = 3` return `None` and the third returns `Some`.

The Laguerre stages are seeded with the first price, so there is no cold-start
ramp from zero: a constant series emits the constant from the first ready bar.

## Edge cases

- **Constant series.** Every error is zero, so `HH == LL`, `alpha` stays `1`
  and the seeded delay line already holds the constant. Pinned by
  `constant_series_converges_to_constant` (`[42.0; 40]`, last value `42.0`).
- **Stays inside the price range.** The filter is a blend of recent prices and
  stays inside the data range; `converged_output_stays_within_price_range` pins
  every emitted value past the first `4 · period` bars to the series' min/max on
  an oscillating series.
- **NaN / infinity inputs.** Non-finite inputs return `None` and leave the
  state untouched, pinned by `ignores_non_finite_input`.
- **Reset.** `reset()` clears the four Laguerre stages, the prior filter,
  `alpha` (back to `1`), the error window and the five-sample median buffer —
  pinned by `reset_clears_state`.
- **Equivalence to a from-scratch replay.** `matches_naive_recurrence` and
  `batch_equals_streaming` check the streaming output against an independent
  re-implementation of the recurrence.

## Examples

### Rust

```rust
use wickra::{AdaptiveLaguerreFilter, BatchExt, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut alf = AdaptiveLaguerreFilter::new(5)?;
    let out: Vec<Option<f64>> = alf.batch(&[42.0_f64; 20]);
    println!("warmup_period = {}", alf.warmup_period());
    println!("{:?}", out.iter().rev().take(4).rev().collect::<Vec<_>>());
    Ok(())
}
```

Output (the tail; the seeded stages hold the constant exactly):

```
warmup_period = 5
[Some(42.0), Some(42.0), Some(42.0), Some(42.0)]
```

The full batch over `[42.0; 20]` is four warmup `None`s followed by sixteen
`42.0`s. A ramp followed by a jump shows the adaptation (period 5):

```
input:  10    11    12    13    14    15    16    30       30       30       30
output: None  None  None  None  12.5  13.5  14.5  17.6667  22.8333  27.6667  29.4316
```

On the steady ramp every error is the same size, `alpha` stays `1` and the
output is the `(1, 2, 2, 1) / 6` weighting of the last four prices (a 1.5-bar
lag). The jump to `30` is a large error relative to the window, so `alpha`
stays high and the filter closes most of the gap within three bars.

### Python

```python
import numpy as np
import wickra as ta

alf = ta.AdaptiveLaguerre(5)
out = alf.batch(np.full(20, 42.0))
print("warmup_period =", alf.warmup_period())
print(np.round(np.asarray(out[-4:]), 4))
```

Output:

```
warmup_period = 5
[42. 42. 42. 42.]
```

### Node

```javascript
const ta = require('wickra');
const alf = new ta.AdaptiveLaguerre(5);
const out = alf.batch(Array.from({ length: 20 }, () => 42));
console.log(out.slice(-4).map((v) => Math.round(v * 1e4) / 1e4));
console.log('warmupPeriod:', alf.warmupPeriod());
```

Output:

```
[ 42, 42, 42, 42 ]
warmupPeriod: 5
```

### Streaming

```rust
use wickra::{AdaptiveLaguerreFilter, Indicator};

let mut alf = AdaptiveLaguerreFilter::new(8)?;
let mut last = None;
for i in 0..60 {
    last = alf.update(100.0 + (f64::from(i) * 0.4).sin() * 10.0);
}
println!("{last:?}"); // tracks the oscillation, smoothed and lag-adaptive
# Ok::<(), Box<dyn std::error::Error>>(())
```

## Interpretation

The adaptive Laguerre filter is the smoother to use when the **right amount of
smoothing changes with the market**. A fixed-`gamma` Laguerre (or any fixed-EMA)
forces one trade-off between lag and noise; this filter re-derives that
trade-off every bar from its own tracking error:

1. **Filter falling behind** (a breakout, gap or new trend leg) → the newest
   error is large relative to the recent error range → `alpha` high → the
   filter speeds up and catches price quickly.
2. **Filter tracking well** (chop around the filter) → the newest errors sit
   near the bottom of the recent range → `alpha` low → heavy smoothing that
   ignores the noise.

The median over five normalised errors keeps a single outlier bar from
flipping `alpha`. Use it as a trend baseline that reacts quickly to genuine
moves yet stays smooth while price merely oscillates around it. Compare it
with a fixed [`Ema`](/Indicators/Indicator-Ema): the adaptive filter closes
gaps faster after a jump and smooths harder in sideways noise.

## Common pitfalls

- **Expecting it to damp shocks.** It does the opposite: a jump is a large
  tracking error, which raises `alpha` and makes the filter *faster*. If you
  need shock rejection, use a fixed or median-based smoother.
- **Tiny windows.** A very small `period` makes the `HH`/`LL` range jumpy, so
  the normalised errors (and `alpha`) swing more. Use a window of roughly
  8–20 for a stable adaptation.

## References

John F. Ehlers, *"Adaptive Laguerre Filter"*, Technical Analysis of Stocks &
Commodities, 2007. See also Ehlers, *Cybernetic Analysis for Stocks and
Futures*, 2004, for the underlying Laguerre filter.

## See also

- [Indicator-LaguerreRsi](/Indicators/Indicator-LaguerreRsi) — the fixed-`gamma` Laguerre cascade in an RSI wrapper.
- [Indicator-Kama](/Indicators/Indicator-Kama) — Kaufman's adaptive moving average (efficiency-ratio damping).
- [Indicator-Frama](/Indicators/Indicator-Frama) — fractal-adaptive moving average.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
