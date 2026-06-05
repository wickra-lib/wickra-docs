# Initial Balance (IB)

> Session-opening high / low established over the first N bars of a
> session. Tracks the running session high and session low across
> the first `period` candles since construction or `reset()`. Once
> the `period`-th candle has been ingested the value is **frozen**
> and every subsequent call returns the same locked output until
> `reset()` is invoked.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Market Profile                                                       |
| Input type          | `Candle` (uses `high`, `low`)                                        |
| Output type         | `InitialBalanceOutput { high, low }`                                 |
| Output range        | unbounded (price-units)                                              |
| Default parameters  | `period = 12` (1-hour IB on 5-minute US equity bars)                 |
| Warmup period       | `period`                                                             |
| Interpretation      | Session opening-balance zone; breaks signal trend day                 |

## Formula

```
For the first `period` candles since reset:
  high = running max
  low  = running min

After bar `period`:
  high, low locked until reset()
```

Caller is responsible for invoking `reset()` at each new session
boundary. See
`crates/wickra-core/src/indicators/initial_balance.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | `12`    | `> 0`      | Number of bars defining the IB window. |

`InitialBalance::new` returns `Error::PeriodZero` for `period == 0`.
`InitialBalance::classic()` returns the `12`-bar factory.

## Inputs / Outputs

`Indicator<Input = Candle, Output = InitialBalanceOutput>` with two
fields (`high`, `low`).

- **Python.** `InitialBalance(period).batch(high, low)` returns an
  `(n, 2)` array. Note: batch mode is most useful for session-
  aggregated bars; on continuous data the locked behaviour
  produces constant output post-warmup.
- **Node.** Flat `number[]` of length `n * 2`.

## Warmup

`warmup_period() == period`. First `period - 1` bars return `None`;
bar `period` emits and locks the value.

## Edge cases

- **No automatic reset.** This is the most important caveat —
  must `reset()` at session boundaries manually.
- **Lock-in semantics.** Post-warmup output is constant until
  reset.
- **Reset.** Clears the running high/low and the lock.

## Examples

### Rust

```rust
use wickra::{Candle, InitialBalance, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let bars = [
        Candle::new(100.0, 102.0, 99.0, 101.0, 10.0, 0)?,
        Candle::new(101.0, 103.0, 100.0, 102.0, 10.0, 1)?,
        Candle::new(102.0, 104.0, 101.0, 103.0, 10.0, 2)?,
    ];
    let mut ib = InitialBalance::new(3)?;
    for b in bars { let _ = ib.update(b); }
    let v = ib.value().unwrap();
    println!("IB high={}, low={}", v.high, v.low);  // 104, 99
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

# 3-bar IB
h = np.array([102.0, 103.0, 104.0, 105.0, 106.0])
l = np.array([ 99.0, 100.0, 101.0, 102.0, 103.0])

ib = ta.InitialBalance(3)
out = ib.batch(h, l)
# After bar 3: IB locked at high=104, low=99
print(out[-1])  # [104.0, 99.0]
```

### Node

```javascript
const wickra = require('wickra');
const ib = new wickra.InitialBalance(3);
console.log(ib.batch([102, 103, 104, 105, 106], [99, 100, 101, 102, 103]));
```

### Streaming with session reset

```rust
use wickra::{Candle, InitialBalance, Indicator};

let mut ib = InitialBalance::classic();  // 12-bar IB
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
fn is_new_session(_bar: Candle) -> bool { false } // your session-boundary predicate
for bar in candle_stream {
    if is_new_session(bar) {
        ib.reset();
    }
    if let Some(v) = ib.update(bar) {
        // IB high/low — use as breakout reference
    }
}
```

## Interpretation

- **IB as breakout reference.** Price breaking above IB-high
  signals an "extension up" — trend-day potential. Breaking
  below IB-low signals an "extension down".
- **Day-type classification.** Market Profile traders use IB
  extension patterns to classify the day type (normal,
  trend-day, neutral, etc.).
- **Default 12 bars.** 1-hour IB on 5-min bars is the US equity
  convention. Other markets: 30-min IB (6 bars) for futures,
  configurable for crypto / FX.

## Common pitfalls

- **Forgetting reset.** Without manual reset on session
  boundaries, the IB locks forever. Make session-boundary reset
  explicit in your trading loop.
- **Wrong session definition.** US equity RTH = 9:30-16:00 ET.
  Crypto 24/7 has no natural session; use UTC midnight or any
  consistent boundary.

## References

- J. Peter Steidlmayer's Market Profile work (1980s) — origin of
  the Initial Balance concept.
- Jim Dalton, *Mind Over Markets* (1990) — practitioner
  treatment.

## See also

- [OpeningRange](/Indicators/Indicator-OpeningRange) — shorter cousin with
  breakout-distance output.
- [ValueArea](/Indicators/Indicator-ValueArea) — session volume distribution.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
