# AdaptiveLaguerre

> Ehlers' Adaptive Laguerre Filter — a four-stage Laguerre smoother whose
> damping factor adapts each bar to how well it is tracking price, speeding up
> when price is calm and slowing down when it jumps.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Moving Averages |
| Input type | `f64` (single price) |
| Output type | `f64` (smoothed price) |
| Output range | bounded by the price range it has seen; never overshoots |
| Default parameters | `period` (error-window length) is required |
| Warmup period (`warmup_period()`) | `period` — first emission once the error window is full |
| Interpretation | Self-tuning smoother: fast in calm markets, slow on shocks. |

## Formula

```
diff_t = |price_t − filter_{t-1}|                 (0 on the first bar)
over the last `period` diffs:
   HH = max(diff),  LL = min(diff)
   norm_i = (diff_i − LL) / (HH − LL)             (0 if HH == LL)
   gamma  = median(norm)
alpha = 1 − gamma
L0_t = alpha·price_t + gamma·L0_{t-1}
L1_t = −gamma·L0_t + L0_{t-1} + gamma·L1_{t-1}
L2_t = −gamma·L1_t + L1_{t-1} + gamma·L2_{t-1}
L3_t = −gamma·L2_t + L2_{t-1} + gamma·L3_{t-1}
filter_t = (L0_t + 2·L1_t + 2·L2_t + L3_t) / 6
```

The Laguerre cascade is the same one [`LaguerreRsi`](/Indicators/Indicator-LaguerreRsi)
wraps, but here `gamma` is **adaptive**. Each bar the filter measures its own
tracking error `|price − filter|`, normalises the last `period` errors to
`[0, 1]`, and takes their median as `gamma`. Small, uniform errors (price is
being tracked well) give a low `gamma` and a fast filter; a sudden jump widens
the error spread, pushes `gamma` up, and damps the response so the shock is
smoothed rather than chased.

Source: `crates/wickra-core/src/indicators/adaptive_laguerre_filter.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= 1`      | `adaptive_laguerre_filter.rs:73` | Length of the error window used to compute the adaptive `gamma`. `period = 0` errors with `Error::PeriodZero`. Larger windows make `gamma` steadier. |

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

`warmup_period()` returns `period`: the adaptive `gamma` is only meaningful once
the error window holds `period` values, so the first non-`None` output lands on
input `period` (index `period − 1`). Pinned by `accessors_and_metadata`
(`warmup_period() == 13` for `AdaptiveLaguerreFilter::new(13)`) and by
`warmup_returns_none_until_window_full`, which asserts the first two inputs of a
filter with `period = 3` return `None` and the third returns `Some`.

Note the Laguerre cascade itself cold-starts from zero, so the early post-warmup
values are a transient that converges onto the price; see the example below.

## Edge cases

- **Constant series.** Errors collapse and the four-stage delay line fills with
  the constant, so the filter converges onto it. Pinned by
  `constant_series_converges_to_constant` (`[42.0; 40]`, last value `42.0`).
- **No overshoot (converged).** Once the cascade has filled, the filter is a
  convex blend of recent prices and stays inside the data range;
  `converged_output_stays_within_price_range` pins every emitted value past the
  cold-start transient to the window's min/max on an oscillating series.
- **NaN / infinity inputs.** Non-finite inputs are ignored and the current value
  is returned, pinned by `ignores_non_finite_input`.
- **Reset.** `reset()` clears the four Laguerre stages, the prior filter, and
  the error window — pinned by `reset_clears_state`.
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

Output (the tail, showing convergence onto the constant):

```
warmup_period = 5
[Some(41.9985), Some(41.9998), Some(42.0), Some(42.0)]
```

The full batch over `[42.0; 20]` is:

```
[None, None, None, None, 14.4737, 23.3284, 24.7853, 26.3921, 34.4177,
 37.2748, 38.0243, 40.3457, 41.4393, 41.6849, 41.8779, 41.9762, 41.9943,
 41.9985, 41.9998, 42.0]
```

The leading `None`s are warmup; the values that follow are the Laguerre cascade
filling from a cold start and converging onto the constant `42`.

### Python

```python
import numpy as np
import wickra as ta

alf = ta.AdaptiveLaguerre(5)
out = alf.batch(np.full(20, 42.0))
print("warmup_period =", alf.warmup_period())
print(np.round(out[-4:], 4))
```

Output:

```
warmup_period = 5
[41.9985 41.9998 42.     42.    ]
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
[ 41.9985, 41.9998, 42, 42 ]
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

1. **Calm, trending market** → errors small and uniform → `gamma` low → fast,
   low-lag tracking.
2. **Shock / regime change** → error spread widens → `gamma` high → the filter
   damps and rejects the jump instead of chasing it.

Use it as a trend baseline that stays tight in quiet conditions yet does not
whipsaw through volatility clusters. Compare it with a fixed
[`Ema`](/Indicators/Indicator-Ema): the adaptive filter will hug price more closely when
calm and pull back harder when price gaps.

## Common pitfalls

- **Reading the warmup transient as signal.** The Laguerre stages cold-start
  from zero, so the first several post-warmup values ramp up toward price. Allow
  a few extra bars beyond `warmup_period()` before trusting the level on a cold
  start.
- **Tiny windows.** A very small `period` makes `gamma` jumpy (the median is
  taken over few points). Use a window of roughly 8–20 for a stable adaptation.

## References

John F. Ehlers, *"Adaptive Laguerre Filter"*, Technical Analysis of Stocks &
Commodities, 2007. See also Ehlers, *Cybernetic Analysis for Stocks and
Futures*, 2004, for the underlying Laguerre filter.

## See also

- [Indicator-LaguerreRsi](/Indicators/Indicator-LaguerreRsi) — the fixed-`gamma` Laguerre cascade in an RSI wrapper.
- [Indicator-Kama](/Indicators/Indicator-Kama) — Kaufman's adaptive moving average (efficiency-ratio damping).
- [Indicator-Frama](/Indicators/Indicator-Frama) — fractal-adaptive moving average.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
