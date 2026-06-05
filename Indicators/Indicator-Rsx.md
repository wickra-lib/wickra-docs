# RSX

> RSX — a noise-free RSI built from Jurik's three-stage smoothing cascade:
> RSI-like readings with a fraction of the bar-to-bar jitter.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Momentum Oscillators |
| Input type | `f64` (single price) |
| Output type | `f64` |
| Output range | `[0, 100]`; neutral `50` in a flat market |
| Default parameters | `length` is required (no default in either binding) |
| Warmup period (`warmup_period()`) | `length + 1` |
| Interpretation | Smoothed RSI — cleaner crosses and divergences. |

## Formula

```
f18 = 3 / (length + 2),  f20 = 1 - f18
stage(a, b, in):  a = f20·a + f18·in;  b = f18·a + f20·b;  out = 1.5·a − 0.5·b

change = price - prev_price
v14 = stage3(change)          // signed change through three cascaded stages
v1C = stage3(|change|)        // absolute change through three cascaded stages
RSX = clamp((v14 / v1C + 1) · 50, 0, 100)        // 50 when v1C == 0
```

Each stage is a "double-EMA with overshoot" (`1.5·a − 0.5·b`) — the same
lag-cancelling structure as a [`Dema`](/Indicators/Indicator-Dema). Running both the signed
move and its magnitude through three such stages and forming the RSI-style ratio
yields an oscillator that follows the RSI but is dramatically smoother for the
same length, so it whipsaws far less. A flat market (no movement) returns the
neutral `50`.

Source: `crates/wickra-core/src/indicators/rsx.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `length` | `usize` | none    | `>= 1`      | `rsx.rs:69` | Smoothing length (sets `f18 = 3/(length+2)`). `0` errors with `Error::PeriodZero`. |

(Python class `wickra.RSX(length)` has no `#[pyo3(signature)]` default; pass
`length` explicitly.)

## Inputs / Outputs

From `crates/wickra-core/src/indicators/rsx.rs`:

```rust
use wickra::{Indicator, Rsx};
// Rsx: Input = f64, Output = f64
const _: fn(&mut Rsx, f64) -> Option<f64> = <Rsx as Indicator>::update;
```

Python returns `float | None` (streaming) / `numpy.ndarray` (batch, `NaN` for
warmup). Node returns `number | null` / `Array<number>` with `NaN`.

## Warmup

`warmup_period()` returns `length + 1`: one input seeds the previous price, then
`length` changes settle the recursive cascade before the first emission. Pinned
by `accessors_and_metadata` (`warmup_period() == 15` for `Rsx::new(14)`) and
`warmup_then_emits` (an `Rsx::new(3)` returns `None` for three inputs and emits
on the fourth).

## Edge cases

- **Flat market → 50.** No movement zeroes the absolute cascade, so the
  guarded `v1C == 0` branch returns the neutral `50`; pinned by
  `flat_market_is_neutral`.
- **Bounded.** `output_stays_in_range` pins every emission to `[0, 100]`.
- **Strong uptrend → high.** `strong_uptrend_is_high` checks a sustained rise
  pushes the RSX well above 50.
- **NaN / infinity inputs.** Ignored, returning the last value —
  `ignores_non_finite_input`.
- **Reset.** `reset_clears_state` rebuilds the full cascade.
  **Streaming/batch:** `batch_equals_streaming`.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, Rsx};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut rsx = Rsx::new(5)?;
    let out: Vec<Option<f64>> = rsx.batch(&[7.0_f64; 12]);
    println!("warmup_period = {}", rsx.warmup_period());
    println!("{:?}", out);
    Ok(())
}
```

Output:

```
warmup_period = 6
[None, None, None, None, None, Some(50.0), Some(50.0), Some(50.0), Some(50.0), Some(50.0), Some(50.0), Some(50.0)]
```

On a flat series there is no movement, so the absolute cascade is zero and the
RSX sits at the neutral `50` from the first emission (input `length + 1 = 6`).

### Python

```python
import numpy as np
import wickra as ta

rsx = ta.RSX(5)
out = rsx.batch(np.full(12, 7.0))
print("warmup_period =", rsx.warmup_period())
print(out)
```

Output:

```
warmup_period = 6
[nan nan nan nan nan 50. 50. 50. 50. 50. 50. 50.]
```

### Node

```javascript
const ta = require('wickra');
const rsx = new ta.RSX(5);
console.log(rsx.batch(Array.from({ length: 12 }, () => 7)));
console.log('warmupPeriod:', rsx.warmupPeriod());
```

Output:

```
[
  NaN, NaN, NaN, NaN, NaN, 50,
   50,  50,  50,  50,  50, 50
]
warmupPeriod: 6
```

### Streaming

```rust
use wickra::{Indicator, Rsx};

let mut rsx = Rsx::new(14)?;
let mut last = None;
for i in 0..80 {
    last = rsx.update(100.0 + (f64::from(i) * 0.2).sin() * 5.0);
}
println!("{last:?}"); // a smooth 0..100 oscillation
# Ok::<(), Box<dyn std::error::Error>>(())
```

## Interpretation

RSX is the oscillator to reach for when the plain RSI is too noisy to act on but
a longer RSI period would lag too much. Jurik's cascade gives you RSI-like
50-line crosses and 70/30 bands with a line smooth enough that those crosses are
actually tradable, not chopped to pieces by intrabar noise.

Typical uses:

1. **Cleaner overbought/oversold.** Use the usual 70/30 (or 80/20); the smooth
   line crosses them decisively rather than hovering.
2. **50-line trend filter.** RSX above 50 = bullish regime, below = bearish; the
   smoothing makes this a stable filter.
3. **Divergence.** The lack of jitter makes price/RSX divergences stand out.

## Common pitfalls

- **Expecting RSI-identical values.** RSX tracks the RSI's *shape* but is a
  different, smoother calculation; do not expect equal numbers.
- **Warmup transient.** The cascade is recursive; the very first emitted values
  still carry a little settling bias — allow a few extra bars on a cold start.

## References

The RSX is a public reconstruction of Mark Jurik's smoothing applied to the RSI
(Jurik Research). The three-stage `1.5·a − 0.5·b` cascade is the widely-ported
"RSX" algorithm.

## See also

- [Indicator-Rsi](/Indicators/Indicator-Rsi) — the oscillator RSX smooths.
- [Indicator-Jma](/Indicators/Indicator-Jma) — Jurik-style smoothing applied to price.
- [Indicator-ConnorsRsi](/Indicators/Indicator-ConnorsRsi) — another RSI refinement.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
