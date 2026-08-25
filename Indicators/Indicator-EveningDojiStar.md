# EveningDojiStar

> Three-bar bearish top reversal. A long white bar extends the advance, a
> doji gaps up above it (the star of indecision), then a black bar gaps
> back down and closes deep into the first body, confirming the turn.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `-1.0` bearish, `0.0` otherwise (never `+1.0`) |
| Output range | `{-1.0, 0.0}` |
| Default parameters | `penetration = 0.3` (TA-Lib default); bindings use the default |
| Warmup period | `3` (first two bars always `0.0`) |
| Interpretation | Confirmed bearish top reversal |

## Formula

```
long body = |close − open| >= 0.5 · (high − low)
doji      = |close − open| <= 0.1 · (high − low)
bar1 white & long
bar2 doji, body gaps UP above bar1 body      (min(o2,c2) > close1)
bar3 black, body gaps DOWN below the doji     (max(o3,c3) < min(o2,c2))
bar3 closes deep into bar1 body               (close3 < close1 − penetration · body1)
```

Bearish-only (never `+1.0`); the bullish mirror is
[MorningDojiStar](/Indicators/Indicator-MorningDojiStar). The doji variant of the classic
evening star — the indecision candle is specifically a doji. See
`crates/wickra-core/src/indicators/evening_doji_star.rs`.

## Parameters

| Name | Type | Default | Valid range | Source |
|------|------|---------|-------------|--------|
| `penetration` | `f64` | `0.3` | `[0.0, 1.0)` | `EveningDojiStar::with_penetration` (`evening_doji_star.rs`) |

`with_penetration` outside `[0, 1)` errors (`rejects_invalid_penetration`,
`accepts_valid_penetration`). Python/Node construct with the default.

## Signed ±1 encoding

Single-direction shape: `−1.0` bearish, `0.0` no pattern — one feature-matrix
dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, EveningDojiStar, Candle};
// EveningDojiStar: Input = Candle, Output = f64
const _: fn(&mut EveningDojiStar, Candle) -> Option<f64> = <EveningDojiStar as Indicator>::update;
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

- **Middle must be a doji.** A real-bodied star yields `0.0`
  (`middle_not_doji_yields_zero`); for the non-doji star use
  [MorningEveningStar](/Indicators/Indicator-MorningEveningStar).
- **Close must penetrate the first body.** A shallow third close yields `0.0`
  (`shallow_close_yields_zero`).
- **Reset.** `reset()` clears the two-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, EveningDojiStar, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = EveningDojiStar::new();
    println!("{:?}", t.update(Candle::new(10.0, 15.1, 9.9, 15.0, 1.0, 0)?));  // long white
    println!("{:?}", t.update(Candle::new(17.0, 17.1, 16.9, 17.0, 1.0, 1)?)); // doji, gaps up
    println!("{:?}", t.update(Candle::new(16.0, 16.1, 11.9, 12.0, 1.0, 2)?)); // black, deep close
    Ok(())
}
```

Output:

```
Some(0.0)
Some(0.0)
Some(-1.0)
```

The doji gaps above the white close (`15`), and the black bar closes at `12.0` —
deep into the white body — an evening doji star. This matches
`evening_doji_star_is_minus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([10.0, 17.0, 16.0])
h = np.array([15.1, 17.1, 16.1])
l = np.array([9.9,  16.9, 11.9])
c = np.array([15.0, 17.0, 12.0])

print(ta.EveningDojiStar().batch(o, h, l, c))  # [ 0.  0. -1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.EveningDojiStar();
t.update(10, 15.1, 9.9, 15);
t.update(17, 17.1, 16.9, 17);
console.log(t.update(16, 16.1, 11.9, 12)); // -1
```

### Streaming

```rust
use wickra::{Candle, Indicator, EveningDojiStar};

let mut t = EveningDojiStar::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if t.update(bar) == Some(-1.0) { /* confirmed bearish top */ }
}
```

## Interpretation

1. **Confirmed top.** Unlike a bare doji star, the deep-closing third bar
   confirms the reversal — a strong bearish signal at the top of an advance.
2. **Penetration depth.** A deeper third close (raise `penetration`) demands a
   more decisive reversal and filters weaker setups.
3. **Best at resistance.** Strongest after an extended advance or into
   resistance.

## Common pitfalls

- **Shallow third close.** A third bar that barely dips into the first body does
  not qualify at the default 30 % penetration.
- **24/7 markets.** The gaps are body gaps (not full gaps), so this fires more
  readily than [AbandonedBaby](/Indicators/Indicator-AbandonedBaby) on gapless feeds.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [MorningDojiStar](/Indicators/Indicator-MorningDojiStar) — the bullish mirror.
- [MorningEveningStar](/Indicators/Indicator-MorningEveningStar) — the non-doji star pair.
- [DojiStar](/Indicators/Indicator-DojiStar) — the two-bar precursor.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
