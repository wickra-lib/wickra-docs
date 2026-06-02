# DojiStar

> Two-bar reversal warning. A long trending body is followed by a doji
> whose tiny body gaps away in the direction of the trend — the
> indecision hinting the move is about to turn.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` bullish, `-1.0` bearish, `0.0` otherwise |
| Output range | `{-1.0, 0.0, +1.0}` |
| Default parameters | none — `DojiStar::new()` |
| Warmup period | `2` (first bar always `0.0`) |
| Interpretation | Reversal warning; the confirming bar is the morning/evening star |

## Formula

```
long body = |close − open| >= 0.5 · (high − low)   (bar1)
doji      = |close − open| <= 0.1 · (high − low)   (bar2)
bullish (+1.0): bar1 black, doji body gaps DOWN below it  (max(o2,c2) < close1)
bearish (-1.0): bar1 white, doji body gaps UP above it    (min(o2,c2) > close1)
```

A doji star is the first two bars of a morning/evening star — a *warning*, not
a confirmed reversal, since the third (confirming) bar has not yet arrived. See
`crates/wickra-core/src/indicators/doji_star.rs`.

## Parameters

None. Constructed with `DojiStar::new()`.

## Signed ±1 encoding

Emits the uniform candlestick sign convention — `+1.0` bullish, `−1.0` bearish,
`0.0` no pattern — a single feature-matrix dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, DojiStar, Candle};
// DojiStar: Input = Candle, Output = f64
const _: fn(&mut DojiStar, Candle) -> Option<f64> = <DojiStar as Indicator>::update;
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

- **Second bar must be a doji.** A real-bodied second bar yields `0.0`
  (`second_bar_not_doji_yields_zero`).
- **Gap required.** Without the body gap in the trend direction the result is
  `0.0` (`no_gap_yields_zero`).
- **First body must be long.** A short first body yields `0.0`
  (`short_first_body_yields_zero`).
- **Reset.** `reset()` clears the one-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, DojiStar};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = DojiStar::new();
    println!("{:?}", t.update(Candle::new(20.0, 20.2, 14.8, 15.0, 1.0, 0)?)); // long black
    println!("{:?}", t.update(Candle::new(13.0, 13.1, 12.9, 13.0, 1.0, 1)?)); // doji, gaps down
    Ok(())
}
```

Output:

```
Some(0.0)
Some(1.0)
```

The doji's body (`≈13`) gaps below the black bar's close (`15`) — a bullish doji
star. This matches `bullish_doji_star_is_plus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([20.0, 13.0])
h = np.array([20.2, 13.1])
l = np.array([14.8, 12.9])
c = np.array([15.0, 13.0])

print(ta.DojiStar().batch(o, h, l, c))  # [0. 1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.DojiStar();
t.update(20, 20.2, 14.8, 15);
console.log(t.update(13, 13.1, 12.9, 13)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, DojiStar};

let mut t = DojiStar::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    match t.update(bar) {
        Some(1.0)  => { /* bullish doji star — watch for confirmation */ }
        Some(-1.0) => { /* bearish doji star */ }
        _ => {}
    }
}
```

## Interpretation

1. **Early warning.** The gapped doji after a strong body signals momentum
   stalling — but it is only the first two bars of a star.
2. **Wait for confirmation.** [MorningDojiStar](Indicator-MorningDojiStar) /
   [EveningDojiStar](Indicator-EveningDojiStar) add the third bar that confirms
   the turn; trade those, treat the doji star as a heads-up.

## Common pitfalls

- **Treating it as a confirmed reversal.** It is a two-bar precursor, not the
  full star.
- **No trend context.** Only meaningful after a directional move.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [MorningDojiStar](Indicator-MorningDojiStar) /
  [EveningDojiStar](Indicator-EveningDojiStar) — confirmed three-bar stars.
- [AbandonedBaby](Indicator-AbandonedBaby) — the full-gap island version.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
