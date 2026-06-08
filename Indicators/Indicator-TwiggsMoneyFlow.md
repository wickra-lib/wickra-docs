# TwiggsMoneyFlow

> Colin Twiggs' refinement of Chaikin Money Flow — true-range boundaries and
> Wilder exponential smoothing make a faster, gap-aware `[−1, +1]` money-flow
> oscillator.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Volume |
| Input type | `Candle` (high / low / close / volume) |
| Output type | `f64` |
| Output range | `≈ [−1, +1]` (positive = buying pressure) |
| Default parameters | `(period = 21)` (Python) |
| Warmup period | `period + 1` |
| Interpretation | `> 0` = accumulation; `< 0` = distribution; watch divergences. |

## Formula

```
TRH   = max(high, prev_close)          (true high)
TRL   = min(low,  prev_close)          (true low)
ad    = volume * (2*close − TRH − TRL) / (TRH − TRL)   (0 if TRH == TRL)
TMF   = WilderEMA(ad, period) / WilderEMA(volume, period)
```

Twiggs Money Flow corrects two weaknesses of [`Cmf`](/Indicators/Indicator-ChaikinMoneyFlow).
First, it uses the **true** high and low (folding in the prior close) so overnight
gaps are counted rather than ignored. Second, it smooths both the accumulated
money flow and the volume with a **Wilder exponential average**
(`EMAₜ = EMAₜ₋₁ + (xₜ − EMAₜ₋₁)/period`, seeded with the simple mean of the first
`period` samples) instead of a flat window-sum, which removes the jump that occurs
when a large bar leaves a CMF window. Source:
`crates/wickra-core/src/indicators/twiggs_money_flow.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `21` (Python) | `>= 1`      | `twiggs_money_flow.rs:55` | Wilder smoothing window for both the money-flow and volume averages. `0` errors with `Error::PeriodZero`. |

The `period` getter returns the window; `value` returns the current output if
ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/twiggs_money_flow.rs`:

```rust
use wickra::{Candle, Indicator, TwiggsMoneyFlow};
// TwiggsMoneyFlow: Input = Candle, Output = f64
const _: fn(&mut TwiggsMoneyFlow, Candle) -> Option<f64> = <TwiggsMoneyFlow as Indicator>::update;
```

A `Candle` in, an `Option<f64>` out. The Python binding takes a candle for
`update` and four numpy columns `(high, low, close, volume)` for `batch`; Node
takes `update(high, low, close, volume)` and `batch(high[], low[], close[],
volume[])` (NaN warmup).

## Warmup

`warmup_period() == period + 1`. Bar 1 seeds the reference close; bars
`2..=period+1` seed both Wilder averages; the first value lands on bar
`period + 1` (`first_emission_at_warmup_period` pins this).

## Edge cases

- **Closing at the true high → positive.** Bars that close at their high drive the
  oscillator toward `+1` (`closes_at_true_high_is_positive` pins this).
- **Closing at the true low → negative.** Bars that close at their low drive it
  negative (`closes_at_true_low_is_negative` pins this).
- **Zero volume → 0.** A stretch of zero-volume bars makes the denominator average
  `0`; the ratio is guarded to `0` rather than `0 / 0`
  (`zero_volume_yields_zero` pins this).
- **Bounded.** The reading stays within `[−1, +1]` (`output_in_range` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `tmf.reset()` clears the reference close, both seed accumulators,
  both Wilder averages and the last value (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, TwiggsMoneyFlow};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut tmf = TwiggsMoneyFlow::new(3)?;
    // Bars that close at their high -> strong accumulation.
    let candles: Vec<Candle> = (0..12)
        .map(|i| {
            let base = 100.0 + f64::from(i);
            Candle::new(base - 1.0, base + 1.0, base - 1.0, base + 1.0, 1_000.0, 0).unwrap()
        })
        .collect();
    let out = tmf.batch(&candles);
    println!("warmup_period = {}", tmf.warmup_period());
    println!("last > 0.9: {}", out.last().unwrap().unwrap() > 0.9);
    Ok(())
}
```

Output:

```
warmup_period = 4
last > 0.9: true
```

### Python

```python
import numpy as np
import wickra as ta

tmf = ta.TwiggsMoneyFlow(21)
n = 60
high   = np.array([101 + (i % 5) for i in range(n)], dtype=float)
low    = np.array([ 99 - (i % 5) for i in range(n)], dtype=float)
close  = np.array([100 + (i % 5) for i in range(n)], dtype=float)
volume = np.full(n, 1000.0)
print(tmf.batch(high, low, close, volume)[-1])  # in [-1, 1]
```

### Node

```javascript
const ta = require('wickra');

const tmf = new ta.TwiggsMoneyFlow(21);
console.log('warmupPeriod:', tmf.warmupPeriod()); // 22
```

### Streaming

```rust
use wickra::{Candle, Indicator, TwiggsMoneyFlow};

let mut tmf = TwiggsMoneyFlow::new(21).unwrap();
let mut last = None;
for i in 0..60 {
    let base = 100.0 + (f64::from(i) * 0.2).sin() * 5.0;
    let c = Candle::new(base, base + 1.0, base - 1.0, base + 0.5, 1_000.0, 0).unwrap();
    last = tmf.update(c);
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Zero-line crosses.** A move from negative to positive territory signals a
   shift from net distribution to net accumulation.
2. **Divergences.** TMF making a higher low while price makes a lower low is a
   bullish divergence (and vice versa) — the headline use Twiggs designed it for.
3. **Trend filter.** Sustained TMF above zero confirms an uptrend's demand;
   readings hugging zero in a rally warn the move lacks money-flow support.

## Common pitfalls

- **It is not CMF.** Wilder smoothing and true-range boundaries make TMF react
  faster and handle gaps differently; do not expect the two lines to overlay.
- **Volume quality.** Like all money-flow tools it depends on trustworthy volume;
  on FX or synthetic feeds prefer [`WilliamsAd`](/Indicators/Indicator-WilliamsAd).
- **Range collapse.** When the true range is zero (a doji equal to the prior
  close) that bar contributes nothing, which is intentional.

## References

Twiggs, C., *Twiggs Money Flow* (Incredible Charts / The Chart Store). Derived
from Chaikin Money Flow (Marc Chaikin) with Wilder smoothing and true-range
boundaries.

## See also

- [Indicator-ChaikinMoneyFlow](/Indicators/Indicator-ChaikinMoneyFlow) — the simple-sum money-flow original.
- [Indicator-WilliamsAd](/Indicators/Indicator-WilliamsAd) — volume-free accumulation/distribution.
- [Indicator-Mfi](/Indicators/Indicator-Mfi) — the volume-weighted RSI of typical price.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
