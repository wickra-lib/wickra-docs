# KickingByLength

> The [Kicking](/Indicators/Indicator-Kicking) pattern with the signal taken from the
> *longer* of the two marubozu rather than from the gap direction. When the
> two shadowless candles differ in size, the bigger one is treated as the
> dominant force.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` bullish, `-1.0` bearish, `0.0` otherwise |
| Output range | `{-1.0, 0.0, +1.0}` |
| Default parameters | none — `KickingByLength::new()` |
| Warmup period | `2` (first bar always `0.0`) |
| Interpretation | Kicking reversal, signed by the dominant (longer) marubozu |

## Formula

```
marubozu = |close − open| >= 0.95 · (high − low)
setup: two opposite-coloured marubozu separated by a gap
  black then white gapping UP, or white then black gapping DOWN
signal = colour of the LONGER marubozu  (white -> +1.0, black -> -1.0)
```

This can disagree with [Kicking](/Indicators/Indicator-Kicking): a black marubozu kicked up
by a *shorter* white marubozu reports `−1.0` here (the longer black dominates),
whereas plain Kicking reports `+1.0` from the gap. See
`crates/wickra-core/src/indicators/kicking_by_length.rs`.

## Parameters

None. Constructed with `KickingByLength::new()`.

## Signed ±1 encoding

Emits the uniform candlestick sign convention — `+1.0` bullish, `−1.0` bearish,
`0.0` no pattern — a single feature-matrix dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, KickingByLength, Candle};
// KickingByLength: Input = Candle, Output = f64
const _: fn(&mut KickingByLength, Candle) -> Option<f64> = <KickingByLength as Indicator>::update;
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

- **Both bars must be marubozu.** A candle with shadows yields `0.0`
  (`not_marubozu_yields_zero`).
- **Gap required.** Without a clean gap the result is `0.0` (`no_gap_yields_zero`).
- **Longer-candle sign.** Pinned by `longer_white_is_plus_one` and
  `longer_black_is_minus_one`.
- **Reset.** `reset()` clears the one-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, KickingByLength};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = KickingByLength::new();
    println!("{:?}", t.update(Candle::new(12.0, 12.0, 10.0, 10.0, 1.0, 0)?)); // black marubozu, len 2
    println!("{:?}", t.update(Candle::new(14.0, 20.0, 14.0, 20.0, 1.0, 1)?)); // white marubozu, len 6
    Ok(())
}
```

Output:

```
Some(0.0)
Some(1.0)
```

The white marubozu (length `6`) is longer than the black (length `2`), so the
signal is bullish `+1.0`. This matches `longer_white_is_plus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([12.0, 14.0])
h = np.array([12.0, 20.0])
l = np.array([10.0, 14.0])
c = np.array([10.0, 20.0])

print(ta.KickingByLength().batch(o, h, l, c))  # [0. 1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.KickingByLength();
t.update(12, 12, 10, 10);
console.log(t.update(14, 20, 14, 20)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, KickingByLength};

let mut t = KickingByLength::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    match t.update(bar) {
        Some(1.0)  => { /* longer marubozu is white — bullish */ }
        Some(-1.0) => { /* longer marubozu is black — bearish */ }
        _ => {}
    }
}
```

## Interpretation

1. **Dominant force wins.** When one kicking marubozu dwarfs the other, the
   bigger candle is the stronger statement of intent — this variant signs the
   pattern by length rather than by the gap.
2. **Disagreement is information.** When Kicking and KickingByLength disagree, the
   pattern is ambiguous (a small candle gapping past a large opposite one) — treat
   it with caution.
3. **Same rarity caveats.** Like plain kicking, clean gaps are rare on 24/7
   feeds.

## Common pitfalls

- **Assuming it equals Kicking.** They agree only when the gap-direction candle
  is also the longer one.
- **Shadows.** The 95 % marubozu threshold still applies to both candles.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [Kicking](/Indicators/Indicator-Kicking) — signal from the gap direction.
- [Marubozu](/Indicators/Indicator-Marubozu) — the shadowless candle this is built from.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
