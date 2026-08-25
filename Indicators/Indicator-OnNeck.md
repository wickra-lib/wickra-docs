# OnNeck

> Two-bar bearish continuation. In a decline a long black candle is
> followed by a white candle that opens below the black bar's low yet
> rallies only as far as the black bar's *low* (the "neckline"). The
> feeble bounce shows sellers remain in control.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `-1.0` bearish, `0.0` otherwise (never `+1.0`) |
| Output range | `{-1.0, 0.0}` |
| Default parameters | none — `OnNeck::new()` |
| Warmup period | `2` (first bar always `0.0`) |
| Interpretation | Bearish continuation; the weakest of the neck-line bounces |

## Formula

```
long body = |close − open| >= 0.5 · (high − low)
bar1 black & long
bar2 white, opens below bar1's low:       open2 < low1
bar2 closes at bar1's low (the neckline):  |close2 − low1| <= 0.05 · range1
```

Bearish-only (never `+1.0`). The bounce dies exactly at the prior low. Ranked by
how far the bounce recovers: On-Neck (to the low) < [InNeck](/Indicators/Indicator-InNeck)
(just into the body) < [Thrusting](/Indicators/Indicator-Thrusting) (toward mid-body) <
piercing (past mid-body, a reversal). See
`crates/wickra-core/src/indicators/on_neck.rs`.

## Parameters

None. Constructed with `OnNeck::new()`.

## Signed ±1 encoding

Single-direction shape: `−1.0` bearish, `0.0` no pattern — one feature-matrix
dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, OnNeck, Candle};
// OnNeck: Input = Candle, Output = f64
const _: fn(&mut OnNeck, Candle) -> Option<f64> = <OnNeck as Indicator>::update;
```

- **Always emits a value.** Never `None`; warmup and no-match bars return `0.0`.
- **Node.** `update(open, high, low, close)` → `number`; `batch(open, high, low,
  close)` → `Array<number>`.
- **Python.** `update(candle)` → `float`; `batch(open, high, low, close)` → 1-D
  `array.array('d')` (`0.0` on warmup / no-match).

## Warmup

`warmup_period() == 2`. The first bar returns `0.0` (`first_bar_returns_zero`,
`accessors_and_metadata`).

## Edge cases

- **Close into the body.** A second close that recovers into the black body is
  In-Neck/Thrusting/piercing, not On-Neck (`close_into_body_yields_zero`).
- **Second bar must be white and open below the low.** Otherwise `0.0`
  (`second_bar_black_yields_zero`, `opens_above_low_yields_zero`).
- **Reset.** `reset()` clears the one-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, OnNeck};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = OnNeck::new();
    println!("{:?}", t.update(Candle::new(15.0, 15.1, 9.0, 10.0, 1.0, 0)?)); // long black, low 9
    println!("{:?}", t.update(Candle::new(7.0, 9.1, 6.9, 9.0, 1.0, 1)?));    // white, closes at 9
    Ok(())
}
```

Output:

```
Some(0.0)
Some(-1.0)
```

The white bar opens at `7.0` (below the black low `9.0`) and closes right at the
neckline `9.0` — an on-neck. This matches `on_neck_is_minus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([15.0, 7.0])
h = np.array([15.1, 9.1])
l = np.array([9.0,  6.9])
c = np.array([10.0, 9.0])

print(ta.OnNeck().batch(o, h, l, c))  # [ 0. -1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.OnNeck();
t.update(15, 15.1, 9, 10);
console.log(t.update(7, 9.1, 6.9, 9)); // -1
```

### Streaming

```rust
use wickra::{Candle, Indicator, OnNeck};

let mut t = OnNeck::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if t.update(bar) == Some(-1.0) { /* weak bounce — downtrend continuation */ }
}
```

## Interpretation

1. **Failed bounce.** A rebound that stalls at the prior low shows sellers still
   dominant — bearish continuation in a downtrend.
2. **Weakest of the family.** The shallower the recovery, the more bearish; On-Neck
   is the shallowest. Compare with [InNeck](/Indicators/Indicator-InNeck) and
   [Thrusting](/Indicators/Indicator-Thrusting).
3. **Confirm with the trend.** Only meaningful inside a decline.

## Common pitfalls

- **Deeper close.** A close into or past the body is a different (less bearish)
  neck-line pattern or an outright reversal.
- **No downtrend context.** Continuation patterns need an existing trend.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [InNeck](/Indicators/Indicator-InNeck) — bounce just into the body.
- [Thrusting](/Indicators/Indicator-Thrusting) — bounce toward mid-body.
- [PiercingDarkCloud](/Indicators/Indicator-PiercingDarkCloud) — the reversal past mid-body.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
