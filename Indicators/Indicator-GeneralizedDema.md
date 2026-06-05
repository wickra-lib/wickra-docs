# GD

> Generalized DEMA — Tim Tillson's volume-factor double EMA
> `(1 + v)·EMA − v·EMA(EMA)`, the building block of the [`T3`](/Indicators/Indicator-T3)
> exposed on its own. `v` dials continuously from a plain EMA to a full DEMA.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Moving Averages |
| Input type | `f64` (single price) |
| Output type | `f64` |
| Output range | unbounded; tracks the input price scale |
| Default parameters | `period` required; `v` defaults to `0.7` in the bindings |
| Warmup period (`warmup_period()`) | `2·period − 1` — exact first-emission index |
| Interpretation | Tunable lag reduction: `v = 0` → EMA, `v = 1` → DEMA. |

## Formula

```
GD = (1 + v) · EMA(price, period) − v · EMA(EMA(price, period), period)
```

Both EMAs share the same `period`. The volume factor `v ∈ [0, 1]` scales the
second-order lag correction:

- `v = 0` → `GD = EMA` (no correction).
- `v = 1` → `GD = 2·EMA − EMA(EMA)` = the standard [`Dema`](/Indicators/Indicator-Dema).
- `v = 0.7` (Tillson's default) → most of DEMA's lag reduction with less
  overshoot.

The coefficients `(1 + v)` and `−v` sum to `1`, so a constant series maps to
itself. Applying GD three times (with the binomial expansion of the volume
factor) is exactly how [`T3`](/Indicators/Indicator-T3) is built.

Source: `crates/wickra-core/src/indicators/generalized_dema.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= 1`        | `generalized_dema.rs:48` | Shared EMA period. `period = 0` errors with `Error::PeriodZero`. |
| `v`      | `f64`   | `0.7` (binding) | `[0.0, 1.0]` | `generalized_dema.rs:52` | Volume factor. Non-finite or out-of-range errors with `Error::InvalidPeriod`. |

(Python class `wickra.GD(period, v=0.7)`; Node `new ta.GD(period, v)`.)

## Inputs / Outputs

From `crates/wickra-core/src/indicators/generalized_dema.rs`:

```rust
use wickra::{GeneralizedDema, Indicator};
// GeneralizedDema: Input = f64, Output = f64
const _: fn(&mut GeneralizedDema, f64) -> Option<f64> =
    <GeneralizedDema as Indicator>::update;
```

Python returns `float | None` (streaming) / `numpy.ndarray` (batch, `NaN` for
warmup). Node returns `number | null` / `Array<number>` with `NaN`.

## Warmup

`warmup_period()` returns `2·period − 1`: EMA1 seeds at input `period`, then
EMA2 needs another `period − 1` of EMA1's outputs to seed — identical to
[`Dema`](/Indicators/Indicator-Dema). For `period = 5` that is `9`; the first non-`None`
output lands on input 9 (index 8). Pinned by `accessors_and_metadata`
(`warmup_period() == 9` for `GeneralizedDema::new(5, 0.7)`).

## Edge cases

- **`v = 1` equals DEMA.** `v_one_equals_dema` runs a `Dema` of the same period
  alongside and asserts identical readiness and values bar-for-bar.
- **`v = 0` equals EMA.** `v_zero_equals_ema` checks the output collapses to a
  plain EMA (the second EMA's coefficient is zero).
- **Constant series.** `constant_series_yields_constant` pins `[100.0; 60]` to
  `100.0` once warm (coefficients sum to 1).
- **Invalid parameters.** `rejects_zero_period` and
  `rejects_invalid_volume_factor` pin the `Error::PeriodZero` /
  `Error::InvalidPeriod` paths for `period = 0`, `v < 0`, `v > 1`, and `v = NaN`
  (with `v = 0.0` and `v = 1.0` accepted).
- **Reset.** `reset_clears_state` clears both internal EMAs.

## Examples

### Rust

```rust
use wickra::{BatchExt, GeneralizedDema, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut gd = GeneralizedDema::new(5, 0.7)?;
    let prices: Vec<f64> = (1..=20).map(f64::from).collect();
    let out: Vec<Option<f64>> = gd.batch(&prices);
    println!("warmup_period = {}", gd.warmup_period());
    println!("{:?}", out);
    Ok(())
}
```

Output:

```
warmup_period = 9
[None, None, None, None, None, None, None, None, Some(8.4), Some(9.4), Some(10.4), Some(11.4), Some(12.4), Some(13.4), Some(14.4), Some(15.4), Some(16.4), Some(17.4), Some(18.4), Some(19.4)]
```

On the linear ramp `1, 2, …, 20` the first `Some` lands at index 8 (the 9th
input), and GD sits just `0.6` behind price — much less lag than the `≈2.7`-bar
lag a plain `Ema(5)` would show at steady state.

### Python

```python
import numpy as np
import wickra as ta

gd = ta.GD(5, 0.7)
out = gd.batch(np.arange(1.0, 21.0))
print("warmup_period =", gd.warmup_period())
print(out)
```

Output:

```
warmup_period = 9
[ nan nan nan nan nan nan nan nan 8.4 9.4 10.4 11.4 12.4 13.4 14.4 15.4
 16.4 17.4 18.4 19.4]
```

### Node

```javascript
const ta = require('wickra');
const gd = new ta.GD(5, 0.7);
const prices = Array.from({ length: 20 }, (_, i) => i + 1);
console.log(gd.batch(prices));
console.log('warmupPeriod:', gd.warmupPeriod());
```

Output:

```
[
  NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN,
  8.4, 9.4, 10.4, 11.4, 12.4, 13.4, 14.4,
  15.4, 16.4, 17.4, 18.4, 19.4
]
warmupPeriod: 9
```

### Streaming

```rust
use wickra::{GeneralizedDema, Indicator};

let mut gd = GeneralizedDema::new(5, 0.7)?;
let mut last = None;
for i in 0..40 {
    last = gd.update(100.0 + f64::from(i));
}
println!("{last:?}");
# Ok::<(), Box<dyn std::error::Error>>(())
```

## Interpretation

`GD` is the lag-reduction dial: pick `v` to set exactly how aggressively you
want to remove EMA lag. At `v = 0` you have a smooth, laggy EMA; at `v = 1` you
have the snappy-but-overshooting DEMA; Tillson's `v = 0.7` is the sweet spot
that reduces most of the lag while keeping overshoot manageable.

Use GD when DEMA is too jumpy but an EMA is too slow, or when you want a single
knob to tune responsiveness without changing the period. It is also the natural
choice if you intend to study the [`T3`](/Indicators/Indicator-T3) family, since T3 is just
GD applied three times.

## Common pitfalls

- **Confusing `v` with smoothing strength.** Higher `v` makes GD *faster* (more
  lag removed, more overshoot), not smoother. For more smoothing, lower `v` or
  raise `period`.
- **Reading the warmup as lag.** The `2·period − 1` leading `None`s are warmup,
  not lag; once GD emits it leads a same-period EMA.

## References

Tim Tillson, *"Smoothing Techniques for More Accurate Signals"*, Technical
Analysis of Stocks & Commodities, 1998 — the generalized DEMA and its triple
application (T3).

## See also

- [Indicator-Dema](/Indicators/Indicator-Dema) — GD at `v = 1`.
- [Indicator-Ema](/Indicators/Indicator-Ema) — GD at `v = 0`, the building block.
- [Indicator-T3](/Indicators/Indicator-T3) — GD applied three times with the binomial volume factor.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
