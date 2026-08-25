# ModifiedMaStop

> A trailing stop riding the Modified Moving Average (SMMA / Wilder's RMA),
> ratcheted so it only moves in the trend's favour and flips on a decisive cross.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trailing Stops |
| Input type | `Candle` (close) |
| Output type | `ModifiedMaStopOutput { value, direction }` |
| Output range | `value` in price units; `direction` ∈ {−1, +1} |
| Default parameters | `(period = 14)` (Python) |
| Warmup period | `period` |
| Interpretation | `direction > 0` long (stop below price); flip = exit/reverse. |

## Formula

```
ma = SMMA(close, period)                 (Modified Moving Average)
long:  stop = max(prev_stop, ma);  flip short when close < stop
short: stop = min(prev_stop, ma);  flip long  when close > stop
```

The Modified Moving Average — the smoothed/running average Wilder used (identical
to RMA) — is slow and low-lag. Using it as the stop line, but **ratcheting** so the
long stop never falls and the short stop never rises, gives a stop that trails
price through a trend and reverses when price decisively crosses it. Source:
`crates/wickra-core/src/indicators/modified_ma_stop.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `14` (Python) | `>= 1`      | `modified_ma_stop.rs:64` | SMMA window. `0` errors with `Error::PeriodZero`. |

The `period` getter returns the window; `value` returns the current output if
ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/modified_ma_stop.rs`:

```rust
use wickra::{Candle, Indicator, ModifiedMaStop, ModifiedMaStopOutput};
// ModifiedMaStop: Input = Candle, Output = ModifiedMaStopOutput
const _: fn(&mut ModifiedMaStop, Candle) -> Option<ModifiedMaStopOutput> =
    <ModifiedMaStop as Indicator>::update;
```

A `Candle` in, an `Option<ModifiedMaStopOutput>` out. The Python binding returns a
`(value, direction)` tuple from `update` and an `(n, 2)` array from `batch(close)`;
Node returns `{ value, direction }` and a flat `Float64Array` of length `n*2`;
WASM mirrors the object with camelCase keys.

## Warmup

`warmup_period() == period`. The first stop lands once the SMMA has seeded
(`first_emission_at_warmup_period` pins this).

## Edge cases

- **Uptrend → stop below price.** A clean advance stays long with the stop under
  price (`uptrend_keeps_stop_below_price` pins this).
- **Ratchet.** The long stop never falls (`long_stop_ratchets_up` pins this).
- **Reversal.** A sustained decline flips the direction to short
  (`flips_on_reversal` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `m.reset()` clears the SMMA, the trend state and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, ModifiedMaStop};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut m = ModifiedMaStop::new(5)?;
    let candles: Vec<Candle> = (0..60)
        .map(|i| {
            let base = 100.0 + 2.0 * f64::from(i);
            Candle::new(base, base + 1.0, base - 1.0, base, 1_000.0, 0).unwrap()
        })
        .collect();
    let last = m.batch(&candles).last().unwrap().unwrap();
    println!("direction = {}", last.direction);
    Ok(())
}
```

Output:

```
direction = 1
```

### Python

```python
import numpy as np
import wickra as ta

m = ta.ModifiedMaStop(14)
close = np.arange(60, dtype=float) + 100.0
value, direction = np.asarray(m.batch(close + 1, close - 1, close).tolist()).T
print(value[-1], direction[-1])
```

### Node

```javascript
const ta = require('wickra');

const m = new ta.ModifiedMaStop(14);
console.log('warmupPeriod:', m.warmupPeriod()); // 14
```

### Streaming

```rust
use wickra::{Candle, Indicator, ModifiedMaStop};

let mut m = ModifiedMaStop::new(14).unwrap();
let mut last = None;
for i in 0..60 {
    let base = 100.0 + f64::from(i);
    let c = Candle::new(base, base + 1.0, base - 1.0, base + 0.5, 1_000.0, 0).unwrap();
    last = m.update(c);
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Trend-following exit.** Hold while `direction` is unchanged; exit/reverse on
   a flip.
2. **Lag as a feature.** The SMMA's lag keeps the stop from being clipped by
   shallow pullbacks — looser than a fast-MA stop, tighter than a wide ATR band.
3. **Period choice.** Shorter `period` reacts faster (more flips); longer gives
   trends more room.

## Common pitfalls

- **Not a raw MA cross.** The ratchet means the stop can sit away from the current
  SMMA after the average turns against the trend; that is intentional.
- **Lag on reversals.** Because the SMMA is slow, the flip can give back more than
  a volatility stop near sharp tops/bottoms.
- **Close-based.** Flips trigger on closes, not intrabar spikes.

## References

The Modified (smoothed) Moving Average originates with Wilder, J. W. (1978), *New
Concepts in Technical Trading Systems*; using it as a ratcheted trailing stop is a
common derivation.

## See also

- [Indicator-Smma](/Indicators/Indicator-Smma) — the Modified Moving Average itself.
- [Indicator-HiLoActivator](/Indicators/Indicator-HiLoActivator) — Gann HiLo MA-based stop.
- [Indicator-SuperTrend](/Indicators/Indicator-SuperTrend) — ATR-banded flipping stop.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
