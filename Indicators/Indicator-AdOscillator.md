# A/D Oscillator (Williams)

> Larry Williams' volume-less Accumulation/Distribution line measured against its
> own 13-bar simple moving average, so it oscillates around zero instead of
> drifting like the cumulative line. Positive when accumulation is running ahead
> of its recent average, negative when distribution is.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Volume |
| Input type | `Candle` (uses `high`, `low`, `close`) |
| Output type | `f64` — zero-centred oscillator |
| Output range | unbounded but mean-reverting around `0` |
| Default parameters | none — `AdOscillator::new()` (fixed 13-bar signal) |
| Warmup period | `14` |
| Interpretation | Williams A/D line minus its 13-bar SMA |

## Formula

```text
TR_h_t  = max(close_{t−1}, high_t)
TR_l_t  = min(close_{t−1}, low_t)
WAD_t   = WAD_{t−1} + (close_t − TR_l_t)   if close_t > close_{t−1}   (accumulation)
WAD_t   = WAD_{t−1} + (close_t − TR_h_t)   if close_t < close_{t−1}   (distribution)
WAD_t   = WAD_{t−1}                          if close_t == close_{t−1}
ADOSC_t = WAD_t − SMA(WAD, 13)_t
```

The underlying line is Larry Williams' volume-less A/D (1972): it anchors the
move on the prior close (a *true* high/low, the same idea behind true range) and
sums the directional component. The oscillator subtracts the line's own 13-bar
simple moving average, which removes the drift and centres the series on zero —
so it reads as a momentum/mean-reversion signal rather than a cumulative level.

See `crates/wickra-core/src/indicators/ad_oscillator.rs` (the 13-bar signal
constant `SIGNAL_PERIOD` lives at `ad_oscillator.rs:8`; the update at
`ad_oscillator.rs:85`).

## Parameters

| Name | Type | Default | Valid range | Source | Description |
|------|------|---------|-------------|--------|-------------|
| *(none)* | — | — | — | `ad_oscillator.rs:8`, `:66` | `AdOscillator::new()` takes no arguments; the signal length is fixed at the classic **13** bars (`SIGNAL_PERIOD`). |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/ad_oscillator.rs`:

```rust
use wickra::{AdOscillator, Candle, Indicator};
// AdOscillator: Input = Candle, Output = f64
const _: fn(&mut AdOscillator, Candle) -> Option<f64> = <AdOscillator as Indicator>::update;
```

The native bindings expose this under the TA-Lib-style alias **`ADOSC`**. Python
streams as `float | None` and batches `ADOSC().batch(high, low, close)` to a 1-D
`numpy.ndarray` (`NaN` for warmup). Node streams as `number | null` via
`update(high, low, close)` and batches `batch(high, low, close)` with `NaN`
placeholders.

## Warmup

`AdOscillator::new().warmup_period() == 14`. The first bar only seeds the
previous-close anchor and returns `None` (unit test `seed_bar_returns_none`);
the A/D line then feeds the 13-bar signal SMA, so the first oscillator value
lands at input index 13 (the 14th bar). The unit tests `accessors_and_metadata`
(`warmup_period() == 14`) and `warmup_emits_at_warmup_period` (first 13 outputs
`None`, `out[13]` is `Some`) pin this.

## Edge cases

- **Flat market.** A market that never accumulates or distributes leaves the line
  constant, so the oscillator sits at exactly `0.0` once warm. The unit test
  `flat_market_oscillates_at_zero` pins this.
- **Identity vs the raw line.** The oscillator equals the standalone
  [`Wad`](/Indicators/Indicator-Wad) line passed through `line − SMA(line, 13)`,
  bar for bar — pinned by `equals_wad_line_minus_its_sma`.
- **Seed bar.** The very first candle returns `None` (it only records the prior
  close); pinned by `seed_bar_returns_none`.
- **Reset.** `reset()` clears the prior close, the accumulator and the signal SMA;
  the next `update` restarts the warmup. Pinned by `reset_clears_state`.

## Examples

### Rust

```rust
use wickra::{AdOscillator, BatchExt, Candle, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // A flat market never accumulates or distributes: the line is constant, so
    // the oscillator is exactly zero once the 13-bar signal SMA has filled.
    let candles: Vec<Candle> = (0..16)
        .map(|i| Candle::new(50.0, 50.0, 50.0, 50.0, 100.0, i).unwrap())
        .collect();
    let mut adosc = AdOscillator::new();
    let out = adosc.batch(&candles);
    println!("warmup_period = {}", adosc.warmup_period());
    println!("out[12] = {:?}, out[13] = {:?}", out[12], out[13]);
    Ok(())
}
```

Output:

```
warmup_period = 14
out[12] = None, out[13] = Some(0.0)
```

`out[0..13]` are all `None` (warmup); from index 13 the flat series yields
`Some(0.0)`, matching the `warmup_emits_at_warmup_period` and
`flat_market_oscillates_at_zero` unit tests.

### Python

```python
import numpy as np
import wickra as ta

# Flat market -> oscillator is zero once the 13-bar signal SMA fills.
flat = np.full(16, 50.0)
adosc = ta.ADOSC()
out = adosc.batch(flat, flat, flat)  # high, low, close
print('warmup:', adosc.warmup_period())
print('out[13]:', out[13])
```

Output:

```
warmup: 14
out[13]: 0.0
```

### Node

```javascript
const wickra = require('wickra');

const flat = Array.from({ length: 16 }, () => 50.0);
const adosc = new wickra.ADOSC();
const out = adosc.batch(flat, flat, flat); // high, low, close
console.log('out[13]:', out[13]);
```

Output:

```
out[13]: 0
```

### Streaming

```rust
use wickra::{AdOscillator, Candle, Indicator};

let mut adosc = AdOscillator::new();
let feed: Vec<Candle> = Vec::new(); // your live OHLCV candle feed
for bar in feed {
    if let Some(osc) = adosc.update(bar) {
        // osc > 0: accumulation is running ahead of its 13-bar average
        // osc < 0: distribution is. Watch zero-line crossings and divergences.
        let _ = osc;
    }
}
```

## Interpretation

1. **Zero line.** Because the signal SMA is subtracted, the oscillator is
   mean-reverting around zero. Crossings up through zero flag fresh accumulation;
   crossings down flag distribution.
2. **Volume-free.** Like the underlying Williams A/D line, this uses only
   high/low/close — useful for instruments where volume is poor or absent, where
   the Chaikin-style [`Adl`](/Indicators/Indicator-Adl) (volume-weighted) is not
   reliable.
3. **Divergence.** Price makes a new high while `ADOSC` makes a lower high →
   weakening accumulation, a classic divergence warning.
4. **Vs the cumulative line.** Use [`Wad`](/Indicators/Indicator-Wad) (the raw
   drifting line) for long-horizon divergence against price; use this oscillator
   for a bounded, zero-centred read of the same flow.

## Common pitfalls

- **Confusing it with the raw `Wad` line.** `Wad` drifts without bound; `ADOSC`
  is `Wad − SMA(Wad, 13)` and oscillates around zero. They answer different
  questions.
- **Confusing it with `Adl`.** `Adl` is the volume-weighted Chaikin A/D line;
  this oscillator is volume-less (Williams').
- **Reading the absolute level.** Only the sign, zero-line crossings and
  divergences carry signal — not the magnitude.

## References

- Larry Williams, *How I Made One Million Dollars Last Year Trading Commodities*
  (1973) — the volume-less Accumulation/Distribution line.

## See also

- [Wad](/Indicators/Indicator-Wad) — the raw cumulative Williams A/D line this
  oscillator is built from.
- [Adl](/Indicators/Indicator-Adl) — Chaikin's volume-weighted A/D line.
- [ChaikinMoneyFlow](/Indicators/Indicator-ChaikinMoneyFlow) — volume-normalized money-flow cousin.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
