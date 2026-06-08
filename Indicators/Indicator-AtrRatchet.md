# AtrRatchet

> Perry Kaufman's time-based volatility stop — it tightens by a fixed fraction of
> ATR **every bar**, so a stalled trade is squeezed out even in a flat market.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trailing Stops |
| Input type | `Candle` (high / low / close) |
| Output type | `AtrRatchetOutput { value, direction }` |
| Output range | `value` in price units; `direction` ∈ {−1, +1} |
| Default parameters | `(atr_period = 14, start_mult = 4.0, increment = 0.1)` |
| Warmup period | `atr_period` |
| Interpretation | `direction > 0` long (stop below price); flip = exit/reverse. |

## Formula

```
on entry (long):  stop = close − start_mult · ATR
each later bar:    stop = stop + increment · ATR     (ratchets toward price)
flip to short when close < stop, reseeding stop = close + start_mult · ATR
```

Ordinary trailing stops only advance on new extremes. Kaufman's ratchet advances
the stop a little **every** bar by `increment · ATR`, so time itself tightens the
leash: the longer a position goes nowhere, the closer the stop creeps until it is
hit. The initial `start_mult · ATR` distance gives the trade room at entry. Source:
`crates/wickra-core/src/indicators/atr_ratchet.rs`.

## Parameters

| Name         | Type    | Default | Valid range | Source | Description |
|--------------|---------|---------|-------------|--------|-------------|
| `atr_period` | `usize` | `14`    | `>= 1`      | `atr_ratchet.rs:62` | ATR window. `0` errors with `Error::PeriodZero`. |
| `start_mult` | `f64`   | `4.0`   | `> 0`, finite | `atr_ratchet.rs:62` | Initial stop distance in ATR multiples. |
| `increment`  | `f64`   | `0.1`   | `> 0`, finite | `atr_ratchet.rs:62` | ATR fraction added to the stop each bar. Non-positive errors with `Error::NonPositiveMultiplier`. |

`params()` returns `(atr_period, start_mult, increment)`; `value` returns the
current output if ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/atr_ratchet.rs`:

```rust
use wickra::{Candle, Indicator, AtrRatchet, AtrRatchetOutput};
// AtrRatchet: Input = Candle, Output = AtrRatchetOutput
const _: fn(&mut AtrRatchet, Candle) -> Option<AtrRatchetOutput> =
    <AtrRatchet as Indicator>::update;
```

A `Candle` in, an `Option<AtrRatchetOutput>` out. The Python binding returns a
`(value, direction)` tuple from `update` and an `(n, 2)` array from `batch(high,
low, close)`; Node returns `{ value, direction }` and a flat `Float64Array` of
length `n*2`; WASM mirrors the object with camelCase keys.

## Warmup

`warmup_period() == atr_period`. The first stop lands once ATR has seeded
(`first_emission_at_warmup_period` pins this).

## Edge cases

- **Uptrend → stop below price.** A steady advance keeps the stop under price
  (`uptrend_keeps_stop_below_price` pins this).
- **Stall → forced exit.** A long trade that goes flat is eventually overtaken by
  the creeping stop and flips short (`stall_eventually_triggers_flip` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `r.reset()` clears the ATR, the trend state and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, AtrRatchet};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut r = AtrRatchet::new(5, 4.0, 0.05)?;
    let candles: Vec<Candle> = (0..60)
        .map(|i| {
            let base = 100.0 + 2.0 * f64::from(i);
            Candle::new(base, base + 1.0, base - 1.0, base + 0.5, 1_000.0, 0).unwrap()
        })
        .collect();
    let last = r.batch(&candles).last().unwrap().unwrap();
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

r = ta.AtrRatchet(14, 4.0, 0.1)
n = 60
base = np.arange(n, dtype=float) + 100.0
value, direction = r.batch(base + 2.0, base - 2.0, base + 1.0).T
print(value[-1], direction[-1])
```

### Node

```javascript
const ta = require('wickra');

const r = new ta.AtrRatchet(14, 4.0, 0.1);
console.log('warmupPeriod:', r.warmupPeriod()); // 14
```

### Streaming

```rust
use wickra::{Candle, Indicator, AtrRatchet};

let mut r = AtrRatchet::new(14, 4.0, 0.1).unwrap();
let mut last = None;
for i in 0..60 {
    let base = 100.0 + f64::from(i);
    let c = Candle::new(base, base + 2.0, base - 2.0, base + 1.0, 1_000.0, 0).unwrap();
    last = r.update(c);
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Time pressure.** Use the ratchet when you want to penalise dead trades: a
   position that does not keep moving in your favour is exited automatically.
2. **Tuning aggression.** A larger `increment` shortens the leash faster (more
   time-sensitive); a larger `start_mult` gives more initial room.
3. **Trend rider.** In a strong trend, price outruns the creeping stop and the
   position is held; only stalls and reversals trigger the exit.

## Common pitfalls

- **Will exit a quiet winner.** By design the stop tightens regardless of price,
  so a slow grind may be stopped out — that is the intent, not a bug.
- **Increment scale.** Because the increment is in ATR units, it self-scales to
  volatility; a fixed price increment would not.
- **Not a new-extreme stop.** Unlike a chandelier, it does not key off the recent
  high; it keys off time and volatility.

## References

Kaufman, P. J. (2013), *Trading Systems and Methods*, 5th ed., Wiley — the ATR
ratchet / time-based volatility stop.

## See also

- [Indicator-Chandelier Exit](/Indicators/Indicator-ChandelierExit) — ATR stop off the recent extreme.
- [Indicator-AtrTrailingStop](/Indicators/Indicator-AtrTrailingStop) — classic ATR trailing stop.
- [Indicator-Psar](/Indicators/Indicator-Psar) — parabolic accelerating stop.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
