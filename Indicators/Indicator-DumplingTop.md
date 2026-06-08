# DumplingTop

> The bearish mirror of the Frying Pan Bottom — a gently rounded top (dome)
> confirmed by a close back below where the dome began.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` (close) |
| Output type | `f64` |
| Output range | `{−1, 0}` |
| Default parameters | `(period = 9)` (Python) |
| Warmup period | `period` |
| Interpretation | `−1` rounded top breakdown. |

## Formula

```
over the last `period` closes:
  the maximum close sits in the middle (index in [period/4, 3·period/4))  -> a dome
  latest close < first close  AND  latest close < maximum close            -> breakdown
signal = −1 when both hold, else 0
```

The dumpling top is a distribution dome: buying fades, price rounds over, and rolls
down through the level it rose from. Detection needs a *central* high (symmetric
dome, not a one-sided spike) and a close below the window's opening level. Source:
`crates/wickra-core/src/indicators/dumpling_top.rs`.

## Parameters

| Name     | Type    | Default      | Valid range | Source | Description |
|----------|---------|--------------|-------------|--------|-------------|
| `period` | `usize` | `9` (Python) | `>= 5`      | `dumpling_top.rs:48` | Window length of the rounded top. `< 5` errors with `Error::InvalidPeriod`. |

The `period` getter returns the window; `value` returns the current output if
ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/dumpling_top.rs`:

```rust
use wickra::{Candle, Indicator, DumplingTop};
// DumplingTop: Input = Candle, Output = f64
const _: fn(&mut DumplingTop, Candle) -> Option<f64> = <DumplingTop as Indicator>::update;
```

A `Candle` in, an `Option<f64>` out (`−1`/`0`). Python `update(candle)` /
`batch(close)`; Node `update(close)` / `batch(close[])`.

## Warmup

`warmup_period() == period`. The window must fill first
(`first_emission_at_warmup_period` pins this).

## Edge cases

- **Rounded top → −1.** A dome then breakdown signals
  (`rounded_top_then_breakdown_signals` pins this).
- **One-sided rise → 0.** A straight advance is not a dome
  (`one_sided_rise_is_zero` pins this).
- **No breakdown → 0.** A dome that never loses the rim does not signal
  (`no_breakdown_is_zero` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `d.reset()` clears the close window and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, DumplingTop};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut d = DumplingTop::new(9)?;
    let closes = [100.0, 102.0, 104.0, 105.0, 104.0, 102.0, 99.0, 97.0, 95.0];
    let candles: Vec<Candle> = closes.iter().map(|&x| Candle::new(x, x+0.5, x-0.5, x, 1_000.0, 0).unwrap()).collect();
    println!("{:?}", d.batch(&candles).last().unwrap()); // Some(-1.0)
    Ok(())
}
```

Output:

```
Some(-1.0)
```

### Python

```python
import numpy as np
import wickra as ta

d = ta.DumplingTop(9)
close = np.array([100, 102, 104, 105, 104, 102, 99, 97, 95], float)
print(d.batch(close)[-1])  # -1.0
```

### Node

```javascript
const ta = require('wickra');
const d = new ta.DumplingTop(9);
console.log(d.batch([100, 102, 104, 105, 104, 102, 99, 97, 95]).at(-1)); // -1
```

### Streaming

```rust
use wickra::{Candle, Indicator, DumplingTop};

let mut d = DumplingTop::new(9).unwrap();
let feed: Vec<Candle> = Vec::new(); // your live stream
for candle in feed {
    if d.update(candle) == Some(-1.0) { println!("dumpling top"); }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Distribution dome.** The rounded top signals supply overwhelming demand; the
   breakdown is the exit/short trigger.
2. **Volume.** A classic dumpling top often shows a volume spike at the breakdown.
3. **Target.** Project the dome's height below the breakdown for a measured move.

## Common pitfalls

- **Window sizing.** Too short calls every pullback a top; too long misses compact
  domes.
- **Close-only.** Intrabar spikes are ignored.
- **Bearish only.** For the rounded base see [`FryPanBottom`](/Indicators/Indicator-FryPanBottom).

## References

A Japanese candlestick rounded-top pattern; see Nison, S. (1994), *Beyond
Candlesticks*, and Bulkowski, T. N. (2005), *Encyclopedia of Chart Patterns*.

## See also

- [Indicator-FryPanBottom](/Indicators/Indicator-FryPanBottom) — the rounded-bottom mirror.
- [Indicator-TowerTopBottom](/Indicators/Indicator-TowerTopBottom) — abrupt reversal.
- [Indicator-DoubleTopBottom](/Indicators/Indicator-DoubleTopBottom) — double-extreme reversal.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
