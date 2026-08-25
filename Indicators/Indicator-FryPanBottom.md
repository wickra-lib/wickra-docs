# FryPanBottom

> A gently rounded (U-shaped) base confirmed by recovery above the rim — a bullish
> accumulation pattern.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` (close) |
| Output type | `f64` |
| Output range | `{0, +1}` |
| Default parameters | `(period = 9)` (Python) |
| Warmup period | `period` |
| Interpretation | `+1` rounded bottom breakout. |

## Formula

```
over the last `period` closes:
  the minimum close sits in the middle (index in [period/4, 3·period/4))  -> a bowl
  latest close > first close  AND  latest close > minimum close            -> recovery
signal = +1 when both hold, else 0
```

The frying pan is a saucer base: selling dries up, the curve flattens, and price
lifts off the rim. The pattern requires a *central* low (a symmetric bowl, not a
one-sided drop) and a close back above the window's opening level. Source:
`crates/wickra-core/src/indicators/fry_pan_bottom.rs`.

## Parameters

| Name     | Type    | Default      | Valid range | Source | Description |
|----------|---------|--------------|-------------|--------|-------------|
| `period` | `usize` | `9` (Python) | `>= 5`      | `fry_pan_bottom.rs:53` | Window length of the rounded base. `< 5` errors with `Error::InvalidPeriod`. |

The `period` getter returns the window; `value` returns the current output if
ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/fry_pan_bottom.rs`:

```rust
use wickra::{Candle, Indicator, FryPanBottom};
// FryPanBottom: Input = Candle, Output = f64
const _: fn(&mut FryPanBottom, Candle) -> Option<f64> = <FryPanBottom as Indicator>::update;
```

A `Candle` in, an `Option<f64>` out (`+1`/`0`). Python `update(candle)` /
`batch(close)`; Node `update(close)` / `batch(close[])`.

## Warmup

`warmup_period() == period`. The window must fill first
(`first_emission_at_warmup_period` pins this).

## Edge cases

- **Rounded bottom → +1.** A U-base then recovery signals
  (`rounded_bottom_then_recovery_signals` pins this).
- **One-sided drop → 0.** A straight decline is not a bowl
  (`one_sided_drop_is_zero` pins this).
- **No recovery → 0.** A bowl that never reclaims the rim does not signal
  (`no_recovery_is_zero` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `f.reset()` clears the close window and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, FryPanBottom};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut f = FryPanBottom::new(9)?;
    let closes = [100.0, 98.0, 96.0, 95.0, 96.0, 98.0, 101.0, 103.0, 105.0];
    let candles: Vec<Candle> = closes.iter().map(|&x| Candle::new(x, x+0.5, x-0.5, x, 1_000.0, 0).unwrap()).collect();
    println!("{:?}", f.batch(&candles).last().unwrap()); // Some(1.0)
    Ok(())
}
```

Output:

```
Some(1.0)
```

### Python

```python
import numpy as np
import wickra as ta

f = ta.FryPanBottom(9)
close = np.array([100, 98, 96, 95, 96, 98, 101, 103, 105], float)
print(f.batch(close + 1, close - 1, close)[-1])  # 1.0
```

### Node

```javascript
const ta = require('wickra');
const f = new ta.FryPanBottom(9);
const close = [100, 98, 96, 95, 96, 98, 101, 103, 105];
console.log(f.batch(close.map(c => c + 1), close.map(c => c - 1), close).at(-1)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, FryPanBottom};

let mut f = FryPanBottom::new(9).unwrap();
let feed: Vec<Candle> = Vec::new(); // your live stream
for candle in feed {
    if f.update(candle) == Some(1.0) { println!("frying pan bottom"); }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Accumulation base.** The rounded shape signals patient accumulation; the
   breakout off the rim is the entry.
2. **Volume confirmation.** A genuine frying pan often shows volume rising into the
   right side of the bowl — confirm with a volume indicator.
3. **Target.** A common target projects the depth of the bowl above the breakout.

## Common pitfalls

- **Window sizing.** Too short a `period` calls every dip a pan; too long misses
  compact bases.
- **Close-only.** It uses closes; intrabar spikes are ignored.
- **Bullish only.** For the rounded top see [`DumplingTop`](/Indicators/Indicator-DumplingTop).

## References

Bulkowski, T. N. (2005), *Encyclopedia of Chart Patterns* (rounded bottoms); a
Japanese candlestick equivalent appears in Nison, S. (1994), *Beyond Candlesticks*.

## See also

- [Indicator-DumplingTop](/Indicators/Indicator-DumplingTop) — the rounded-top mirror.
- [Indicator-CupAndHandle](/Indicators/Indicator-CupAndHandle) — cup base with handle.
- [Indicator-DoubleTopBottom](/Indicators/Indicator-DoubleTopBottom) — double-extreme reversal.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
