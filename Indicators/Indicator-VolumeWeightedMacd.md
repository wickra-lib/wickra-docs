# VolumeWeightedMacd

> MACD built on volume-weighted moving averages — heavy-volume bars dominate the
> trend estimate, so crossovers reflect where real participation occurred.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Volume |
| Input type | `Candle` (close / volume) |
| Output type | `VolumeWeightedMacdOutput { macd, signal, histogram }` |
| Output range | `(−∞, +∞)` for each field |
| Default parameters | `(fast = 12, slow = 26, signal = 9)` |
| Warmup period | `slow + signal − 1` |
| Interpretation | `macd > signal` (histogram > 0) = bullish; crossover = trade trigger. |

## Formula

```
macd      = VWMA(close, fast) − VWMA(close, slow)
signal    = EMA(macd, signal_period)
histogram = macd − signal
```

The classic [`MacdIndicator`](/Indicators/Indicator-MacdIndicator) smooths price with EMAs
that ignore volume. The volume-weighted MACD replaces both with a
[`Vwma`](/Indicators/Indicator-Vwma), so each average is `Σ(close·volume) /
Σ(volume)` over its window — heavy bars pull the line harder. The signal line
stays a plain EMA of the MACD, preserving the standard histogram. Source:
`crates/wickra-core/src/indicators/volume_weighted_macd.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `fast`   | `usize` | `12`    | `>= 1`, `< slow` | `volume_weighted_macd.rs:77` | Fast VWMA window. |
| `slow`   | `usize` | `26`    | `> fast`    | `volume_weighted_macd.rs:77` | Slow VWMA window. |
| `signal` | `usize` | `9`     | `>= 1`      | `volume_weighted_macd.rs:77` | Signal EMA window over the MACD line. |

`fast >= slow` errors with `Error::InvalidPeriod`; any zero period errors with
`Error::PeriodZero`. `periods()` returns `(fast, slow, signal)`; `value` returns
the current output if ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/volume_weighted_macd.rs`:

```rust
use wickra::{Candle, Indicator, VolumeWeightedMacd, VolumeWeightedMacdOutput};
// VolumeWeightedMacd: Input = Candle, Output = VolumeWeightedMacdOutput
const _: fn(&mut VolumeWeightedMacd, Candle) -> Option<VolumeWeightedMacdOutput> =
    <VolumeWeightedMacd as Indicator>::update;
```

A `Candle` in, an `Option<VolumeWeightedMacdOutput>` out. The Python binding
returns a `(macd, signal, histogram)` tuple from `update` and an `(n, 3)` array
from `batch(close, volume)`; Node returns an object `{ macd, signal, histogram }`
and a flat `Float64Array` of length `n*3`; WASM mirrors the object with camelCase
keys.

## Warmup

`warmup_period() == slow + signal − 1`. The slow VWMA seeds after `slow` candles;
the signal EMA needs `signal − 1` further MACD values
(`first_emission_at_warmup_period` pins this).

## Edge cases

- **Uptrend → positive MACD.** A steady advance keeps the fast VWMA above the slow
  one (`uptrend_has_positive_macd` pins this).
- **Histogram identity.** `histogram == macd − signal` holds every bar
  (`histogram_is_macd_minus_signal` pins this).
- **Constant volume.** With flat volume each VWMA reduces to an SMA; the series
  stays finite and well-defined (`equal_volume_matches_plain_macd` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `vwmacd.reset()` clears both VWMAs, the signal EMA and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, VolumeWeightedMacd};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut m = VolumeWeightedMacd::new(3, 6, 3)?;
    let candles: Vec<Candle> = (0..60)
        .map(|i| Candle::new(100.0 + f64::from(i), 100.0 + f64::from(i), 100.0 + f64::from(i),
                             100.0 + f64::from(i), 1_000.0, 0).unwrap())
        .collect();
    let out = m.batch(&candles);
    println!("warmup_period = {}", m.warmup_period());
    println!("macd > 0: {}", out.last().unwrap().unwrap().macd > 0.0);
    Ok(())
}
```

Output:

```
warmup_period = 8
macd > 0: true
```

### Python

```python
import numpy as np
import wickra as ta

m = ta.VolumeWeightedMacd(12, 26, 9)
close  = np.cumsum(np.ones(80)) + 100.0
volume = np.full(80, 1000.0)
macd, signal, hist = m.batch(close, volume).T
print(macd[-1], signal[-1], hist[-1])
```

### Node

```javascript
const ta = require('wickra');

const m = new ta.VolumeWeightedMacd(12, 26, 9);
console.log('warmupPeriod:', m.warmupPeriod()); // 34
```

### Streaming

```rust
use wickra::{Candle, Indicator, VolumeWeightedMacd};

let mut m = VolumeWeightedMacd::new(12, 26, 9).unwrap();
let mut last = None;
for i in 0..80 {
    let base = 100.0 + f64::from(i);
    let c = Candle::new(base, base + 1.0, base - 1.0, base + 0.5, 1_000.0, 0).unwrap();
    last = m.update(c);
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Signal crossovers.** `macd` crossing above `signal` (histogram turning
   positive) is the bullish trigger; the reverse is bearish — read exactly like
   classic MACD, but with volume conviction baked in.
2. **Zero-line.** `macd > 0` means the volume-weighted fast trend leads the slow
   trend; sustained positive readings confirm an uptrend.
3. **Volume edge.** Compared with plain MACD, the volume-weighted version turns
   earlier when a move is driven by genuine participation and lags when a move is
   thin — useful as a confirmation filter.

## Common pitfalls

- **Needs real volume.** On feeds with synthetic or missing volume the VWMAs
  degenerate toward SMAs; prefer plain MACD there.
- **Not identical to MACD.** Even with similar shape, the lines differ from
  EMA-MACD; do not expect overlapping crossovers.
- **Spiky volume.** A single enormous-volume bar can jerk the fast VWMA; smooth
  or cap volume if your feed has outliers.

## References

Dormeier, B. P. (2011), *Investing with Volume Analysis*. The volume-weighted MACD
is a common construction substituting VWMA for EMA in Appel's MACD (Appel, G.,
1979).

## See also

- [Indicator-MacdIndicator](/Indicators/Indicator-MacdIndicator) — the EMA-based original.
- [Indicator-Vwma](/Indicators/Indicator-Vwma) — the volume-weighted moving average building block.
- [Indicator-MacdHistogram](/Indicators/Indicator-MacdHistogram) — the standalone histogram.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
