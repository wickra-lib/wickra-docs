# UpsideGapTwoCrows

> Three-bar bearish reversal after an advance. Two black candles gap up
> above a long white candle; the second black candle engulfs the first
> crow yet still closes above the white body, leaving the upside gap
> open — a more strictly-defined cousin of Two Crows.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` |
| Output type | `f64` — `-1.0` bearish, `0.0` otherwise (never `+1.0`) |
| Output range | `{-1.0, 0.0}` |
| Default parameters | none — `UpsideGapTwoCrows::new()` |
| Warmup period | `3` (first two bars always `0.0`) |
| Interpretation | Bearish reversal warning at the top of an advance |

## Formula

```
bar1 green (long white)
bar2 red & its body gaps up above bar1's body:  bar2.close > bar1.close
bar3 red & opens above bar2's open:              bar3.open  > bar2.open
         & closes below bar2's close:            bar3.close < bar2.close
         & closes above bar1's close:            bar3.close > bar1.close
```

Bearish-only (never `+1.0`). Unlike [TwoCrows](/Indicators/Indicator-TwoCrows), the second
crow engulfs the first but the gap above the white body is *not* filled — the
close stays above the white close. Thresholds are geometric, not TA-Lib rolling
averages. See `crates/wickra-core/src/indicators/upside_gap_two_crows.rs`.

## Parameters

None. Constructed with `UpsideGapTwoCrows::new()`.

## Signed ±1 encoding

Single-direction shape: `−1.0` bearish, `0.0` no pattern — one feature-matrix
dimension.

## Inputs / Outputs

```rust
use wickra::{Indicator, UpsideGapTwoCrows, Candle};
// UpsideGapTwoCrows: Input = Candle, Output = f64
const _: fn(&mut UpsideGapTwoCrows, Candle) -> Option<f64> = <UpsideGapTwoCrows as Indicator>::update;
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

- **Gap must stay open.** A third candle that closes back into the white body
  (filling the gap) yields `0.0` (`closing_the_first_gap_yields_zero`).
- **No upside gap.** Without the initial body gap up the result is `0.0`
  (`no_gap_up_yields_zero`).
- **Reset.** `reset()` clears the two-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, UpsideGapTwoCrows};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut t = UpsideGapTwoCrows::new();
    println!("{:?}", t.update(Candle::new(10.0, 12.2, 9.9, 12.0, 1.0, 0)?));  // long white
    println!("{:?}", t.update(Candle::new(14.0, 14.2, 12.9, 13.0, 1.0, 1)?)); // black, gaps up
    println!("{:?}", t.update(Candle::new(15.0, 15.2, 12.4, 12.5, 1.0, 2)?)); // black, engulfs, gap holds
    Ok(())
}
```

Output:

```
Some(0.0)
Some(0.0)
Some(-1.0)
```

The second crow opens at `15.0` above the first crow's open `14.0` and closes at
`12.5` — below the first crow's close `13.0` but still above the white close
`12.0`, so the gap holds. This matches `upside_gap_two_crows_is_minus_one`.

### Python

```python
import numpy as np
import wickra as ta

o = np.array([10.0, 14.0, 15.0])
h = np.array([12.2, 14.2, 15.2])
l = np.array([9.9,  12.9, 12.4])
c = np.array([12.0, 13.0, 12.5])

print(ta.UpsideGapTwoCrows().batch(o, h, l, c))  # [ 0.  0. -1.]
```

### Node

```javascript
const ta = require('wickra');
const t = new ta.UpsideGapTwoCrows();
t.update(10, 12.2, 9.9, 12);
t.update(14, 14.2, 12.9, 13);
console.log(t.update(15, 15.2, 12.4, 12.5)); // -1
```

### Streaming

```rust
use wickra::{Candle, Indicator, UpsideGapTwoCrows};

let mut t = UpsideGapTwoCrows::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if t.update(bar) == Some(-1.0) { /* bearish warning — gap above intact but crows gathering */ }
}
```

## Interpretation

1. **Reversal warning at the highs.** Two black candles above a strong white one,
   with the second engulfing the first yet the gap still open, signals
   distribution at the top of an advance.
2. **Confirmation needed.** Because the gap is unfilled the signal is a warning,
   not a confirmed turn; wait for a close back into the white body.
3. **Compare with Two Crows.** [TwoCrows](/Indicators/Indicator-TwoCrows) fills the gap;
   this one keeps it open and is the rarer, stricter variant.

## Common pitfalls

- **Treating the held gap as bullish.** The open gap is bearish here — it sits
  above a stalling advance.
- **No uptrend context.** Only meaningful after an advance.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [TwoCrows](/Indicators/Indicator-TwoCrows) — the gap-filling sibling.
- [PiercingDarkCloud](/Indicators/Indicator-PiercingDarkCloud) — two-bar top reversal.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
