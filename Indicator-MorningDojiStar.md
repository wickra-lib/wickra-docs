# MorningDojiStar

> Three-bar bullish bottom reversal. A long black bar extends the decline,
> a doji gaps down below it (the star of indecision), then a white bar
> gaps back up and closes deep into the first body, confirming the turn.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` bullish, `0.0` otherwise (never `-1.0`) |
| Output range | `{0.0, +1.0}` |
| Default parameters | `penetration = 0.3` (TA-Lib default); bindings use the default |
| Warmup period | `3` (first two bars always `0.0`) |
| Interpretation | Confirmed bullish bottom reversal |

## Formula

```
long body = |close − open| >= 0.5 · (high − low)
doji      = |close − open| <= 0.1 · (high − low)
bar1 black & long
bar2 doji, body gaps DOWN below bar1 body     (max(o2,c2) < close1)
bar3 white, body gaps UP above the doji        (min(o3,c3) > max(o2,c2))
bar3 closes deep into bar1 body                (close3 > close1 + penetration · body1)
```

Bullish-only (never `−1.0`); the bearish mirror is
[EveningDojiStar](Indicator-EveningDojiStar). The doji variant of the classic
morning star. See `crates/wickra-core/src/indicators/morning_doji_star.rs`.

## Parameters

| Name | Type | Default | Valid range | Source |
|------|------|---------|-------------|--------|
| `penetration` | `f64` | `0.3` | `[0.0, 1.0)` | `MorningDojiStar::with_penetration` (`morning_doji_star.rs`) |

`with_penetration` outside `[0, 1)` errors (`rejects_invalid_penetration`,
`accepts_valid_penetration`). Python/Node construct with the default.

## Signed ±1 encoding

Single-direction shape: `+1.0` bullish, `0.0` no pattern — one feature-matrix
dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, MorningDojiStar, Candle};
// MorningDojiStar: Input = Candle, Output = f64
const _: fn(&mut MorningDojiStar, Candle) -> Option<f64> = <MorningDojiStar as Indicator>::update;
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

- **Middle must be a doji.** A real-bodied star yields `0.0`
  (`middle_not_doji_yields_zero`); for the non-doji star use
  [MorningEveningStar](Indicator-MorningEveningStar).
- **Close must penetrate the first body.** A shallow third close yields `0.0`
  (`shallow_close_yields_zero`).
- **Reset.** `reset()` clears the two-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, MorningDojiStar};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = MorningDojiStar::new();
    println!("{:?}", t.update(Candle::new(15.0, 15.1, 9.9, 10.0, 1.0, 0)?)); // long black
    println!("{:?}", t.update(Candle::new(8.0, 8.1, 7.9, 8.0, 1.0, 1)?));    // doji, gaps down
    println!("{:?}", t.update(Candle::new(9.0, 13.1, 8.9, 13.0, 1.0, 2)?));  // white, deep close
    Ok(())
}
```

Output:

```
Some(0.0)
Some(0.0)
Some(1.0)
```

The doji gaps below the black close (`10`), and the white bar closes at `13.0` —
deep into the black body — a morning doji star. This matches
`morning_doji_star_is_plus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([15.0, 8.0, 9.0])
h = np.array([15.1, 8.1, 13.1])
l = np.array([9.9,  7.9, 8.9])
c = np.array([10.0, 8.0, 13.0])

print(ta.MorningDojiStar().batch(o, h, l, c))  # [0. 0. 1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.MorningDojiStar();
t.update(15, 15.1, 9.9, 10);
t.update(8, 8.1, 7.9, 8);
console.log(t.update(9, 13.1, 8.9, 13)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, MorningDojiStar};

let mut t = MorningDojiStar::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if t.update(bar) == Some(1.0) { /* confirmed bullish bottom */ }
}
```

## Interpretation

1. **Confirmed bottom.** The deep-closing white third bar confirms the reversal
   — a strong bullish signal at the foot of a decline.
2. **Penetration depth.** A deeper third close (raise `penetration`) demands a
   more decisive reversal and filters weaker setups.
3. **Best at support.** Strongest after an extended decline or into support.

## Common pitfalls

- **Shallow third close.** A third bar that barely lifts into the first body does
  not qualify at the default 30 % penetration.
- **24/7 markets.** Uses body gaps (not full gaps), so it fires more readily than
  [AbandonedBaby](Indicator-AbandonedBaby) on gapless feeds.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [EveningDojiStar](Indicator-EveningDojiStar) — the bearish mirror.
- [MorningEveningStar](Indicator-MorningEveningStar) — the non-doji star pair.
- [DojiStar](Indicator-DojiStar) — the two-bar precursor.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
