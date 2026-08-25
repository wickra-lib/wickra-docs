# Yo-Yo Exit

> ATR-based long-only trailing stop that "yo-yos" in and out of the
> market: when price closes below the trail it exits, and when price
> recovers `multiplier · ATR` above the same trail it re-enters
> long. The emitted level is always the *trail itself* (not a
> flip-to-short stop), so a consumer reads a single line on the
> chart and toggles the position depending on which side of it the
> close sits.

## Quick reference

| Item                | Value                                                                       |
|---------------------|-----------------------------------------------------------------------------|
| Family              | Trailing Stops                                                              |
| Input type          | `Candle`                                                                    |
| Output type         | `f64` — the active trail level                                              |
| Output range        | unbounded (price-units)                                                     |
| Default parameters  | `atr_period = 14`, `multiplier = 2.0` (`YoyoExit::classic()`)              |
| Warmup period       | `atr_period + 1`                                                            |
| Interpretation      | Long-only trailing stop with passive re-entry trigger above the trail       |

## Formula

```
band = multiplier · ATR(atr_period)

in-trade (currently long):
    trail_t = max(trail_{t−1}, close − band)
    exit when close < trail_t  ->  flip to "out"

out (sidelined):
    trail held flat at the last in-trade level
    re-enter when close > trail + band  ->  flip to "in-trade"
    on re-entry: trail = close − band (reseat anchor on the new entry)
```

Unlike a flipping ATR trailing stop, the Yo-Yo only takes longs and
treats the off-period as a "wait until price proves itself again"
phase. See `crates/wickra-core/src/indicators/yoyo_exit.rs`.

## Parameters

| Name         | Type    | Default | Constraint           | Description |
|--------------|---------|---------|----------------------|-------------|
| `atr_period` | `usize` | `14`    | `> 0`                | Period of the underlying ATR. |
| `multiplier` | `f64`   | `2.0`   | finite, `> 0`        | Trail distance in ATRs (also the re-entry threshold above the held trail). |

`YoyoExit::new` returns `Error::PeriodZero` for `atr_period == 0`
and `Error::NonPositiveMultiplier` for non-finite or non-positive
`multiplier`. `YoyoExit::classic()` returns the `(14, 2.0)` factory.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python: returns a 1-D
`array.array('d')` with `NaN` in the warmup prefix. Node: same shape;
`update(candle)` returns `number | null`.

The output is the *trail level*. The active "in vs out" position
state is internal — callers infer it by comparing the close to the
emitted trail.

## Warmup

`warmup_period() == atr_period + 1`. The inner ATR needs
`atr_period` bars to seed; on the next bar the trail is initialised
and the first level is emitted.

## Edge cases

- **First emission.** Seeds in-trade with trail at `close − band`.
- **Long-only.** The indicator never goes short; it just sits
  sidelined.
- **Trail held flat while out.** While sidelined, the emitted level
  stays at whatever the trail was on exit — it does not float with
  price. Re-entry needs the close to push `multiplier · ATR` above
  that frozen level.
- **Reset.** `reset()` clears the inner ATR, the trail, and forces
  the next entry to be a fresh seed (`in_trade = true`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, YoyoExit};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..80)
        .map(|i| {
            let b = 100.0 + f64::from(i);
            Candle::new(b, b + 2.0, b - 2.0, b + 1.0, 10.0, i64::from(i)).unwrap()
        })
        .collect();
    let mut yo = YoyoExit::classic();
    println!("row 25 trail = {:?}", yo.batch(&candles)[25]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

n = 80
base = 100 + np.arange(n, dtype=float)
yo = ta.YoyoExit(14, 2.0)
out = yo.batch(base + 2, base - 2, base + 1)
print('warmup:', yo.warmup_period())  # 15
print('row 25:', out[25])
```

### Node

```javascript
const wickra = require('wickra');
const yo = new wickra.YoyoExit(14, 2.0);
const n = 80;
const base = Array.from({ length: n }, (_, i) => 100 + i);
const out = yo.batch(
  base.map(b => b + 2),
  base.map(b => b - 2),
  base.map(b => b + 1),
);
console.log('row 25:', out[25]);
```

### Streaming

```rust
use wickra::{Candle, Indicator, YoyoExit};

let mut yo = YoyoExit::classic();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if let Some(trail) = yo.update(bar) {
        let position = if bar.close > trail { "long" } else { "flat" };
        println!("trail={trail:.4}  position={position}");
    }
}
```

## Interpretation

The Yo-Yo Exit is a **single-line long/flat regime indicator**:

- **close > trail.** Position is long; ride the trend.
- **close < trail.** Position is flat; wait for the re-entry trigger.
- **Re-entry.** Only fires when close pushes a full `multiplier · ATR`
  above the held trail. This buffer keeps you from re-entering on
  every two-bar bounce.

Useful for trend-following systems that want a single, ATR-scaled
stop level for both exit *and* re-entry — without the complication
of going short.

## Common pitfalls

- **Treating the trail like a flip-to-short stop.** Yo-Yo never
  shorts; reading the emitted level as "go short below this" will
  inject phantom trades that the indicator never intended.
- **Re-entry hysteresis surprise.** Because re-entry needs
  `multiplier · ATR` above the held trail, a sharp v-shaped
  reversal can leave you waiting on the sidelines for several bars
  after price has visually recovered. This is intentional — it
  filters chop.
- **Multiplier symmetry.** The same `multiplier` controls both the
  trail distance and the re-entry threshold. If you want them
  decoupled, this indicator is not the right tool — consider a
  custom state machine.

## References

- Common practitioner pattern; popularised in trend-following
  discretionary trading communities. No single canonical
  publication.

## See also

- [Atr](/Indicators/Indicator-Atr) — the underlying volatility unit.
- [AtrTrailingStop](/Indicators/Indicator-AtrTrailingStop) — bidirectional
  cousin (flips short instead of going flat).
- [VoltyStop](/Indicators/Indicator-VoltyStop) — extreme-anchored ATR variant.
- [SuperTrend](/Indicators/Indicator-SuperTrend) — symmetric `HL2 ± mult·ATR`
  flip-based stop.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
