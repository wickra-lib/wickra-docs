# KaseDevStop

> Cynthia Kase's volatility trailing stop, built on the **standard deviation of
> the two-bar true range** — it ratchets in the trend's favour and flips on a
> close through the line.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trailing Stops |
| Input type | `Candle` (high / low / close) |
| Output type | `KaseDevStopOutput { value, direction }` |
| Output range | `value` in price units; `direction` ∈ {−1, +1} |
| Default parameters | `(period = 30, dev = 1.0)` |
| Warmup period | `period + 1` |
| Interpretation | `direction > 0` long (stop below price); flip = exit/reverse. |

## Formula

```
DTR_t = max(high_t, high_{t−1}) − min(low_t, low_{t−1})   (two-bar range)
band  = mean(DTR, period) + dev · stddev(DTR, period)
long  stop = ratchet_up(  highest_high_since_flip − band )
short stop = ratchet_down( lowest_low_since_flip  + band )
```

Kase replaced the single-bar ATR with a **two-bar true range** (which captures
range expansion better) and the fixed ATR multiple with a **standard-deviation
band**, so the stop widens automatically when volatility rises and tightens when
it falls. The line trails the most extreme price reached since the last reversal,
ratcheting only in the trend's favour, and reverses when the close pierces it.
`dev` chooses the warning line — `1`, `2`, or `3` σ. The standard deviation is the
sample form (`n − 1`). Source:
`crates/wickra-core/src/indicators/kase_devstop.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | `30`    | `>= 2`      | `kase_devstop.rs:78` | Lookback for the mean and standard deviation of the two-bar range. `< 2` errors with `Error::InvalidPeriod`. |
| `dev`    | `f64`   | `1.0`   | `> 0`, finite | `kase_devstop.rs:78` | Standard-deviation multiplier (which DevStop warning line). Non-positive errors with `Error::NonPositiveMultiplier`. |

`params()` returns `(period, dev)`; `value` returns the current output if ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/kase_devstop.rs`:

```rust
use wickra::{Candle, Indicator, KaseDevStop, KaseDevStopOutput};
// KaseDevStop: Input = Candle, Output = KaseDevStopOutput
const _: fn(&mut KaseDevStop, Candle) -> Option<KaseDevStopOutput> =
    <KaseDevStop as Indicator>::update;
```

A `Candle` in, an `Option<KaseDevStopOutput>` out. The Python binding returns a
`(value, direction)` tuple from `update` and an `(n, 2)` array from `batch(high,
low, close)`; Node returns `{ value, direction }` and a flat `Float64Array` of
length `n*2`; WASM mirrors the object with camelCase keys.

## Warmup

`warmup_period() == period + 1`. Bar 1 seeds the prior candle; bars
`2..=period+1` seed the mean and standard deviation of the two-bar range; the
first stop lands on bar `period + 1` (`first_emission_at_warmup_period` pins
this).

## Edge cases

- **Uptrend → stop below price.** A clean advance stays long with the stop under
  price (`uptrend_keeps_stop_below_price` pins this).
- **Ratchet.** The long stop never falls (`stop_ratchets_up_in_uptrend` pins
  this).
- **Reversal.** A sustained decline flips the direction to short and the stop
  jumps above price (`flips_on_reversal` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `k.reset()` clears the prior candle, the range window, the trend
  state and the last value (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, KaseDevStop};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut k = KaseDevStop::new(5, 1.0)?;
    let candles: Vec<Candle> = (0..60)
        .map(|i| {
            let base = 100.0 + 2.0 * f64::from(i);
            Candle::new(base, base + 1.0, base - 1.0, base + 0.5, 1_000.0, 0).unwrap()
        })
        .collect();
    let out = k.batch(&candles);
    let last = out.last().unwrap().unwrap();
    println!("direction = {}, stop below close: {}", last.direction, last.value < candles.last().unwrap().close);
    Ok(())
}
```

Output:

```
direction = 1, stop below close: true
```

### Python

```python
import numpy as np
import wickra as ta

k = ta.KaseDevStop(30, 1.0)
n = 80
base = np.arange(n, dtype=float) + 100.0
value, direction = np.asarray(k.batch(base + 2.0, base - 2.0, base + 1.0).tolist()).T
print(value[-1], direction[-1])
```

### Node

```javascript
const ta = require('wickra');

const k = new ta.KaseDevStop(30, 1.0);
console.log('warmupPeriod:', k.warmupPeriod()); // 31
```

### Streaming

```rust
use wickra::{Candle, Indicator, KaseDevStop};

let mut k = KaseDevStop::new(30, 1.0).unwrap();
let mut last = None;
for i in 0..80 {
    let base = 100.0 + f64::from(i);
    let c = Candle::new(base, base + 2.0, base - 2.0, base + 1.0, 1_000.0, 0).unwrap();
    last = k.update(c);
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Trailing exit.** Hold the long while `direction == +1`; exit when it flips to
   `−1` (price closed below the DevStop).
2. **Warning lines.** Run several instances at `dev = 1, 2, 3` to draw Kase's
   three warning bands; deeper penetrations signal stronger reversals.
3. **Volatility adaptivity.** Because the band is a standard-deviation of the
   two-bar range, the stop loosens in turbulent markets and tightens in quiet
   ones without re-tuning.

## Common pitfalls

- **Two-bar range, not ATR.** Do not expect DevStop to match an ATR stop; the
  range basis and σ-band differ by construction.
- **`dev` sizing.** A small `dev` whipsaws; a large one gives back more profit.
- **Sample σ.** With `period` near its minimum the standard deviation is noisy;
  Kase used 20–30.

## References

Kase, C. A. (1996), *Trading with the Odds*. The DevStop and its warning lines are
described there.

## See also

- [Indicator-Chandelier Exit](/Indicators/Indicator-ChandelierExit) — ATR stop off the recent high.
- [Indicator-SuperTrend](/Indicators/Indicator-SuperTrend) — ATR-banded flipping stop.
- [Indicator-VoltyStop](/Indicators/Indicator-VoltyStop) — volatility trailing stop.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
