# ConcealingBabySwallow

> Rare four-bar bullish reversal. Two black marubozu lead a steep
> decline; the third is a black candle that gaps down on the open yet
> throws a long upper shadow back up into the second body; the fourth is
> a large black candle that completely engulfs the third, shadows
> included. Relentless selling that can no longer make ground signals
> capitulation.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` bullish, `0.0` otherwise (never `-1.0`) |
| Output range | `{0.0, +1.0}` |
| Default parameters | none — `ConcealingBabySwallow::new()` |
| Warmup period | `4` (first three bars always `0.0`) |
| Interpretation | Capitulation bottom inside a steep downtrend |

## Formula

```
bar1, bar2 black marubozu (body ≈ range, shadows <= 5 % of range each)
bar3 black, opens below bar2's body:  open3 < close2          (downside open gap)
     with an upper shadow into it:    high3 > close2
bar4 black, engulfs bar3 incl. shadows:  open4 > high3  and  close4 < low3
```

`black_marubozu(c)` requires `open > close`, `range > 0`, and both shadows
`≤ 5 %` of range. The pattern is bullish-only (never `−1.0`): four black candles
whose final, larger candle "swallows" the third yet fails to extend the decline
is read as exhaustion. Thresholds are geometric, not TA-Lib rolling averages.
See `crates/wickra-core/src/indicators/concealing_baby_swallow.rs`.

## Parameters

None. Constructed with `ConcealingBabySwallow::new()`.

## Signed ±1 encoding

Single-direction shape: `+1.0` bullish, `0.0` no pattern — one feature-matrix
dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, ConcealingBabySwallow, Candle};
// ConcealingBabySwallow: Input = Candle, Output = f64
const _: fn(&mut ConcealingBabySwallow, Candle) -> Option<f64> = <ConcealingBabySwallow as Indicator>::update;
```

- **Always emits a value.** Never `None`; warmup and no-match bars return `0.0`.
- **Node.** `update(open, high, low, close)` → `number`; `batch(open, high, low,
  close)` → `Array<number>`.
- **Python.** `update(candle)` → `float`; `batch(open, high, low, close)` → 1-D
  `numpy.ndarray` (`0.0` on warmup / no-match).

## Warmup

`warmup_period() == 4`. The first three bars return `0.0`
(`warmup_returns_zero`, `accessors_and_metadata`).

## Edge cases

- **Leading bars not marubozu.** A white or shadowed first/second candle yields
  `0.0` (`first_bar_not_marubozu_yields_zero`,
  `second_bar_not_marubozu_yields_zero`); a flat first bar is rejected through
  the marubozu range check (`first_bar_zero_range_yields_zero`).
- **Third bar shape.** It must be black (`third_bar_not_black_yields_zero`),
  gap below the second body (`third_bar_no_gap_yields_zero`), and reach into it
  with an upper shadow (`third_bar_no_upper_shadow_yields_zero`).
- **Fourth bar must engulf shadows.** A non-black or non-engulfing fourth candle
  yields `0.0` (`fourth_bar_not_black_yields_zero`,
  `fourth_bar_not_engulfing_yields_zero`).
- **Reset.** `reset()` clears the three-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, ConcealingBabySwallow, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = ConcealingBabySwallow::new();
    println!("{:?}", t.update(Candle::new(20.0, 20.1, 14.9, 15.0, 1.0, 0)?)); // black marubozu
    println!("{:?}", t.update(Candle::new(16.0, 16.1, 11.9, 12.0, 1.0, 1)?)); // black marubozu
    println!("{:?}", t.update(Candle::new(11.0, 13.0, 9.9, 10.0, 1.0, 2)?));  // black, gap + upper shadow
    println!("{:?}", t.update(Candle::new(14.0, 14.1, 8.9, 9.0, 1.0, 3)?));   // black, engulfs bar3
    Ok(())
}
```

Output:

```
Some(0.0)
Some(0.0)
Some(0.0)
Some(1.0)
```

The fourth candle opens at `14.0` (above `high3 = 13.0`) and closes at `9.0`
(below `low3 = 9.9`), engulfing the third including its shadows. This matches
`concealing_baby_swallow_is_plus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([20.0, 16.0, 11.0, 14.0])
h = np.array([20.1, 16.1, 13.0, 14.1])
l = np.array([14.9, 11.9, 9.9,  8.9])
c = np.array([15.0, 12.0, 10.0, 9.0])

print(ta.ConcealingBabySwallow().batch(o, h, l, c))  # [0. 0. 0. 1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.ConcealingBabySwallow();
t.update(20, 20.1, 14.9, 15);
t.update(16, 16.1, 11.9, 12);
t.update(11, 13, 9.9, 10);
console.log(t.update(14, 14.1, 8.9, 9)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, ConcealingBabySwallow};

let mut t = ConcealingBabySwallow::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if t.update(bar) == Some(1.0) { /* rare capitulation bottom — confirm before acting */ }
}
```

## Interpretation

1. **Capitulation, not strength.** All four candles are black — the bullish read
   comes from the *failure* to extend after a wide engulfing bar, classic
   seller exhaustion at the end of a steep decline.
2. **Very rare.** One of the least frequent classical patterns; expect almost no
   prints on most series. Treat any signal as a prompt to look for confirmation,
   not a standalone entry.
3. **Confirm aggressively.** Because it is bullish despite four down candles,
   require follow-through (a white candle, a momentum turn) before trusting it.

## Common pitfalls

- **Loosening the marubozu test.** The first two candles must be near-shadowless;
  ordinary black candles do not qualify.
- **Partial engulf.** The fourth candle must engulf the third's *shadows*, not
  just its body.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [LadderBottom](/Indicators/Indicator-LadderBottom) — another multi-black bullish
  bottoming pattern.
- [ThreeStarsInSouth](/Indicators/Indicator-ThreeStarsInSouth) — three-bar bearish-looking
  bottoming setup.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
