# Tristar

> Three consecutive Doji where the middle one's body gaps away from the first — a
> rare top (middle gaps above) or bottom (middle gaps below) reversal (Nison; TA-Lib
> `CDLTRISTAR`).

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
all three bars are doji:  |close − open| <= 0.1 * (high − low),  high > low
Bearish (−1): min(o2, c2) > max(o1, c1)     (middle body gaps above the first)
          AND max(o3, c3) < max(o2, c2)     (third body top below the middle's)
Bullish (+1): max(o2, c2) < min(o1, c1)     (middle body gaps below the first)
          AND min(o3, c3) > min(o2, c2)     (third body bottom above the middle's)
otherwise 0
```

A Tristar is three indecision candles in a row with the middle one's real body
gapping above (top) or below (bottom) the first — the body gap of the middle doji is
the defining feature — while the third doji fails to extend past the middle one. It
is a strong signal of exhaustion after a trend.
Source: `crates/wickra-core/src/indicators/tristar.rs`.

**TA-Lib parity.** On the TA-Lib reference pattern series the signals are
identical to `CDLTRISTAR` (`±1` here, `±100` there). TA-Lib sizes bodies and
shadows against 5- or 10-bar rolling averages ("candle settings"), while Wickra
sizes them against the pattern's own bars.

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
low, close)` → `array.array('d')`; Node `update(open, high, low, close)` / `batch(...)`.

## Warmup

`warmup_period() == 3`. Two candles seed the buffer
(`first_two_bars_seed_without_signal` pins this).

## Edge cases

- **Bearish top.** Middle doji body gaps above the first, third body top below the
  middle's → `−1` (`bearish_tristar_top` pins this).
- **Bullish bottom.** Middle doji body gaps below the first, third body bottom above
  the middle's → `+1` (`bullish_tristar_bottom` pins this).
- **No gap → 0.** A middle doji whose body overlaps the first doji's body is not a
  star, however its centre compares.
- **Third bar.** Only the third doji's body top (bearish) / bottom (bullish) is
  checked against the middle; it need not gap away from the middle.
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
    t.update(doji(105.0)); // middle body gaps above the first
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
print(t.batch(o, h, l, c))  # array('d', [nan, nan, -1.0])
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
- **Gap definition.** The middle doji's *body* must gap clear of the first doji's
  body (shadows may overlap). On gapless (24/7) markets, where each open equals the
  prior close, true body gaps are rare and the pattern will seldom fire.

## References

Nison, S. (1991), *Japanese Candlestick Charting Techniques*. TA-Lib `CDLTRISTAR` —
the body-gap rule implemented here.

## See also

- [Indicator-Doji](/Indicators/Indicator-Doji) — the building-block indecision candle.
- [Indicator-MorningEveningStar](/Indicators/Indicator-MorningEveningStar) — body-star reversal.
- [Indicator-HaramiCross](/Indicators/Indicator-HaramiCross) — doji-inside reversal.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
