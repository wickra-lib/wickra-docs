# AbandonedBaby

> Strong three-bar reversal where a doji is "abandoned" by price gaps on
> both sides, isolating it from the candle before and after. One of the
> rarer and more reliable classical reversals.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` bullish, `-1.0` bearish, `0.0` otherwise |
| Output range | `{-1.0, 0.0, +1.0}` |
| Default parameters | `tolerance = 0.001` (doji flatness); bindings use the default |
| Warmup period | `3` (first two bars always `0.0`) |
| Interpretation | High-conviction reversal; gap-isolated doji marks the turn |

## Formula

```
tol = tolerance · max(|bar2.open|, |bar2.close|)
bar2 doji:  |bar2.close − bar2.open| <= tol

bullish (+1.0): bar1 red, bar2 gaps fully below bar1 (bar2.high < bar1.low),
                bar3 green and gaps fully above bar2 (bar3.low > bar2.high)
bearish (-1.0): bar1 green, bar2 gaps fully above bar1 (bar2.low > bar1.high),
                bar3 red and gaps fully below bar2 (bar3.high < bar2.low)
```

The gaps are *full* (shadow-to-shadow), not just body gaps — that is what makes
the doji truly abandoned. See
`crates/wickra-core/src/indicators/abandoned_baby.rs`.

## Parameters

| Name | Type | Default | Valid range | Source |
|------|------|---------|-------------|--------|
| `tolerance` | `f64` | `0.001` | `[0.0, 1.0)` | `AbandonedBaby::with_tolerance` (`abandoned_baby.rs`) |

`with_tolerance` outside `[0, 1)` errors (`rejects_invalid_tolerance`,
`accepts_valid_tolerance`). Python/Node construct with the default.

## Signed ±1 encoding

Emits the uniform candlestick sign convention — `+1.0` bullish, `−1.0` bearish,
`0.0` no pattern — a single feature-matrix dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, AbandonedBaby, Candle};
// AbandonedBaby: Input = Candle, Output = f64
const _: fn(&mut AbandonedBaby, Candle) -> Option<f64> = <AbandonedBaby as Indicator>::update;
```

- **Always emits a value.** Never `None`; warmup and no-match bars return `0.0`.
- **Node.** `update(open, high, low, close)` → `number`; `batch(open, high, low,
  close)` → `Array<number>`.
- **Python.** `update(candle)` → `float`; `batch(open, high, low, close)` → 1-D
  `numpy.ndarray` (`0.0` on warmup / no-match).

## Warmup

`warmup_period() == 3`. The first two bars return `0.0`
(`first_two_bars_return_zero`, `accessors_and_metadata`).

## Edge cases

- **Middle must be a doji.** A non-doji middle candle yields `0.0`
  (`middle_not_doji_yields_zero`).
- **Both gaps required.** Missing either full gap yields `0.0`
  (`no_gap_yields_zero`).
- **Reset.** `reset()` clears the two-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, AbandonedBaby, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = AbandonedBaby::new();
    println!("{:?}", t.update(Candle::new(20.0, 20.1, 14.9, 15.0, 1.0, 0)?)); // red
    println!("{:?}", t.update(Candle::new(13.0, 13.1, 12.9, 13.0, 1.0, 1)?)); // doji, gaps below
    println!("{:?}", t.update(Candle::new(16.0, 18.1, 15.9, 18.0, 1.0, 2)?)); // green, gaps above
    Ok(())
}
```

Output:

```
Some(0.0)
Some(0.0)
Some(1.0)
```

The doji's high `13.1` is below bar1's low `14.9`, and bar3's low `15.9` is
above the doji's high `13.1` — fully abandoned. This matches
`bullish_abandoned_baby_is_plus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([20.0, 13.0, 16.0])
h = np.array([20.1, 13.1, 18.1])
l = np.array([14.9, 12.9, 15.9])
c = np.array([15.0, 13.0, 18.0])

print(ta.AbandonedBaby().batch(o, h, l, c))  # [0. 0. 1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.AbandonedBaby();
t.update(20, 20.1, 14.9, 15);
t.update(13, 13.1, 12.9, 13);
console.log(t.update(16, 18.1, 15.9, 18)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, AbandonedBaby};

let mut t = AbandonedBaby::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    match t.update(bar) {
        Some(1.0)  => { /* bullish island reversal */ }
        Some(-1.0) => { /* bearish island reversal */ }
        _ => {}
    }
}
```

## Interpretation

1. **Island reversal.** The doji isolated by gaps is a classic exhaustion-island
   turn — high conviction when it appears at a trend extreme.
2. **Rare.** Full two-sided gaps are uncommon in 24/7 markets (crypto), more
   frequent on gapping session markets (equities).
3. **Confirm with location.** Strongest at a tested high (bearish) or low
   (bullish).

## Common pitfalls

- **Body-only gaps.** This pattern needs *full* high/low gaps, not just body
  gaps — stricter than morning/evening star.
- **24/7 markets.** Perpetual crypto rarely gaps; expect few prints there.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [MorningDojiStar](/Indicators/Indicator-MorningDojiStar) /
  [EveningDojiStar](/Indicators/Indicator-EveningDojiStar) — same shape with body gaps only.
- [DojiStar](/Indicators/Indicator-DojiStar) — the two-bar doji-gap precursor.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
