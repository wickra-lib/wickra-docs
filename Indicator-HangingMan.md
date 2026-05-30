# Hanging Man

> Single-bar bearish reversal candidate. Same geometry as a
> [Hammer](Indicator-Hammer) — small body near the top, long lower
> shadow ≥ 2× body, short upper shadow — but read **bearishly**
> because it appears at the top of an uptrend. Same shape, opposite
> context, opposite interpretation.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Candlestick Patterns                                                 |
| Input type          | `Candle`                                                             |
| Output type         | `f64` — `-1.0` if Hanging Man, `0.0` otherwise                       |
| Output range        | `{-1.0, 0.0}`                                                        |
| Default parameters  | none — `HangingMan::new()`                                           |
| Warmup period       | `1`                                                                  |
| Interpretation      | Bearish reversal candidate (in uptrend context)                       |

## Formula

```
body         = |close - open|
upper_shadow = high - max(open, close)
lower_shadow = min(open, close) - low

hanging = (lower_shadow >= 2 · body)
       AND (upper_shadow <= body)
       AND (body > 0)
```

Output is `-1.0` when the shape matches, `0.0` otherwise. See
`crates/wickra-core/src/indicators/hanging_man.rs`.

## Parameters

None — `HangingMan::new()` takes no arguments.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python / Node: same
shape as [Hammer](Indicator-Hammer).

## Warmup

`warmup_period() == 1`. Stateless.

## Edge cases

- **Same shape as Hammer.** The indicator emits `-1.0` (bearish
  reading); pair with an uptrend filter externally.
- **No trend filter.** Shape only — *strongly* recommended to
  combine with trend detection because the same shape interpreted
  as Hammer is bullish.
- **Reset.** Stateless.

## Examples

### Rust

```rust
use wickra::{Candle, HangingMan, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let c = Candle::new(100.0, 101.0, 95.0, 100.5, 1.0, 0)?;
    let mut hm = HangingMan::new();
    println!("{:?}", hm.update(c));  // -1.0
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

o = np.array([100.0])
h = np.array([101.0])
l = np.array([ 95.0])
c = np.array([100.5])

hm = ta.HangingMan()
print(hm.batch(o, h, l, c))
```

### Node

```javascript
const wickra = require('wickra');
const hm = new wickra.HangingMan();
console.log(hm.batch([100], [101], [95], [100.5]));
```

### Streaming with uptrend filter

```rust
use wickra::{Candle, HangingMan, Indicator, Sma};

let mut hm = HangingMan::new();
let mut sma = Sma::new(50).unwrap();
for bar in candle_stream {
    let trend = sma.update(bar.close);
    if hm.update(bar) == Some(-1.0) {
        if matches!(trend, Some(s) if bar.close > s) {
            // bearish reversal candidate in confirmed uptrend
        }
    }
}
```

## Interpretation

- **Bearish reversal.** Most powerful at the top of an uptrend or
  at established resistance.
- **Confirmation required.** Many traders require the next bar
  to close below the Hanging Man's body before acting.
- **Same shape, opposite signal.** This indicator simply emits
  the bearish reading of the Hammer shape; it cannot distinguish
  which context applies — you must.

## Common pitfalls

- **Acting on shape without trend context.** A Hanging Man in a
  downtrend is just noise. Always pair with a trend / extreme
  filter.
- **Confusing with Hammer.** Identical shape. Wickra emits both
  indicators on the same bar (Hammer reads `+1.0`, Hanging Man
  reads `-1.0`) — your strategy picks which one applies based on
  trend context.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [Hammer](Indicator-Hammer) — same shape, bullish reading.
- [ShootingStar](Indicator-ShootingStar) — bearish, with long
  upper shadow.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
