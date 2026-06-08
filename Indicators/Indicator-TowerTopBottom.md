# TowerTopBottom

> A tall directional bar, a small pause bar, then a tall opposite bar — two
> "towers" flanking a low wall, a compact reversal.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` (open / high / low / close) |
| Output type | `f64` (signed signal) |
| Output range | `{−1, 0, +1}` |
| Default parameters | None (body thresholds fixed) |
| Warmup period | `3` |
| Interpretation | `+1` tower bottom; `−1` tower top. |

## Formula

```
tall  bar: |close − open| >= 0.5 · range
small bar: |close − open| <= 0.3 · range
Tower Bottom (+1): tall bearish , small , tall bullish
Tower Top    (−1): tall bullish , small , tall bearish
otherwise 0
```

A strong move, a pause, then a strong move the other way marks a reversal. This is
the three-bar form of the classic multi-bar Tower pattern. Source:
`crates/wickra-core/src/indicators/tower_top_bottom.rs`.

## Parameters

| Name | Type | Default | Valid range | Source | Description |
|------|------|---------|-------------|--------|-------------|
| — | — | — | — | None. | Tower is parameter-free; the tall (`0.5`) / small (`0.3`) body-fraction thresholds are fixed. |

## Signed ±1 encoding

`+1.0` tower bottom (bullish), `−1.0` tower top (bearish), `0.0` no pattern (warmup
emits `None`).

## Inputs / Outputs

From `crates/wickra-core/src/indicators/tower_top_bottom.rs`:

```rust
use wickra::{Candle, Indicator, TowerTopBottom};
// TowerTopBottom: Input = Candle, Output = f64
const _: fn(&mut TowerTopBottom, Candle) -> Option<f64> = <TowerTopBottom as Indicator>::update;
```

A `Candle` in, an `Option<f64>` out. Python `update(candle)` / `batch(open, high,
low, close)`; Node `update(open, high, low, close)` / `batch(...)`.

## Warmup

`warmup_period() == 3`. Two candles seed the buffer
(`first_two_bars_seed_without_signal` pins this).

## Edge cases

- **Tower top.** Tall bullish, pause, tall bearish → `−1` (`tower_top` pins this).
- **Tower bottom.** The mirror → `+1` (`tower_bottom` pins this).
- **Same direction → 0.** Both outer bars same way → no tower (`same_direction_is_zero`
  pins this).
- **No pause → 0.** A tall middle bar breaks it (`no_pause_is_zero` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `t.reset()` clears the two prior candles and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, TowerTopBottom};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = TowerTopBottom::new();
    t.update(Candle::new(100.0, 110.1, 99.9, 110.0, 0.0, 0)?); // tall bullish
    t.update(Candle::new(110.0, 112.0, 108.0, 110.1, 0.0, 0)?); // small pause
    let sig = t.update(Candle::new(110.0, 110.1, 99.9, 100.0, 0.0, 0)?); // tall bearish
    println!("{:?}", sig); // Some(-1.0)
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

t = ta.TowerTopBottom()
o = np.array([100, 110, 110]); h = np.array([110.1, 112, 110.1]); l = np.array([99.9, 108, 99.9]); c = np.array([110, 110.1, 100])
print(t.batch(o, h, l, c))  # [nan, nan, -1.0]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.TowerTopBottom();
t.update(100, 110.1, 99.9, 110); t.update(110, 112, 108, 110.1);
console.log(t.update(110, 110.1, 99.9, 100)); // -1
```

### Streaming

```rust
use wickra::{Candle, Indicator, TowerTopBottom};

let mut t = TowerTopBottom::new();
for candle in feed {
    match t.update(candle) {
        Some(1.0)  => println!("tower bottom"),
        Some(-1.0) => println!("tower top"),
        _ => {}
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Sharp reversal.** Towers mark abrupt turns — the pause is brief and the
   opposite thrust decisive.
2. **Context.** Strongest at the end of a clear trend into a level.
3. **Confirm.** A follow-through bar after the second tower adds conviction.

## Common pitfalls

- **Compact form.** Classic Towers can span more bars; this three-bar version is a
  practical proxy.
- **Threshold reliance.** The tall/small classification is fixed; very-low-range
  bars (no range) never qualify.
- **Trend required.** Mid-range towers are noise.

## References

Nison, S. (1994), *Beyond Candlesticks*.

## See also

- [Indicator-MorningEveningStar](/Indicators/Indicator-MorningEveningStar) — star reversal.
- [Indicator-Engulfing](/Indicators/Indicator-Engulfing) — two-bar reversal.
- [Indicator-DumplingTop](/Indicators/Indicator-DumplingTop) — rounded-top reversal.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
