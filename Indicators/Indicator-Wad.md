# Wad

> Larry Williams' Accumulation/Distribution — a cumulative, **volume-free** line
> that adds true-low accumulation on up-closes and true-high distribution on
> down-closes.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Volume |
| Input type | `Candle` (high / low / close) |
| Output type | `f64` |
| Output range | `(−∞, +∞)` (a cumulative line; only slope/divergence matters) |
| Default parameters | None (parameter-free) |
| Warmup period | `2` |
| Interpretation | Rising = accumulation; falling = distribution; watch divergence vs price. |

## Formula

```
if close > prev_close:  AD =  close − min(low,  prev_close)   (true low)
if close < prev_close:  AD =  close − max(high, prev_close)   (true high)
if close = prev_close:  AD =  0
WAD_t = WAD_{t−1} + AD
```

Despite living in the Volume family, Williams' A/D uses **no volume**. On an
up-close it credits how far price closed above the *true low* (the lower of
today's low and yesterday's close); on a down-close it debits how far price
closed below the *true high*; an unchanged close contributes nothing. The running
total is the line. This is deliberately different from Chaikin's volume-weighted
[`Adl`](/Indicators/Indicator-Adl). Source:
`crates/wickra-core/src/indicators/wad.rs`.

## Parameters

| Name | Type | Default | Valid range | Source | Description |
|------|------|---------|-------------|--------|-------------|
| — | — | — | — | None. | The Williams A/D line takes no parameters; `Wad::new()` is infallible. |

The `value` getter returns the current cumulative total if ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/wad.rs`:

```rust
use wickra::{Candle, Indicator, Wad};
// Wad: Input = Candle, Output = f64
const _: fn(&mut Wad, Candle) -> Option<f64> = <Wad as Indicator>::update;
```

A `Candle` in, an `Option<f64>` out. The Python binding takes a candle for
`update` and three numpy columns `(high, low, close)` for `batch`; Node takes
`update(high, low, close)` and `batch(high[], low[], close[])` (NaN warmup).

## Warmup

`warmup_period() == 2`. The first candle only seeds the reference close and emits
nothing; the first cumulative value lands on the second bar
(`first_bar_seeds_without_output` pins this).

## Edge cases

- **Up-close accumulates.** A higher close credits `close − true_low`
  (`up_close_accumulates` pins this).
- **Down-close distributes.** A lower close debits `close − true_high`
  (`down_close_distributes` pins this).
- **Unchanged close.** An equal close adds exactly `0`, regardless of the bar's
  range (`unchanged_close_adds_nothing` pins this).
- **Monotone in a trend.** A clean uptrend produces a non-decreasing line
  (`pure_uptrend_is_monotone` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `wad.reset()` clears the reference close, the running total and the
  last value (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, Wad};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut wad = Wad::new();
    let candles = [
        Candle::new(100.0, 101.0, 99.0, 100.0, 1_000.0, 0)?, // seed
        Candle::new(100.0, 102.0, 100.0, 101.0, 1_000.0, 0)?, // up-close: +1
    ];
    let out = wad.batch(&candles);
    println!("warmup_period = {}", wad.warmup_period());
    println!("last = {:?}", out.last().unwrap());
    Ok(())
}
```

Output:

```
warmup_period = 2
last = Some(1.0)
```

Close rose from `100` to `101`; the true low is `min(100, 100) = 100`, so
`AD = 101 − 100 = 1`.

### Python

```python
import numpy as np
import wickra as ta

wad = ta.Wad()
high  = np.array([101, 102, 103], dtype=float)
low   = np.array([ 99, 100, 101], dtype=float)
close = np.array([100, 101, 102], dtype=float)
print(wad.batch(high, low, close))
```

Output:

```
[ nan  1.  2.]
```

### Node

```javascript
const ta = require('wickra');

const wad = new ta.Wad();
console.log('warmupPeriod:', wad.warmupPeriod()); // 2
const high  = [101, 102, 103];
const low   = [ 99, 100, 101];
const close = [100, 101, 102];
console.log(wad.batch(high, low, close)); // [NaN, 1, 2]
```

### Streaming

```rust
use wickra::{Candle, Indicator, Wad};

let mut wad = Wad::new();
let mut last = None;
for i in 0..20 {
    let base = 100.0 + f64::from(i);
    let c = Candle::new(base, base + 1.0, base - 1.0, base + 0.5, 1_000.0, 0).unwrap();
    last = wad.update(c);
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

Williams' A/D is a **divergence tool**, not a level:

1. **Bullish divergence.** Price makes a lower low while WAD makes a higher low →
   accumulation under weak price → potential reversal up.
2. **Bearish divergence.** Price makes a higher high while WAD makes a lower high
   → distribution into strength → potential reversal down.
3. **Trend confirmation.** WAD rising with price confirms the advance; the line
   flattening ahead of price warns the move is running on fumes.

Because no volume enters the formula, WAD works on instruments with unreliable or
missing volume (FX, some indices) where Chaikin's line cannot.

## Common pitfalls

- **Absolute level is arbitrary.** The line's value depends on the start point;
  only its shape carries information.
- **It is not Chaikin A/D.** `Adl` weights a money-flow multiplier by volume; WAD
  uses true-range geometry and no volume — they can diverge sharply.
- **Gaps matter.** The true-low/true-high construction folds in the prior close,
  so overnight gaps are captured rather than ignored.

## References

Williams, L. R. (1979), *How I Made One Million Dollars Last Year Trading
Commodities*. The accumulation/distribution line described there is the
volume-free construction implemented here.

## See also

- [Indicator-Adl](/Indicators/Indicator-Adl) — Chaikin's volume-weighted A/D line.
- [Indicator-ChaikinMoneyFlow](/Indicators/Indicator-ChaikinMoneyFlow) — the bounded money-flow oscillator.
- [Indicator-Obv](/Indicators/Indicator-Obv) — cumulative signed volume.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
