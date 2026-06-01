# Spinning Top

> Single-bar indecision candle with a small body and two long
> shadows. Both bulls and bears pushed price away from the close,
> but neither side won — the bar's body is small, both shadows long.
> Stronger indecision signal than Doji (which has body ≈ 0) because
> Spinning Top still has a colour direction.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Candlestick Patterns                                                 |
| Input type          | `Candle`                                                             |
| Output type         | `f64` — `+1.0` bullish ST, `-1.0` bearish ST, `0.0` otherwise        |
| Output range        | `{-1.0, 0.0, +1.0}`                                                  |
| Default parameters  | `body_threshold = 0.3` (body ≤ 30% of range)                         |
| Warmup period       | `1`                                                                  |
| Interpretation      | Indecision; signed by candle direction                                |

## Formula

```
body         = |close - open|
upper_shadow = high - max(open, close)
lower_shadow = min(open, close) - low
range        = high - low

spinning = (body <= body_threshold · range)
        AND (upper_shadow >= 2 · body)
        AND (lower_shadow >= 2 · body)
        AND (body > 0)

direction = +1.0 if close > open
            -1.0 if close < open
```

A clean Doji (body == 0) is **not** a Spinning Top — the `body > 0`
clause rejects it. See
`crates/wickra-core/src/indicators/spinning_top.rs`.

## Parameters

| Name             | Type  | Default | Constraint        | Description |
|------------------|-------|---------|-------------------|-------------|
| `body_threshold` | `f64` | `0.3`   | finite, `(0, 1]`  | Body as max fraction of range. |

`SpinningTop::new` returns `Error::InvalidPeriod` for out-of-range
`body_threshold`.

## Signed ±1 encoding

This pattern already emits the uniform candlestick sign convention
shared across the family — `+1.0` bullish, `−1.0` bearish, `0.0`
no pattern — so it drops straight into a machine-learning feature
matrix where the bullish and bearish variants of the pattern
occupy a single dimension.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python / Node: same as
other single-bar candle patterns.

## Warmup

`warmup_period() == 1`. Stateless.

## Edge cases

- **Distinct from Doji.** Doji requires `body ≈ 0`; Spinning Top
  requires `body > 0` AND `body / range ≤ threshold` AND both
  shadows ≥ 2·body.
- **Direction signed.** Even though the pattern is indecision,
  Wickra emits a signed value so downstream filters can pick
  bullish ST vs bearish ST.
- **Reset.** Stateless.

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, SpinningTop};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Small green body, long wicks both sides
    let c = Candle::new(100.0, 103.0, 97.0, 100.5, 1.0, 0)?;
    let mut st = SpinningTop::with_threshold(0.3)?;
    println!("{:?}", st.update(c));  // +1.0 (bullish ST: small body, long shadows, close > open)
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

o = np.array([100.0])
h = np.array([103.0])
l = np.array([ 97.0])
c = np.array([100.5])

st = ta.SpinningTop(0.3)
print(st.batch(o, h, l, c))
```

### Node

```javascript
const wickra = require('wickra');
const st = new wickra.SpinningTop(0.3);
console.log(st.batch([100], [103], [97], [100.5]));
```

### Streaming

```rust
use wickra::{Candle, Indicator, SpinningTop};

let mut st = SpinningTop::with_threshold(0.3).unwrap();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    let v = st.update(bar);
    if v.is_some_and(|x| x != 0.0) {
        /* indecision bar — watch next bar for direction confirmation */
    }
}
```

## Interpretation

- **Indecision.** Both sides pushed price far from the close but
  couldn't sustain — signals a pause / equilibrium.
- **At trend extremes.** A Spinning Top after a strong move is a
  potential exhaustion signal — momentum has paused, reversal
  may follow.
- **Pair with confirmation.** Like Doji, Spinning Top is a
  watch-the-next-bar signal. Often appears as middle bar in
  three-bar reversal patterns.

## Common pitfalls

- **Mistaking ST for Doji.** Doji = no body; ST = small body with
  long wicks. Two different patterns with different signal
  characteristics.
- **Trading ST alone.** Statistical edge as a reversal trigger is
  marginal; useful as a *filter* on top of other signals.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [Doji](Indicator-Doji) — zero-body cousin.
- [Marubozu](Indicator-Marubozu) — opposite (full body, no
  shadows).
- [Hammer](Indicator-Hammer), [HangingMan](Indicator-HangingMan)
  — asymmetric long-wick siblings.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
