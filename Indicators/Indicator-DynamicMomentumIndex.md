# DynamicMomentumIndex

> Dynamic Momentum Index — Chande's RSI whose lookback shortens when volatility
> rises and lengthens when it falls, adapting responsiveness to the market.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Momentum Oscillators |
| Input type | `f64` (single price) |
| Output type | `f64` |
| Output range | `[0, 100]`; neutral `50` in a flat market |
| Default parameters | `period` (base RSI lookback, Chande uses 14) |
| Warmup period (`warmup_period()`) | `31` (the 30-change buffer + 1) |
| Interpretation | Volatility-adaptive RSI: fast when wild, slow when calm. |

## Formula

```
vol     = StdDev(close, 5)
vol_avg = SMA(vol, 10)
Vi      = vol / vol_avg                       (volatility index)
td      = clamp(round(period / Vi), 5, 30)    (dynamic lookback)
avg_gain, avg_loss = simple means of the last `td` price changes
DMI     = 100 * avg_gain / (avg_gain + avg_loss)
```

When recent volatility is above its own average (`Vi > 1`), `td` shrinks toward
`5`, making the oscillator react faster; when the market is calm (`Vi < 1`), `td`
grows toward `30`, smoothing it. The gain/loss averages are simple means over
the last `td` changes, recomputed as the window flexes. The volatility window
(`5`), its smoothing (`10`), and the `[5, 30]` bounds are Chande's definitional
constants. Output is bounded in `[0, 100]`; a flat market returns `50`.

Source: `crates/wickra-core/src/indicators/dynamic_momentum_index.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | 14      | `>= 1`      | `dynamic_momentum_index.rs:70` | Base RSI lookback, scaled by the volatility index. `0` errors with `Error::PeriodZero`. |

(Python class `wickra.DynamicMomentumIndex(period)`; Node
`new ta.DynamicMomentumIndex(period)`.)

## Inputs / Outputs

From `crates/wickra-core/src/indicators/dynamic_momentum_index.rs`:

```rust
use wickra::{DynamicMomentumIndex, Indicator};
// DynamicMomentumIndex: Input = f64, Output = f64
const _: fn(&mut DynamicMomentumIndex, f64) -> Option<f64> =
    <DynamicMomentumIndex as Indicator>::update;
```

Python returns `float | None` (streaming) / `array.array('d')` (batch, `NaN` for
warmup). Node returns `number | null` / `Array<number>` with `NaN`.

## Warmup

`warmup_period()` returns `31`: the 30-change buffer (so any dynamic lookback up
to 30 always has enough history) needs `30 + 1` inputs, which dominates the
shorter volatility chain (`5 + 10 − 1 = 14`). Pinned by `accessors_and_metadata`
(`warmup_period() == 31`) and `first_emission_matches_warmup_period` (first
`Some` at index 30).

## Edge cases

- **Adaptive lookback.** `high_volatility_shortens_period` pins the mapping:
  `Vi = 2 → td = 7`, `Vi = 0.5 → td = 28`, extreme calm/volatility clamp to
  `30`/`5`, and zero volatility falls back to the slowest `30`.
- **Pure uptrend → 100 / flat → 50.** `pure_uptrend_is_one_hundred` and
  `flat_market_is_neutral`.
- **Bounded.** `output_stays_in_range` pins every emission to `[0, 100]`.
- **NaN / infinity inputs.** Ignored — `ignores_non_finite_input`.
- **Reset.** `reset_clears_state`. **Streaming/batch:** `batch_equals_streaming`.

## Examples

### Rust

```rust
use wickra::{BatchExt, DynamicMomentumIndex, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut dmi = DynamicMomentumIndex::new(14)?;
    let prices: Vec<f64> = (1..=35).map(f64::from).collect();
    let out: Vec<Option<f64>> = dmi.batch(&prices);
    println!("warmup_period = {}", dmi.warmup_period());
    println!("first value at index 30: {:?}", out[30]);
    Ok(())
}
```

Output:

```
warmup_period = 31
first value at index 30: Some(100.0)
```

On the steady uptrend every price change is positive, so regardless of the
dynamic lookback `avg_loss = 0` and the DMI saturates at `100` from the first
emission (input `31`).

### Python

```python
import numpy as np
import wickra as ta

dmi = ta.DynamicMomentumIndex(14)
out = dmi.batch(np.arange(1.0, 36.0))
print("warmup_period =", dmi.warmup_period())
print("first value:", out[30])
```

Output:

```
warmup_period = 31
first value: 100.0
```

### Node

```javascript
const ta = require('wickra');
const dmi = new ta.DynamicMomentumIndex(14);
const prices = Array.from({ length: 35 }, (_, i) => i + 1);
const out = dmi.batch(prices);
console.log('warmupPeriod:', dmi.warmupPeriod());
console.log('first value:', out[30]);
```

Output:

```
warmupPeriod: 31
first value: 100
```

### Streaming

```rust
use wickra::{DynamicMomentumIndex, Indicator};

let mut dmi = DynamicMomentumIndex::new(14)?;
let mut last = None;
for i in 0..80 {
    last = dmi.update(100.0 + (f64::from(i) * 0.2).sin() * 5.0);
}
println!("{last:?}");
# Ok::<(), Box<dyn std::error::Error>>(())
```

## Interpretation

The DMI is an RSI that re-tunes itself: in a volatile, fast market it behaves
like a short-period RSI (responsive, more signals); in a quiet market it behaves
like a long-period RSI (smooth, fewer whipsaws). This addresses the central RSI
trade-off — one fixed period is either too jumpy in volatility or too slow in
calm — without you switching parameters by hand.

Typical uses:

1. **Adaptive overbought/oversold.** Read it with the usual 70/30; the dynamic
   period keeps the signal quality steadier across regimes than a fixed RSI.
2. **Regime awareness.** A persistently short effective lookback (high `Vi`)
   itself flags a high-volatility regime.
3. **Divergence.** Same divergence reads as the RSI, adapted to volatility.

## Common pitfalls

- **Expecting fixed-RSI numbers.** Because the lookback changes bar to bar, the
  DMI will not equal an `RSI(14)`; it tracks the same idea adaptively.
- **Short histories.** It needs 31 bars to start (the 30-change buffer); on very
  short series it never leaves warmup.

## References

Tushar Chande & Stanley Kroll, *The New Technical Trader*, 1994 — the Dynamic
Momentum Index.

## See also

- [Indicator-Rsi](/Indicators/Indicator-Rsi) — the fixed-period baseline.
- [Indicator-Rmi](/Indicators/Indicator-Rmi) — RSI over a multi-bar momentum window.
- [Indicator-Kama](/Indicators/Indicator-Kama) — another volatility-adaptive construction.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
