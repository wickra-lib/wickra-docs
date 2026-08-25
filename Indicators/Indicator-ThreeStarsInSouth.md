# ThreeStarsInSouth

> Rare three-bar bullish reversal. Three shrinking black candles, each
> carving a higher low and contracting toward a tiny black marubozu, show
> selling pressure draining away at the bottom of a decline.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` bullish, `0.0` otherwise (never `-1.0`) |
| Output range | `{0.0, +1.0}` |
| Default parameters | `tolerance = 0.001` (10 bps); bindings use the default |
| Warmup period | `3` (first two bars always `0.0`) |
| Interpretation | Bullish exhaustion bottom after a decline |

## Formula

```
tol = tolerance · max(|bar3.high|, |bar3.low|)
all three red:  close < open
bar1 long lower shadow:  (bar1.close − bar1.low) >= (bar1.open − bar1.close)
bar2 opens inside bar1's body, higher low, smaller body, closes above bar1.close
bar3 small black marubozu (upper & lower shadow <= tol) inside bar2's range
```

Bullish-only (never `−1.0`). Three black candles whose ranges contract and lows
*rise* show sellers losing ground — the southern stars fading. See
`crates/wickra-core/src/indicators/three_stars_in_south.rs`.

## Parameters

| Name | Type | Default | Valid range | Source |
|------|------|---------|-------------|--------|
| `tolerance` | `f64` | `0.001` | `[0.0, 1.0)` | `ThreeStarsInSouth::with_tolerance` (`three_stars_in_south.rs`) |

`with_tolerance` outside `[0, 1)` errors; pinned by `rejects_invalid_tolerance`
and `accepts_valid_tolerance`. Python (`ta.ThreeStarsInSouth()`) and Node
(`new ta.ThreeStarsInSouth()`) construct with the default tolerance.

## Signed ±1 encoding

Single-direction shape: `+1.0` bullish, `0.0` no pattern — one feature-matrix
dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, ThreeStarsInSouth, Candle};
// ThreeStarsInSouth: Input = Candle, Output = f64
const _: fn(&mut ThreeStarsInSouth, Candle) -> Option<f64> = <ThreeStarsInSouth as Indicator>::update;
```

- **Always emits a value.** Never `None`; warmup and no-match bars return `0.0`.
- **Node.** `update(open, high, low, close)` → `number`; `batch(open, high, low,
  close)` → `Array<number>`.
- **Python.** `update(candle)` → `float`; `batch(open, high, low, close)` → 1-D
  `array.array('d')` (`0.0` on warmup / no-match).

## Warmup

`warmup_period() == 3`. The first two bars return `0.0`
(`first_two_bars_return_zero`, `accessors_and_metadata`).

## Edge cases

- **Third candle must be a clean small marubozu.** Any meaningful shadow on the
  third candle yields `0.0` (`third_with_shadow_yields_zero`).
- **Lows must rise.** A lower low on a later candle breaks the contraction
  (`lower_low_yields_zero`).
- **Reset.** `reset()` clears the two-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, ThreeStarsInSouth};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = ThreeStarsInSouth::new();
    println!("{:?}", t.update(Candle::new(20.0, 20.1, 8.0, 15.0, 1.0, 0)?));  // long lower shadow
    println!("{:?}", t.update(Candle::new(18.0, 18.1, 12.0, 16.0, 1.0, 1)?)); // smaller, higher low
    println!("{:?}", t.update(Candle::new(15.0, 15.0, 14.0, 14.0, 1.0, 2)?)); // tiny black marubozu
    Ok(())
}
```

Output:

```
Some(0.0)
Some(0.0)
Some(1.0)
```

Lows rise `8 → 12 → 14` while the bodies shrink to a tiny black marubozu —
three stars in the south. This matches `three_stars_in_south_is_plus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([20.0, 18.0, 15.0])
h = np.array([20.1, 18.1, 15.0])
l = np.array([8.0,  12.0, 14.0])
c = np.array([15.0, 16.0, 14.0])

print(ta.ThreeStarsInSouth().batch(o, h, l, c))  # [0. 0. 1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.ThreeStarsInSouth();
t.update(20, 20.1, 8, 15);
t.update(18, 18.1, 12, 16);
console.log(t.update(15, 15, 14, 14)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, ThreeStarsInSouth};

let mut t = ThreeStarsInSouth::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if t.update(bar) == Some(1.0) { /* selling exhaustion at the lows */ }
}
```

## Interpretation

1. **Exhaustion bottom.** Three black candles that keep shrinking and lifting
   their lows show sellers unable to extend — a bullish reversal cue after a
   decline.
2. **Very rare.** Like Concealing Baby Swallow, prints are scarce; treat as a
   prompt to look for confirmation.
3. **Confirm.** A white follow-through candle or a momentum turn strengthens the
   read.

## Common pitfalls

- **Demanding a perfect third marubozu.** It only needs to be a *small* black
  body with shadows within `tolerance`.
- **No downtrend context.** Only meaningful at the foot of a decline.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [ConcealingBabySwallow](/Indicators/Indicator-ConcealingBabySwallow) — another rare
  multi-black bottoming pattern.
- [LadderBottom](/Indicators/Indicator-LadderBottom) — a five-bar bottoming reversal.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
