# Kicking

> Two-bar reversal of two opposite-coloured marubozu separated by a gap. A
> shadowless candle is "kicked" the other way by a shadowless candle of the
> opposite colour that gaps clear of it — a violent change of control. It
> is trend-agnostic: the gap direction alone defines the signal.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` bullish, `-1.0` bearish, `0.0` otherwise |
| Output range | `{-1.0, 0.0, +1.0}` |
| Default parameters | none — `Kicking::new()` |
| Warmup period | `2` (first bar always `0.0`) |
| Interpretation | Violent two-bar reversal; one of the strongest signals |

## Formula

```
marubozu = |close − open| >= 0.95 · (high − low)   (no meaningful shadows)
bullish (+1.0): black marubozu, then a white marubozu gapping UP   (low2 > high1)
bearish (-1.0): white marubozu, then a black marubozu gapping DOWN (high2 < low1)
```

Trend-agnostic: the gap direction alone defines the signal. The signal follows
the *gap* (second-candle direction); for the length-weighted variant see
[KickingByLength](/Indicators/Indicator-KickingByLength). See
`crates/wickra-core/src/indicators/kicking.rs`.

## Parameters

None. Constructed with `Kicking::new()`.

## Signed ±1 encoding

Emits the uniform candlestick sign convention — `+1.0` bullish, `−1.0` bearish,
`0.0` no pattern — a single feature-matrix dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, Kicking, Candle};
// Kicking: Input = Candle, Output = f64
const _: fn(&mut Kicking, Candle) -> Option<f64> = <Kicking as Indicator>::update;
```

- **Always emits a value.** Never `None`; warmup and no-match bars return `0.0`.
- **Node.** `update(open, high, low, close)` → `number`; `batch(open, high, low,
  close)` → `Array<number>`.
- **Python.** `update(candle)` → `float`; `batch(open, high, low, close)` → 1-D
  `array.array('d')` (`0.0` on warmup / no-match).

## Warmup

`warmup_period() == 2`. The first bar returns `0.0` (`first_bar_returns_zero`,
`accessors_and_metadata`).

## Edge cases

- **Both bars must be marubozu.** A candle with shadows yields `0.0`
  (`not_marubozu_yields_zero`).
- **Gap required.** Without a clean gap between the two bars the result is `0.0`
  (`no_gap_yields_zero`).
- **Reset.** `reset()` clears the one-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, Kicking};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = Kicking::new();
    println!("{:?}", t.update(Candle::new(12.0, 12.0, 10.0, 10.0, 1.0, 0)?)); // black marubozu
    println!("{:?}", t.update(Candle::new(14.0, 16.0, 14.0, 16.0, 1.0, 1)?)); // white marubozu, gaps up
    Ok(())
}
```

Output:

```
Some(0.0)
Some(1.0)
```

A black marubozu kicked up by a white marubozu whose low `14 > 12` (the prior
high) — a bullish kicking. This matches `bullish_kicking_is_plus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([12.0, 14.0])
h = np.array([12.0, 16.0])
l = np.array([10.0, 14.0])
c = np.array([10.0, 16.0])

print(ta.Kicking().batch(o, h, l, c))  # [0. 1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.Kicking();
t.update(12, 12, 10, 10);
console.log(t.update(14, 16, 14, 16)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, Kicking};

let mut t = Kicking::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    match t.update(bar) {
        Some(1.0)  => { /* violent bullish reversal */ }
        Some(-1.0) => { /* violent bearish reversal */ }
        _ => {}
    }
}
```

## Interpretation

1. **Regime change.** Two opposite shadowless marubozu separated by a gap signal
   an abrupt shift in control — one of the most forceful classical reversals.
2. **Trend-agnostic.** The signal needs no prior trend; the gap and marubozu pair
   carry it. Often news/event-driven.
3. **Rare on 24/7 feeds.** The clean gap is uncommon in perpetual crypto; more
   frequent on session markets.

## Common pitfalls

- **Shadows.** Even small shadows can disqualify the marubozu at the 95 %
  threshold.
- **Length disagreement.** When the two marubozu differ in size,
  [KickingByLength](/Indicators/Indicator-KickingByLength) can report the opposite sign.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [KickingByLength](/Indicators/Indicator-KickingByLength) — signal from the longer marubozu.
- [Marubozu](/Indicators/Indicator-Marubozu) — the shadowless candle this is built from.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
