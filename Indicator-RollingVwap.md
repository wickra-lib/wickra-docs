# Rolling VWAP

> Volume-Weighted Average Price over a **rolling window**, rather
> than session-cumulative. The finite-memory variant for streaming
> systems that need a continuously updating fair-price reference
> without unbounded state.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Volume                                                               |
| Input type          | `Candle`                                                             |
| Output type         | `f64`                                                                |
| Output range        | unbounded (price-units)                                              |
| Default parameters  | `period` required                                                    |
| Warmup period       | `period`                                                             |
| Interpretation      | Rolling fair-price reference; alternative to session-anchored VWAP   |

## Formula

```
RollingVWAP_t = Σ_{i=t-period+1..t} (typical_price_i · volume_i)
              / Σ_{i=t-period+1..t} volume_i
```

The window stores `(typical_price · volume, volume)` pairs and
runs incremental `sum_pv` / `sum_v` aggregates, so each `update`
is O(1). See
`crates/wickra-core/src/indicators/vwap.rs` (RollingVwap struct).

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 0`      | Rolling window length. |

`RollingVwap::new` returns `Error::PeriodZero` for `period == 0`.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python: `RollingVWAP(period).batch(high, low, close, volume)`
returns a 1-D `np.ndarray` with `NaN` warmup. Node: same; `update(candle)`
returns `number | null`.

## Warmup

`warmup_period() == period`. First emission lands on bar `period`.

## Edge cases

- **Window slides.** Once `window.len() == period`, the oldest
  `(pv, v)` pair is subtracted from running sums before the new
  pair is added.
- **Zero-volume window.** If every candle in the window has zero
  volume, `sum_v == 0` and the indicator suppresses output until
  a positive-volume candle is in scope.
- **`is_ready()`.** Returns `true` only when window is full
  AND `sum_v > 0`.
- **Reset.** Clears the window and both running sums.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, RollingVwap};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles = vec![
        Candle::new(10.0, 10.0, 10.0, 10.0, 1.0, 0)?,
        Candle::new(20.0, 20.0, 20.0, 20.0, 3.0, 0)?,
        Candle::new(30.0, 30.0, 30.0, 30.0, 1.0, 0)?,
        Candle::new(40.0, 40.0, 40.0, 40.0, 2.0, 0)?,
    ];
    let mut rv = RollingVwap::new(3)?;
    println!("{:?}", rv.batch(&candles));
    // [None, None, Some(20.0), Some(28.333...)]
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

high   = np.array([10.0, 20.0, 30.0, 40.0])
low    = np.array([10.0, 20.0, 30.0, 40.0])
close  = np.array([10.0, 20.0, 30.0, 40.0])
volume = np.array([ 1.0,  3.0,  1.0,  2.0])

rv = ta.RollingVWAP(3)
print(rv.batch(high, low, close, volume))
# [nan, nan, 20.0, 28.333...]
```

### Node

```javascript
const { RollingVWAP } = require('wickra');

const rv = new RollingVWAP(3);
console.log(rv.batch(
  [10, 20, 30, 40], [10, 20, 30, 40], [10, 20, 30, 40], [1, 3, 1, 2]
));
```

### Streaming

```rust
use wickra::{Candle, Indicator, RollingVwap};

let mut rv = RollingVwap::new(20).unwrap();
let candle_stream: Vec<Candle> = Vec::new(); // your live OHLCV feed
for bar in candle_stream {
    if let Some(v) = rv.update(bar) {
        // v is rolling-window VWAP
    }
}
```

## Interpretation

- **Bounded-memory cousin of VWAP.** Same fair-price concept,
  finite window. Use when sessions are ill-defined (24/7 markets)
  or when you want a moving reference rather than a session-locked
  one.
- **Pair with price.** Price > RollingVWAP = bullish bias inside
  the window; price < RollingVWAP = bearish.
- **Window choice.** 20-bar = short-term scalper reference;
  78-bar (1-day on 5-min) ≈ session VWAP; 252-bar = long-term
  fair price.

## Common pitfalls

- **Confusing with session VWAP.** Wickra's plain `Vwap` is
  cumulative-session; this `RollingVwap` is windowed. Pick the
  semantics you want.
- **Zero-volume warmup.** If the first `period` bars include
  zero-volume bars, the indicator stays `None` until at least
  one positive-volume bar is in scope.

## References

- Bertsimas & Lo, *Optimal control of execution costs*,
  *Journal of Financial Markets*, 1998 — VWAP execution
  literature.

## See also

- [Vwap](Indicator-Vwap) — cumulative-session sibling.
- [AnchoredVwap](Indicator-AnchoredVwap) — anchor-cumulative
  sibling.
- [Sma](Indicator-Sma) — non-volume-weighted moving average.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
