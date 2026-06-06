# Qstick

> Qstick — Tushar Chande's running average of the candle body (`close − open`),
> a direct read of net buying vs. selling pressure.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trend & Directional |
| Input type | `Candle` (uses open and close) |
| Output type | `f64` |
| Output range | unbounded, in price units; `> 0` net buying, `< 0` net selling |
| Default parameters | `period` is required (no default in either binding) |
| Warmup period (`warmup_period()`) | `period` |
| Interpretation | Sign and slope of short-term sentiment; zero crossings flag shifts. |

## Formula

```
Qstick = SMA(close - open, period)
```

Each bar contributes its body: a white body (`close > open`) is a positive
contribution, a black body (`close < open`) a negative one. Averaging the body
over `period` bars smooths the per-bar noise into a sentiment gauge — a positive
Qstick means buyers closed most recent bars above their open, a negative Qstick
the opposite. A run of doji-like bars (`close ≈ open`) pins Qstick near zero.

Source: `crates/wickra-core/src/indicators/qstick.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= 1`      | `qstick.rs:48` | Averaging window for the body. `0` errors with `Error::PeriodZero`. |

(Python class `wickra.Qstick(period)`; Node `new ta.Qstick(period)`.)

## Inputs / Outputs

From `crates/wickra-core/src/indicators/qstick.rs`:

```rust
use wickra::{Candle, Indicator, Qstick};
// Qstick: Input = Candle, Output = f64
const _: fn(&mut Qstick, Candle) -> Option<f64> = <Qstick as Indicator>::update;
```

Qstick reads only the **open** and **close** (the candle body), so the batch
bindings take those two columns. Node: `update(open, close)` /
`batch(open[], close[])`. Python: `update(candle)` (a full candle object) /
`batch(open, close)` → 1-D `ndarray` (`NaN` for warmup). Node returns
`number | null` / `Array<number>` with `NaN`.

## Warmup

`warmup_period()` returns `period`: the inner SMA needs `period` bodies before
the first reading (bar `period`, index `period − 1`). Pinned by
`accessors_and_metadata` (`warmup_period() == 5`) and
`warmup_emits_first_value_at_period`.

## Edge cases

- **Constant bodies.** `constant_bodies_yield_the_body` feeds bars that close
  `1.5` above their open; Qstick converges to exactly `1.5`.
- **Selling pressure.** `selling_pressure_is_negative` feeds bars closing below
  their open and asserts a negative reading.
- **Reset.** `reset_clears_state` clears the inner SMA.
- **Streaming/batch:** `batch_equals_streaming`.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, Qstick};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut q = Qstick::new(3)?;
    let bars = [
        Candle::new(10.0, 11.5, 9.5, 11.0, 1.0, 0)?,
        Candle::new(10.0, 11.5, 9.5, 11.0, 1.0, 1)?,
        Candle::new(10.0, 11.5, 9.5, 11.0, 1.0, 2)?,
    ];
    for v in q.batch(&bars).into_iter().flatten() {
        println!("{v}");
    }
    Ok(())
}
```

Output:

```
1
```

Each body is `close − open = 11 − 10 = 1`; the SMA(3) of `[1, 1, 1]` is `1`.

### Python

```python
import numpy as np
import wickra as ta

q = ta.Qstick(3)
op = np.array([10.0, 10.0, 10.0])
cl = np.array([11.0, 11.0, 11.0])
print(q.batch(op, cl))   # NaN, NaN, 1.0
```

Output:

```
[nan nan  1.]
```

### Node

```javascript
const ta = require('wickra');
const q = new ta.Qstick(3);
const open = [10, 10, 10];
const close = [11, 11, 11];
console.log(q.batch(open, close)); // [ NaN, NaN, 1 ]
```

Output:

```
[ NaN, NaN, 1 ]
```

### Streaming

```rust
use wickra::{Candle, Indicator, Qstick};

let mut q = Qstick::new(10)?;
let mut last = None;
for i in 0..40 {
    let base = 100.0 + f64::from(i);
    last = q.update(Candle::new(base, base + 2.0, base - 1.0, base + 1.0, 1.0, i64::from(i))?);
}
println!("{last:?}");
# Ok::<(), Box<dyn std::error::Error>>(())
```

## Interpretation

Qstick is a sentiment oscillator built from candle bodies rather than price
levels:

1. **Sign = bias.** Positive Qstick = buyers in control over the window;
   negative = sellers. The further from zero, the stronger the body bias.
2. **Zero crossings.** A cross up through zero flags a shift from net selling to
   net buying (and vice versa) — a common entry trigger.
3. **Divergence.** Price making new highs while Qstick rolls over warns that the
   bodies are shrinking even as the close advances.

## Common pitfalls

- **Price-unit scale.** Qstick is measured in the instrument's price units, so
  thresholds do not transfer across symbols; normalise (e.g. by ATR) before
  comparing instruments.
- **Gaps are invisible.** Qstick reads only the body and ignores the gap between
  bars, so overnight moves do not register.

## References

Tushar Chande, *The New Technical Trader*, 1994 — the Qstick indicator.

## See also

- [Indicator-Sma](/Indicators/Indicator-Sma) — the averaging core Qstick runs on the body.
- [Indicator-IntradayMomentumIndex](/Indicators/Indicator-IntradayMomentumIndex) — another body-based sentiment gauge, bounded `[0, 100]`.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
