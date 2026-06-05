# LadderBottom

> Five-bar bullish reversal. Three long black candles step the market down
> like rungs of a ladder, a fourth black candle finally shows an upper
> shadow (the first sign of buying), and a white candle then gaps up into
> its body to confirm the turn.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` bullish, `0.0` otherwise (never `-1.0`) |
| Output range | `{0.0, +1.0}` |
| Default parameters | none — `LadderBottom::new()` |
| Warmup period | `5` (first four bars always `0.0`) |
| Interpretation | Bottoming reversal after a stepped decline |

## Formula

```
bar1, bar2, bar3 black, with consecutively lower opens AND closes
bar4 black with an upper shadow      (high4 > open4)
bar5 white, opens above bar4's body   (open5 > open4) and closes up
```

Bullish-only (never `−1.0`). The fourth candle's upper shadow is the first hint
of buying; the white fifth confirms. See
`crates/wickra-core/src/indicators/ladder_bottom.rs`.

## Parameters

None. Constructed with `LadderBottom::new()`.

## Signed ±1 encoding

Single-direction shape: `+1.0` bullish, `0.0` no pattern — one feature-matrix
dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, LadderBottom, Candle};
// LadderBottom: Input = Candle, Output = f64
const _: fn(&mut LadderBottom, Candle) -> Option<f64> = <LadderBottom as Indicator>::update;
```

- **Always emits a value.** Never `None`; warmup and no-match bars return `0.0`.
- **Node.** `update(open, high, low, close)` → `number`; `batch(open, high, low,
  close)` → `Array<number>`.
- **Python.** `update(candle)` → `float`; `batch(open, high, low, close)` → 1-D
  `numpy.ndarray` (`0.0` on warmup / no-match).

## Warmup

`warmup_period() == 5`. The first four bars return `0.0`
(`first_four_bars_return_zero`, `accessors_and_metadata`).

## Edge cases

- **Fourth bar needs an upper shadow.** Without it (the first buying hint) the
  result is `0.0` (`fourth_bar_without_upper_shadow_yields_zero`).
- **First three must be descending blacks.** Otherwise `0.0`
  (`not_three_descending_blacks_yields_zero`).
- **Reset.** `reset()` clears the four-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, LadderBottom};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = LadderBottom::new();
    println!("{:?}", t.update(Candle::new(20.0, 20.1, 17.9, 18.0, 1.0, 0)?)); // black
    println!("{:?}", t.update(Candle::new(18.0, 18.1, 15.9, 16.0, 1.0, 1)?)); // lower black
    println!("{:?}", t.update(Candle::new(16.0, 16.1, 13.9, 14.0, 1.0, 2)?)); // lower black
    println!("{:?}", t.update(Candle::new(14.0, 15.0, 12.4, 12.5, 1.0, 3)?)); // black, upper shadow
    println!("{:?}", t.update(Candle::new(15.0, 17.1, 14.9, 17.0, 1.0, 4)?)); // white, gaps up
    Ok(())
}
```

Output:

```
Some(0.0)
Some(0.0)
Some(0.0)
Some(0.0)
Some(1.0)
```

Three descending blacks, a fourth black with an upper shadow (high `15 > open
14`), then a white candle opening above it — a ladder bottom. This matches
`ladder_bottom_is_plus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([20.0, 18.0, 16.0, 14.0, 15.0])
h = np.array([20.1, 18.1, 16.1, 15.0, 17.1])
l = np.array([17.9, 15.9, 13.9, 12.4, 14.9])
c = np.array([18.0, 16.0, 14.0, 12.5, 17.0])

print(ta.LadderBottom().batch(o, h, l, c))  # [0. 0. 0. 0. 1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.LadderBottom();
t.update(20, 20.1, 17.9, 18);
t.update(18, 18.1, 15.9, 16);
t.update(16, 16.1, 13.9, 14);
t.update(14, 15, 12.4, 12.5);
console.log(t.update(15, 17.1, 14.9, 17)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, LadderBottom};

let mut t = LadderBottom::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if t.update(bar) == Some(1.0) { /* stepped decline reversing */ }
}
```

## Interpretation

1. **Exhaustion of a staircase decline.** Three orderly down-rungs, then the
   first buying wick, then a confirming white candle — a bullish bottom.
2. **Rare.** Five-bar reversals print infrequently; treat as a prompt to confirm.
3. **Best at support.** Strongest at the foot of an extended decline.

## Common pitfalls

- **Missing the fourth-bar shadow.** The upper shadow on bar 4 is the defining
  early-buying signal; without it this is just a decline.
- **No downtrend context.** Only meaningful after a decline.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [ConcealingBabySwallow](/Indicators/Indicator-ConcealingBabySwallow) — another rare
  multi-black bottoming pattern.
- [RisingThreeMethods](/Indicators/Indicator-RisingThreeMethods) — five-bar bullish
  continuation.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
