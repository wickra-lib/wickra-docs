# Marubozu

> Single-bar strong-continuation candle with body equal to range and
> (almost) no shadows. A clean directional bar — one side won the
> entire bar with no contest. Signals strong momentum in the
> direction of the body.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Candlestick Patterns                                                 |
| Input type          | `Candle`                                                             |
| Output type         | `f64` — `+1.0` bullish, `-1.0` bearish, `0.0` otherwise              |
| Output range        | `{-1.0, 0.0, +1.0}`                                                  |
| Default parameters  | `shadow_tolerance = 0.05` (5% of range per shadow)                   |
| Warmup period       | `1`                                                                  |
| Interpretation      | Strong momentum confirmation in the direction of the body            |

## Formula

```
range        = high - low
upper_shadow = high - max(open, close)
lower_shadow = min(open, close) - low

shadows OK = (upper_shadow <= tol · range)
          AND (lower_shadow <= tol · range)

bullish (+1.0): shadows OK AND close > open
bearish (-1.0): shadows OK AND close < open
otherwise: 0.0
```

`shadow_tolerance` defaults to `0.05` (5% of bar range allowed on
each side). See `crates/wickra-core/src/indicators/marubozu.rs`.

## Parameters

| Name               | Type  | Default | Constraint        | Description |
|--------------------|-------|---------|-------------------|-------------|
| `shadow_tolerance` | `f64` | `0.05`  | finite, `[0, 1)`  | Max allowed shadow as fraction of range. |

`Marubozu::new` returns `Error::InvalidPeriod` for out-of-range
`shadow_tolerance`. `Marubozu::default()` returns the `0.05`
factory.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python: `Marubozu(tol).batch(open, high, low, close)`
returns a 1-D `np.ndarray`. Node: same; `update(candle)` returns
`number | null`.

## Warmup

`warmup_period() == 1`. Stateless.

## Edge cases

- **Zero-body bar.** Doji-style bars have body = 0; the `>` /
  `<` strict inequality fails, output is `0.0`.
- **Tolerance choice.** `0.0` (strict zero shadows) is rarely
  satisfied by real data; `0.05` (5%) is a practical default.
- **Reset.** Stateless.

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, Marubozu};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Bullish Marubozu: open=100, close=110, high=110.05, low=99.95
    let c = Candle::new(100.0, 110.05, 99.95, 110.0, 1.0, 0)?;
    let mut m = Marubozu::default();
    println!("{:?}", m.update(c));  // +1.0
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

o = np.array([100.0])
h = np.array([110.05])
l = np.array([99.95])
c = np.array([110.0])

m = ta.Marubozu(0.05)
print(m.batch(o, h, l, c))
```

### Node

```javascript
const wickra = require('wickra');
const m = new wickra.Marubozu(0.05);
console.log(m.batch([100], [110.05], [99.95], [110]));
```

### Streaming

```rust
use wickra::{Candle, Indicator, Marubozu};

let mut m = Marubozu::default();
for bar in candle_stream {
    if m.update(bar) == Some(1.0) { /* bullish continuation */ }
    if m.update(bar) == Some(-1.0) { /* bearish continuation */ }
}
```

## Interpretation

- **Strong momentum.** No shadow = no opposing pressure. A
  Marubozu in the direction of the prevailing trend confirms
  strong trend continuation.
- **At range extremes.** A Marubozu *against* a range is often
  the first bar of a range breakout. A Marubozu in the trend's
  direction near a swing high may also signal exhaustion (after
  a long run).
- **Pair with volume.** A Marubozu on high volume is significantly
  more meaningful than one on low volume.

## Common pitfalls

- **Tolerance too tight.** With `shadow_tolerance = 0.0`, almost
  no real bar qualifies. Default `0.05` is the practical floor.
- **Treating every Marubozu as continuation.** Late-stage
  Marubozu (after extended trend) often marks exhaustion, not
  continuation. Pair with trend duration / divergence indicators.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991)
  — Marubozu among the basic candle definitions.

## See also

- [ThreeSoldiersOrCrows](Indicator-ThreeSoldiersOrCrows) —
  multi-bar continuation pattern.
- [Engulfing](Indicator-Engulfing) — full-body engulfing
  reversal.
- [SpinningTop](Indicator-SpinningTop) — Marubozu's opposite
  (long shadows, small body).
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
