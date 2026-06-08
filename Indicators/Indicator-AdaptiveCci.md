# AdaptiveCci

> Lambert's CCI with an efficiency-ratio-adaptive centre line — it leads in trends
> and stays calm in chop.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Ehlers / Cycle (DSP) |
| Input type | `Candle` (high / low / close) |
| Output type | `f64` |
| Output range | unbounded around `0` (≈ `±100` bands) |
| Default parameters | `(period = 20)` (Python) |
| Warmup period | `period` |
| Interpretation | `> +100` overbought / strong up; `< −100` oversold / strong down. |

## Formula

```
TP   = (high + low + close) / 3
ER   = |TP_t − TP_oldest| / Σ |ΔTP| over the window      (0..1)
sc   = ( ER·(2/3 − 2/31) + 2/31 )²
mean += sc·(TP_t − mean)                                  (adaptive centre, seeded with SMA)
MD   = mean(|TP_i − mean|) over the window
CCI  = (TP_t − mean) / (0.015 · MD)
```

The classic [`Cci`](/Indicators/Indicator-Cci) centres typical price on an SMA;
that SMA's lag delays the oscillator in fast moves. Driving the centre line with a
KAMA-style adaptive average (via Kaufman's efficiency ratio) lets it accelerate
toward price in a clean trend and slow in noise, so the CCI reaches its bands
sooner on real moves and pokes them less on chop. The `0.015` constant preserves
Lambert's `±100` convention. Source:
`crates/wickra-core/src/indicators/adaptive_cci.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `20` (Python) | `>= 2`      | `adaptive_cci.rs:60` | Window for the efficiency ratio, centre line and mean deviation. `0` errors with `Error::PeriodZero`; `< 2` with `Error::InvalidPeriod`. |

The `period` getter returns the window; `value` returns the current output if
ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/adaptive_cci.rs`:

```rust
use wickra::{Candle, Indicator, AdaptiveCci};
// AdaptiveCci: Input = Candle, Output = f64
const _: fn(&mut AdaptiveCci, Candle) -> Option<f64> = <AdaptiveCci as Indicator>::update;
```

A `Candle` in, an `Option<f64>` out. The Python binding takes a candle for `update`
and three numpy columns `(high, low, close)` for `batch`; Node takes `update(high,
low, close)` and `batch(high[], low[], close[])` (NaN warmup).

## Warmup

`warmup_period() == period`. The first value lands once the window is full
(`first_emission_at_warmup_period` pins this).

## Edge cases

- **Uptrend → positive.** A rising typical price gives a positive CCI
  (`uptrend_is_positive` pins this).
- **Downtrend → negative.** A falling typical price gives a negative CCI
  (`downtrend_is_negative` pins this).
- **Flat window → 0.** Zero mean deviation returns `0` rather than dividing by
  zero (`flat_window_is_zero` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `c.reset()` clears the window, the adaptive mean and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, AdaptiveCci};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut c = AdaptiveCci::new(10)?;
    let candles: Vec<Candle> = (0..40)
        .map(|i| { let b = 100.0 + f64::from(i); Candle::new(b, b, b, b, 1_000.0, 0).unwrap() })
        .collect();
    println!("last > 0: {}", c.batch(&candles).last().unwrap().unwrap() > 0.0);
    Ok(())
}
```

Output:

```
last > 0: true
```

### Python

```python
import numpy as np
import wickra as ta

c = ta.AdaptiveCci(20)
n = 60
base = 100 + np.sin(np.arange(n) * 0.3) * 5
print(c.batch(base + 1, base - 1, base)[-1])
```

### Node

```javascript
const ta = require('wickra');

const c = new ta.AdaptiveCci(20);
console.log('warmupPeriod:', c.warmupPeriod()); // 20
```

### Streaming

```rust
use wickra::{Candle, Indicator, AdaptiveCci};

let mut c = AdaptiveCci::new(20).unwrap();
let mut last = None;
for i in 0..60 {
    let base = 100.0 + (f64::from(i) * 0.3).sin() * 5.0;
    let candle = Candle::new(base, base + 1.0, base - 1.0, base, 1_000.0, 0).unwrap();
    last = c.update(candle);
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Earlier band touches.** In a genuine trend the adaptive centre accelerates, so
   the CCI reaches `±100` faster than a fixed-SMA CCI.
2. **Fewer false pokes.** In a range the centre line slows, damping spurious band
   crosses.
3. **Same playbook.** Read the `±100` (and `±200`) levels and zero-line crosses as
   for the standard CCI.

## Common pitfalls

- **Not bounded.** Like all CCIs it can exceed `±100`/`±200` in strong moves.
- **Adapts the centre, not the band.** The `0.015·MD` scale is unchanged; only the
  centre line adapts.
- **Period role.** `period` is the window for ER, centre and deviation, not a
  smoothing constant.

## References

Lambert, D. (1980), *Commodity Channel Index* (Commodities magazine); Kaufman,
P. J. (1995), *Smarter Trading* (efficiency ratio); Ehlers, J. F. (2013), *Cycle
Analytics for Traders* (cycle-adaptive oscillators).

## See also

- [Indicator-Cci](/Indicators/Indicator-Cci) — the fixed-SMA original.
- [Indicator-AdaptiveRsi](/Indicators/Indicator-AdaptiveRsi) — the adaptive RSI counterpart.
- [Indicator-Kama](/Indicators/Indicator-Kama) — the adaptive average it borrows.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
