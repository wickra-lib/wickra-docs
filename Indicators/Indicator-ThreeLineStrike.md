# ThreeLineStrike

> Four-bar pattern: three candles marching in one direction (a
> three-soldiers / three-crows run) followed by a fourth, opposite-colour
> candle that opens beyond the third and closes back past the first
> candle's open — "striking" through the whole run in a single bar.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `+1.0` bullish, `-1.0` bearish, `0.0` otherwise |
| Output range | `{-1.0, 0.0, +1.0}` |
| Default parameters | none — `ThreeLineStrike::new()` |
| Warmup period | `4` (first three bars always `0.0`) |
| Interpretation | Classically a *continuation*; the strike is a one-bar pullback |

## Formula

```
Bullish (+1.0):
  bar1..bar3 green, each opening inside the prior body and closing higher
  bar4 red & opens above bar3's close & closes below bar1's open

Bearish (-1.0): the mirror — three falling red candles struck by a green
  bar4 that opens below bar3's close and closes above bar1's open
```

The sign follows the three-candle run, not the strike candle: a bullish
three-line strike (`+1.0`) is read as bullish continuation despite the red
fourth bar. Thresholds are geometric, not TA-Lib rolling averages. See
`crates/wickra-core/src/indicators/three_line_strike.rs`.

## Parameters

None. Constructed with `ThreeLineStrike::new()`.

## Signed ±1 encoding

Emits the uniform candlestick sign convention — `+1.0` bullish, `−1.0` bearish,
`0.0` no pattern — a single feature-matrix dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, ThreeLineStrike, Candle};
// ThreeLineStrike: Input = Candle, Output = f64
const _: fn(&mut ThreeLineStrike, Candle) -> Option<f64> = <ThreeLineStrike as Indicator>::update;
```

- **Always emits a value.** Never `None`; warmup and no-match bars return `0.0`.
- **Node.** `update(open, high, low, close)` → `number`; `batch(open, high, low,
  close)` → `Array<number>`.
- **Python.** `update(candle)` → `float`; `batch(open, high, low, close)` → 1-D
  `array.array('d')` (`0.0` on warmup / no-match).

## Warmup

`warmup_period() == 4`. The first three bars return `0.0`
(`first_three_bars_return_zero`, `accessors_and_metadata`).

## Edge cases

- **Strike must clear the first open.** A fourth candle that fails to close past
  the first candle's open yields `0.0`
  (`strike_not_clearing_first_open_yields_zero`).
- **Both directions.** Bullish and bearish variants are pinned by
  `bullish_three_line_strike_is_plus_one` and
  `bearish_three_line_strike_is_minus_one`.
- **Reset.** `reset()` clears the three-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, ThreeLineStrike};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = ThreeLineStrike::new();
    println!("{:?}", t.update(Candle::new(10.0, 11.1, 9.9, 11.0, 1.0, 0)?));  // green
    println!("{:?}", t.update(Candle::new(10.5, 12.1, 10.4, 12.0, 1.0, 1)?)); // green, higher
    println!("{:?}", t.update(Candle::new(11.5, 13.1, 11.4, 13.0, 1.0, 2)?)); // green, higher
    println!("{:?}", t.update(Candle::new(13.5, 13.6, 9.4, 9.5, 1.0, 3)?));   // red, strikes through
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

The fourth candle opens at `13.5` (above bar3's close `13.0`) and closes at
`9.5` (below bar1's open `10.0`), striking through the three-soldier run. This
matches `bullish_three_line_strike_is_plus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([10.0, 10.5, 11.5, 13.5])
h = np.array([11.1, 12.1, 13.1, 13.6])
l = np.array([9.9,  10.4, 11.4, 9.4])
c = np.array([11.0, 12.0, 13.0, 9.5])

print(ta.ThreeLineStrike().batch(o, h, l, c))  # [0. 0. 0. 1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.ThreeLineStrike();
t.update(10, 11.1, 9.9, 11);
t.update(10.5, 12.1, 10.4, 12);
t.update(11.5, 13.1, 11.4, 13);
console.log(t.update(13.5, 13.6, 9.4, 9.5)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, ThreeLineStrike};

let mut t = ThreeLineStrike::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    match t.update(bar) {
        Some(1.0)  => { /* bullish continuation — buy-the-dip context */ }
        Some(-1.0) => { /* bearish continuation */ }
        _ => {}
    }
}
```

## Interpretation

1. **Continuation, not reversal (classically).** Despite the dramatic strike
   candle, the historical read is that the trend resumes — the strike is a
   one-bar shake-out. Many modern studies dispute its edge, so treat it as
   context, not a signal on its own.
2. **Sign = the run.** A `+1.0` means the *three-soldier* run was bullish; the
   red strike bar is the pullback inside it.
3. **Confirm.** Wait for the trend to actually resume before acting.

## Common pitfalls

- **Reading the strike candle's colour as the signal.** The output sign follows
  the three-bar run, not the fourth bar.
- **Over-trusting it.** Empirical reliability is mixed; use only with
  corroborating context.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [ThreeSoldiersOrCrows](/Indicators/Indicator-ThreeSoldiersOrCrows) — the three-bar run the
  strike acts on.
- [RisingThreeMethods](/Indicators/Indicator-RisingThreeMethods) — a cleaner continuation
  pattern.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
