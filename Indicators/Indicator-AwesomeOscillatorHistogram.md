# Awesome Oscillator Histogram

> The bar-to-bar **momentum** of the [AwesomeOscillator](/Indicators/Indicator-AwesomeOscillator):
> `AO_t − AO_{t−lookback}`. This is the value behind the coloured histogram bars
> on Bill Williams' charts — positive means `AO` is rising (the histogram "greens
> up"), negative means it is falling.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Oscillators |
| Input type | `Candle` (uses `high` and `low` for the median price) |
| Output type | `f64` |
| Output range | unbounded around zero |
| Default parameters | `fast = 5`, `slow = 34`, `lookback = 1` (`classic()`) |
| Warmup period | `slow + lookback` (`35` for the defaults) |
| Interpretation | Positive: `AO` rising; negative: `AO` falling |

## Formula

```text
median  = (high + low) / 2
AO      = SMA(median, fast) − SMA(median, slow)
AOHist  = AO_t − AO_{t−lookback}
```

The histogram reports the **rate of change** of the Awesome Oscillator over a
`lookback` window. The classic one-bar delta (`lookback = 1`) is the coloured
histogram every charting package draws under the AO.

This is distinct from the two related indicators Wickra ships: the raw
[`AwesomeOscillator`](/Indicators/Indicator-AwesomeOscillator) is `AO` itself, and
the [`AcceleratorOscillator`](/Indicators/Indicator-AcceleratorOscillator) is
`AO − SMA(AO, 5)`. The histogram instead differences `AO` against its own past.

See `crates/wickra-core/src/indicators/awesome_oscillator_histogram.rs` (the
update is at `awesome_oscillator_histogram.rs:89`).

## Parameters

| Name | Type | Default | Valid range | Source | Description |
|------|------|---------|-------------|--------|-------------|
| `fast` | `usize` | `5` | `>= 1`, `< slow` | `awesome_oscillator_histogram.rs:55` | Fast SMA length of the underlying AO. |
| `slow` | `usize` | `34` | `>= 1`, `> fast` | `awesome_oscillator_histogram.rs:55` | Slow SMA length of the underlying AO. |
| `lookback` | `usize` | `1` | `>= 1` | `awesome_oscillator_histogram.rs:55` | Momentum window: how many bars back `AO` is differenced against. |

Any zero period returns `Error::PeriodZero`; `fast >= slow` returns
`Error::InvalidPeriod`. `AwesomeOscillatorHistogram::classic()` is `(5, 34, 1)`
(`awesome_oscillator_histogram.rs:75`). The Node/WASM constructor's third
argument is named `smaPeriod` for backward compatibility, but it is this momentum
`lookback`.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/awesome_oscillator_histogram.rs`:

```rust
use wickra::{AwesomeOscillatorHistogram, Candle, Indicator};
// AwesomeOscillatorHistogram: Input = Candle, Output = f64
const _: fn(&mut AwesomeOscillatorHistogram, Candle) -> Option<f64> =
    <AwesomeOscillatorHistogram as Indicator>::update;
```

Only `high` and `low` are read (the AO uses the median price), so both native
bindings take just those two series. Python streams as `float | None` and batches
`AwesomeOscillatorHistogram(fast, slow, lookback).batch(high, low)` to a 1-D
`numpy.ndarray` (`NaN` warmup). Node streams as `number | null` via
`update(high, low)` and batches `batch(high, low)`.

## Warmup

`warmup_period()` returns `slow + lookback`. The AO first emits at `slow`
candles; `lookback` more AO values are then needed before `AO_t − AO_{t−lookback}`
can be formed. For the classic `(5, 34, 1)` that is `34 + 1 = 35`. The unit tests
`accessors_and_metadata` (`classic().warmup_period() == 35`) and
`warmup_emits_first_value_at_warmup_period` ((2, 4, 2) → warmup `6`: first five
outputs `None`, `out[5]` is `Some`) pin this.

## Edge cases

- **Constant series.** A flat median drives `AO` to `0`, so its momentum is `0`.
  Unit test `constant_series_yields_zero`.
- **Equals the AO delta.** The histogram equals `AO_t − AO_{t−lookback}` bar for
  bar. Unit test `equals_ao_difference`.
- **Zero period.** Any zero argument returns `Err(Error::PeriodZero)`. Unit test
  `rejects_zero_period`.
- **`fast >= slow`.** Returns `Err(Error::InvalidPeriod)`. Unit test
  `rejects_fast_geq_slow`.
- **Reset.** `reset()` clears both the AO and the lookback history. Unit test
  `reset_clears_state`.

## Examples

### Rust

```rust
use wickra::{AwesomeOscillatorHistogram, BatchExt, Candle, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // A flat market: AO is zero, so its momentum (the histogram) is zero.
    let candles: Vec<Candle> = (0..10)
        .map(|i| Candle::new(42.0, 42.5, 41.5, 42.0, 1.0, i).unwrap())
        .collect();
    let mut hist = AwesomeOscillatorHistogram::new(3, 5, 1)?;
    let out = hist.batch(&candles);
    println!("warmup_period = {}", hist.warmup_period());
    println!("out[4] = {:?}, out[5] = {:?}", out[4], out[5]);
    Ok(())
}
```

Output:

```
warmup_period = 6
out[4] = None, out[5] = Some(0.0)
```

With `(fast, slow, lookback) = (3, 5, 1)` the warmup is `5 + 1 = 6`: indices
`0..5` are `None`, and from index `5` the flat series yields `Some(0.0)` — matching
the `warmup_emits_first_value_at_warmup_period` and `constant_series_yields_zero`
unit tests.

### Python

```python
import wickra as ta

high = [42.5] * 10
low = [41.5] * 10
hist = ta.AwesomeOscillatorHistogram(3, 5, 1)
out = hist.batch(high, low)
print('out[5]:', out[5])
```

Output:

```
out[5]: 0.0
```

### Node

```javascript
const wickra = require('wickra');

const high = Array.from({ length: 10 }, () => 42.5);
const low = Array.from({ length: 10 }, () => 41.5);
const hist = new wickra.AwesomeOscillatorHistogram(3, 5, 1);
console.log('out[5]:', hist.batch(high, low)[5]);
```

Output:

```
out[5]: 0
```

### Streaming

```rust
use wickra::{AwesomeOscillatorHistogram, Candle, Indicator};

let mut hist = AwesomeOscillatorHistogram::classic(); // (5, 34, 1)
let feed: Vec<Candle> = Vec::new(); // your live OHLCV candle feed
for bar in feed {
    if let Some(h) = hist.update(bar) {
        // h > 0: AO rose this bar (greening histogram); h < 0: AO fell
        let _ = h;
    }
}
```

## Interpretation

1. **Histogram colour.** Each bar is `AO_t − AO_{t−lookback}`: positive bars are
   the "green" rising-momentum bars, negative bars the "red" falling ones.
2. **Zero-line cross.** A cross from negative to positive marks `AO` turning up;
   because it differences `AO`, the histogram turns *before* `AO` itself crosses
   zero — an earlier (and noisier) signal.
3. **Tune the lookback.** `lookback = 1` is the classic one-bar delta; a larger
   lookback smooths the histogram into a slower rate-of-change read.

## Common pitfalls

- **Treating it as momentum.** It is the *change* in momentum: a positive
  histogram with a still-negative `AO` means momentum is decelerating, not yet
  bullish.
- **Confusing it with the Accelerator.** `AcceleratorOscillator` is `AO − SMA(AO, 5)`;
  this histogram is `AO_t − AO_{t−lookback}`. Different constructions, different
  signals.

## References

- Bill Williams, *New Trading Dimensions*, Wiley (1998) — the Awesome Oscillator
  and its histogram of bar-to-bar change.

## See also

- [AwesomeOscillator](/Indicators/Indicator-AwesomeOscillator) — the momentum line itself.
- [AcceleratorOscillator](/Indicators/Indicator-AcceleratorOscillator) — `AO − SMA(AO, 5)`.
- [Alligator](/Indicators/Indicator-Alligator) — Williams' trend filter.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
