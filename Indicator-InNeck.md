# InNeck

> Two-bar bearish continuation, slightly stronger than On-Neck. A long
> black candle in a decline is followed by a white candle that opens below
> the black bar's low and closes just barely *into* the black body, around
> its close level. The shallow recovery still favours the sellers.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `-1.0` bearish, `0.0` otherwise (never `+1.0`) |
| Output range | `{-1.0, 0.0}` |
| Default parameters | none — `InNeck::new()` |
| Warmup period | `2` (first bar always `0.0`) |
| Interpretation | Bearish continuation; bounce just into the body |

## Formula

```
long body = |close − open| >= 0.5 · (high − low)
bar1 black & long
bar2 white, opens below bar1's low:        open2 < low1
bar2 closes just into bar1's body:          close1 <= close2 <= close1 + 0.1 · body1
```

Bearish-only (never `+1.0`). The bounce recovers marginally above the prior
close — deeper than [OnNeck](Indicator-OnNeck) (to the low) but far short of a
reversal. See `crates/wickra-core/src/indicators/in_neck.rs`.

## Parameters

None. Constructed with `InNeck::new()`.

## Signed ±1 encoding

Single-direction shape: `−1.0` bearish, `0.0` no pattern — one feature-matrix
dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, InNeck, Candle};
// InNeck: Input = Candle, Output = f64
const _: fn(&mut InNeck, Candle) -> Option<f64> = <InNeck as Indicator>::update;
```

- **Always emits a value.** Never `None`; warmup and no-match bars return `0.0`.
- **Node.** `update(open, high, low, close)` → `number`; `batch(open, high, low,
  close)` → `Array<number>`.
- **Python.** `update(candle)` → `float`; `batch(open, high, low, close)` → 1-D
  `numpy.ndarray` (`0.0` on warmup / no-match).

## Warmup

`warmup_period() == 2`. The first bar returns `0.0` (`first_bar_returns_zero`,
`accessors_and_metadata`).

## Edge cases

- **Close at the low.** A close right at the prior low is On-Neck, not In-Neck
  (`close_at_low_yields_zero`).
- **Close past the neck zone.** A deeper close is Thrusting/piercing
  (`close_past_neck_yields_zero`).
- **Second bar must be white.** Otherwise `0.0` (`second_bar_black_yields_zero`).
- **Reset.** `reset()` clears the one-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, InNeck};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = InNeck::new();
    println!("{:?}", t.update(Candle::new(15.0, 15.1, 9.0, 10.0, 1.0, 0)?)); // long black, close 10
    println!("{:?}", t.update(Candle::new(7.0, 10.3, 6.9, 10.2, 1.0, 1)?));  // white, closes just into body
    Ok(())
}
```

Output:

```
Some(0.0)
Some(-1.0)
```

The white bar closes at `10.2`, just above the black close `10.0` (within
`0.1·body`) — an in-neck. This matches `in_neck_is_minus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([15.0, 7.0])
h = np.array([15.1, 10.3])
l = np.array([9.0,  6.9])
c = np.array([10.0, 10.2])

print(ta.InNeck().batch(o, h, l, c))  # [ 0. -1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.InNeck();
t.update(15, 15.1, 9, 10);
console.log(t.update(7, 10.3, 6.9, 10.2)); // -1
```

### Streaming

```rust
use wickra::{Candle, Indicator, InNeck};

let mut t = InNeck::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if t.update(bar) == Some(-1.0) { /* shallow bounce — downtrend continuation */ }
}
```

## Interpretation

1. **Still a failed bounce.** Recovering only just into the body keeps the bears
   in charge — bearish continuation.
2. **Mid of the neck family.** Slightly less bearish than [OnNeck](Indicator-OnNeck),
   more bearish than [Thrusting](Indicator-Thrusting).
3. **Confirm with the trend.** Continuation pattern; needs a decline.

## Common pitfalls

- **Boundary confusion.** The close band (just above the prior close) separates
  In-Neck from On-Neck and Thrusting; small differences change the label.
- **No downtrend context.** Only meaningful inside a decline.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [OnNeck](Indicator-OnNeck) — bounce to the low.
- [Thrusting](Indicator-Thrusting) — bounce toward mid-body.
- [PiercingDarkCloud](Indicator-PiercingDarkCloud) — the reversal past mid-body.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
