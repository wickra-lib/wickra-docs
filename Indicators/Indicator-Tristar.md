# Tristar

> Three consecutive Doji where the middle gaps away from its neighbours — a rare
> top (middle above) or bottom (middle below) reversal.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` (open / high / low / close) |
| Output type | `f64` (signed signal) |
| Output range | `{−1, 0, +1}` |
| Default parameters | None (doji threshold fixed at `0.1`) |
| Warmup period | `3` |
| Interpretation | `+1` bullish bottom; `−1` bearish top. |

## Formula

```
all three bars are doji:  |close − open| <= 0.1 * (high − low)
mid = body centre of the middle doji,  n1/n3 = body centres of the outer two
Bearish (−1): mid > n1 AND mid > n3   (middle star on top)
Bullish (+1): mid < n1 AND mid < n3   (middle star on bottom)
otherwise 0
```

A Tristar is three indecision candles in a row with the middle one isolated above
(top) or below (bottom) the others — a strong signal of exhaustion after a trend.
Source: `crates/wickra-core/src/indicators/tristar.rs`.

## Parameters

| Name | Type | Default | Valid range | Source | Description |
|------|------|---------|-------------|--------|-------------|
| — | — | — | — | None. | Tristar is parameter-free; the doji body/range threshold is fixed at `0.1`. |

## Signed ±1 encoding

`+1.0` bullish (bottom), `−1.0` bearish (top), `0.0` no pattern (warmup emits
`None`).

## Inputs / Outputs

From `crates/wickra-core/src/indicators/tristar.rs`:

```rust
use wickra::{Candle, Indicator, Tristar};
// Tristar: Input = Candle, Output = f64
const _: fn(&mut Tristar, Candle) -> Option<f64> = <Tristar as Indicator>::update;
```

A `Candle` in, an `Option<f64>` out. Python `update(candle)` / `batch(open, high,
low, close)` → 1-D ndarray; Node `update(open, high, low, close)` / `batch(...)`.

## Warmup

`warmup_period() == 3`. Two candles seed the buffer
(`first_two_bars_seed_without_signal` pins this).

## Edge cases

- **Bearish top.** Middle doji highest → `−1` (`bearish_tristar_top` pins this).
- **Bullish bottom.** Middle doji lowest → `+1` (`bullish_tristar_bottom` pins
  this).
- **Non-doji → 0.** Any solid body breaks the pattern (`non_doji_is_zero` pins
  this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `t.reset()` clears the two prior candles and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, Tristar};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = Tristar::new();
    let doji = |mid: f64| Candle::new(mid, mid + 1.0, mid - 1.0, mid + 0.02, 0.0, 0).unwrap();
    t.update(doji(100.0));
    t.update(doji(105.0)); // middle highest
    println!("{:?}", t.update(doji(100.0))); // Some(-1.0)
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

t = ta.Tristar()
o = np.array([100, 105, 100], float); h = o + 1; l = o - 1; c = o + 0.02
print(t.batch(o, h, l, c))  # [nan, nan, -1.0]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.Tristar();
t.update(100, 101, 99, 100.02); t.update(105, 106, 104, 105.02);
console.log(t.update(100, 101, 99, 100.02)); // -1
```

### Streaming

```rust
use wickra::{Candle, Indicator, Tristar};

let mut t = Tristar::new();
let feed: Vec<Candle> = Vec::new(); // your live stream
for candle in feed {
    match t.update(candle) {
        Some(1.0)  => println!("tristar bottom"),
        Some(-1.0) => println!("tristar top"),
        _ => {}
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Exhaustion.** Three dojis after a trend signal that momentum has stalled; the
   star geometry hints at the reversal direction.
2. **Confirmation.** Wait for a confirming bar beyond the pattern before acting —
   Tristar is rare and prone to noise.
3. **Context.** Most meaningful at a tested support/resistance level.

## Common pitfalls

- **Rare and finicky.** True three-doji clusters are uncommon; the threshold choice
  matters.
- **Needs trend context.** A Tristar mid-range is meaningless; it is a reversal
  pattern.
- **Gap definition.** This uses body-centre ordering rather than strict gaps to be
  robust on gapless (24/7) markets.

## References

Nison, S. (1991), *Japanese Candlestick Charting Techniques*.

## See also

- [Indicator-Doji](/Indicators/Indicator-Doji) — the building-block indecision candle.
- [Indicator-MorningEveningStar](/Indicators/Indicator-MorningEveningStar) — body-star reversal.
- [Indicator-HaramiCross](/Indicators/Indicator-HaramiCross) — doji-inside reversal.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
