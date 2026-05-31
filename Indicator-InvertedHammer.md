# Inverted Hammer

> Single-bar bullish reversal candidate. The mirror of a Hammer:
> small real body near the bottom of the bar, a long upper shadow
> at least twice the body, and a short or absent lower shadow.
> Read as a failed test of upper resistance that may foreshadow a
> bullish reversal.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Candlestick Patterns                                                 |
| Input type          | `Candle`                                                             |
| Output type         | `f64` — `+1.0` if Inverted Hammer, `0.0` otherwise                   |
| Output range        | `{0.0, +1.0}`                                                        |
| Default parameters  | none — `InvertedHammer::new()`                                       |
| Warmup period       | `1`                                                                  |
| Interpretation      | Bullish reversal candidate (in downtrend context)                    |

## Formula

```
body         = |close - open|
upper_shadow = high - max(open, close)
lower_shadow = min(open, close) - low

inverted = (upper_shadow >= 2 · body)
        AND (lower_shadow <= body)
        AND (body > 0)
```

Output is `+1.0` when the shape matches, `0.0` otherwise. See
`crates/wickra-core/src/indicators/inverted_hammer.rs`.

## Parameters

None — `InvertedHammer::new()` takes no arguments. Shape ratios
are fixed.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python / Node: same
shape as [Hammer](Indicator-Hammer).

## Warmup

`warmup_period() == 1`. Stateless.

## Edge cases

- **Zero-body bar.** Pure Doji is not an Inverted Hammer.
- **No trend filter.** Shape only — combine with a trend
  indicator for actionable signals.
- **Reset.** Stateless.

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, InvertedHammer};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Inverted Hammer: o=100.5, h=105, l=100, c=100  — long upper shadow
    let c = Candle::new(100.5, 105.0, 100.0, 100.2, 1.0, 0)?;
    let mut ih = InvertedHammer::new();
    println!("{:?}", ih.update(c));
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

o = np.array([100.5])
h = np.array([105.0])
l = np.array([100.0])
c = np.array([100.2])

ih = ta.InvertedHammer()
print(ih.batch(o, h, l, c))
```

### Node

```javascript
const wickra = require('wickra');
const ih = new wickra.InvertedHammer();
console.log(ih.batch([100.5], [105], [100], [100.2]));
```

### Streaming

```rust
use wickra::{Candle, Indicator, InvertedHammer};

let mut ih = InvertedHammer::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if ih.update(bar) == Some(1.0) {
        /* inverted hammer — combine with downtrend filter */
    }
}
```

## Interpretation

- **Bullish reversal candidate.** Most powerful at the bottom of
  a downtrend. Buyers tried to push price up; sellers pushed
  back, but the failed attempt itself often signals exhaustion.
- **Vs Hammer.** Hammer: long lower shadow. Inverted Hammer:
  long upper shadow. Both bullish reversal candidates in
  downtrend context but different price-action stories.
- **Vs Shooting Star.** Identical shape; Inverted Hammer is the
  *bullish* reading (after downtrend), Shooting Star is the
  *bearish* reading (after uptrend). Context determines
  interpretation.

## Common pitfalls

- **Confusing with Shooting Star.** Same shape, opposite trend
  context. See [ShootingStar](Indicator-ShootingStar).
- **Treating shape alone as actionable.** Without downtrend
  context, an Inverted Hammer is just a candle.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [Hammer](Indicator-Hammer) — long lower shadow variant.
- [ShootingStar](Indicator-ShootingStar) — same shape, bearish
  reading.
- [HangingMan](Indicator-HangingMan) — Hammer's bearish twin.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
