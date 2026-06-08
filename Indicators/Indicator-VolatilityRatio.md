# VolatilityRatio

> Schwager's Volatility Ratio — today's true range divided by the EMA of the
> prior true ranges; a reading above `2.0` marks a wide-ranging day.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Volatility & Bands |
| Input type | `Candle` (high / low / close) |
| Output type | `f64` |
| Output range | `[0, ∞)` (1.0 = today's range equals its typical level) |
| Default parameters | `(period = 14)` (Python) |
| Warmup period | `period + 2` |
| Interpretation | `> 2.0` = wide-ranging day; `< 1` = inside/quiet day. |

## Formula

```
TR_t = max(high − low, |high − prev_close|, |low − prev_close|)
VR_t = TR_t / EMA_n(TR through bar t−1)
```

Jack Schwager's volatility ratio compares today's true range to its recent
typical level. A value above `2.0` is a **wide-ranging day** — today's range is
more than twice the smoothed average — which often precedes or accompanies a
reversal. The denominator is the exponential moving average of true range
*excluding the current bar* (smoothing `2 / (period + 1)`, seeded with the simple
average of the first `period` true ranges), so a single large bar stands out
instead of inflating its own benchmark. Using a standard EMA — rather than the
Wilder smoothing of [`Atr`](/Indicators/Indicator-Atr) — keeps the ratio distinct
from a plain `TR / ATR`. Source:
`crates/wickra-core/src/indicators/volatility_ratio.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `14` (Python) | `>= 1`      | `volatility_ratio.rs:60` | Number of true ranges seeding and smoothing the denominator EMA. `0` errors with `Error::PeriodZero`. |

The `period` getter returns the window length; `value` returns the current output
if ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/volatility_ratio.rs`:

```rust
use wickra::{Candle, Indicator, VolatilityRatio};
// VolatilityRatio: Input = Candle, Output = f64
const _: fn(&mut VolatilityRatio, Candle) -> Option<f64> = <VolatilityRatio as Indicator>::update;
```

A `Candle` in, an `Option<f64>` out. The Python binding takes a candle for
`update` and three numpy columns `(high, low, close)` for `batch`; Node takes
`update(high, low, close)` and `batch(high[], low[], close[])` (NaN warmup).

## Warmup

`warmup_period() == period + 2`. Bar 1 sets the previous close; bars
`2..=period+1` seed the denominator EMA; the first ratio is emitted on bar
`period + 2` (`first_emission_at_warmup_period` pins this).

## Edge cases

- **Steady range → 1.0.** A constant true range makes the EMA equal it, so the
  ratio is exactly `1.0` (`steady_range_ratio_is_one` pins this).
- **Wide-ranging day → > 2.0.** A bar whose range is far above the smoothed
  benchmark pushes the ratio past `2.0` (`wide_ranging_day_exceeds_two` pins
  this).
- **Flat market.** Zero-range candles drive every true range and the EMA to `0`;
  the ratio is guarded to `0.0` rather than `0 / 0`
  (`flat_market_yields_zero` pins this).
- **Non-negative.** True range and its EMA are non-negative, so `VR >= 0`
  (`output_is_non_negative` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method
  guard is needed.
- **Reset.** `vr.reset()` clears the previous close, the seed accumulator, the
  EMA and the last value (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, VolatilityRatio};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut vr = VolatilityRatio::new(3)?;
    // Eight candles each with a constant true range of 2.0.
    let candles: Vec<Candle> = (0..8)
        .map(|i| {
            let base = 100.0 + f64::from(i);
            Candle::new(base - 1.0, base + 1.0, base - 1.0, base, 1_000.0, 0).unwrap()
        })
        .collect();
    let out = vr.batch(&candles);
    println!("warmup_period = {}", vr.warmup_period());
    println!("last = {:?}", out.last().unwrap());
    Ok(())
}
```

Output:

```
warmup_period = 5
last = Some(1.0)
```

A steady range makes the EMA equal today's true range, so the ratio settles at
`1.0`.

### Python

```python
import numpy as np
import wickra as ta

vr = ta.VolatilityRatio(3)
high  = np.array([101, 102, 103, 104, 105, 106, 110], dtype=float)
low   = np.array([ 99, 100, 101, 102, 103, 104, 100], dtype=float)
close = np.array([100, 101, 102, 103, 104, 105, 105], dtype=float)
print(vr.batch(high, low, close))
```

Output:

```
[ nan  nan  nan  nan  1.   1.  ~5.]
```

The first five bars warm up / hold at `1.0`; the final wide bar (range `10`
versus a typical `2`) prints a ratio well above `2.0`.

### Node

```javascript
const ta = require('wickra');

const vr = new ta.VolatilityRatio(14);
console.log('warmupPeriod:', vr.warmupPeriod()); // 16
const high  = Array.from({ length: 40 }, (_, i) => 100 + i + 1);
const low   = Array.from({ length: 40 }, (_, i) => 100 + i - 1);
const close = Array.from({ length: 40 }, (_, i) => 100 + i);
console.log(vr.batch(high, low, close).at(-1)); // ~1.0 (steady range)
```

### Streaming

```rust
use wickra::{Candle, Indicator, VolatilityRatio};

let mut vr = VolatilityRatio::new(14).unwrap();
let mut last = None;
for i in 0..40 {
    let base = 100.0 + f64::from(i);
    let c = Candle::new(base, base + 2.0, base - 1.0, base + 0.5, 1_000.0, 0).unwrap();
    last = vr.update(c);
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

The volatility ratio is a **range-expansion** filter. Schwager used it to flag
days whose range breaks decisively out of the recent norm:

1. **Wide-ranging-day signal.** `VR > 2.0` marks a bar more than twice the
   typical range — a climactic move that frequently exhausts a trend and
   precedes a reversal.
2. **Breakout confirmation.** Pair a directional breakout with a high `VR` to
   distinguish a genuine range expansion from drift inside the prior range.
3. **Quiet-market detection.** Sustained `VR < 1` signals contracting ranges —
   the coiling that often precedes the next expansion.

Because the denominator is the EMA of *prior* ranges, the ratio reacts to today's
bar immediately without that bar diluting its own benchmark.

## Common pitfalls

- **Two conventions share the name.** Some sources define the ratio as today's
  true range over the *N-day high-low span*; this implementation uses the
  widely-charted EMA-of-true-range form (Schwager / IncredibleCharts), where
  `> 2.0` means "twice the typical range".
- **It is not `TR / ATR`.** The denominator uses standard EMA smoothing, not
  Wilder's, and excludes the current bar — so it will not match an `ATR`-based
  ratio bar-for-bar.
- **Choose `period` for your timeframe.** A short `period` makes every spike look
  wide; a long one smooths genuine expansions away.

## References

Schwager, J. D. (1996), *Schwager on Futures: Technical Analysis*, Wiley. See
also the IncredibleCharts reference on the Volatility Ratio (EMA-of-true-range
form, wide-ranging-day threshold `2.0`).

## See also

- [Indicator-Atr](/Indicators/Indicator-Atr) — Wilder-smoothed true range (the absolute level).
- [Indicator-Natr](/Indicators/Indicator-Natr) — normalized ATR as a percentage of price.
- [Indicator-TrueRange](/Indicators/Indicator-TrueRange) — the raw per-bar true range.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
