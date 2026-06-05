# Volume Profile

> The full per-bin volume distribution over a rolling window — the raw histogram
> that [Value Area](/Indicators/Indicator-ValueArea) reduces to POC / VAH / VAL.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Market Profile |
| Input type | `Candle` (uses high, low, volume) |
| Output type | `VolumeProfileOutput { price_low, price_high, bins }` |
| Output range | `bins[i] >= 0`; sums to the window's total volume |
| Default parameters | `VolumeProfile::classic()` = 20-bar window, 50 bins |
| Warmup period | `period` |
| Interpretation | Where volume concentrated across price over the window. |

## Formula

Over the last `period` candles, the price domain spans the window's lowest low to
its highest high, split into `bin_count` equal buckets of width
`w = (price_high - price_low) / bin_count`:

```
bins[i] = Σ over candles of the volume attributed to bucket i
```

Each candle's volume is spread **uniformly** across the bins its `[low, high]`
range touches (a single-print bar with `low == high` drops its whole volume into
one bin) — the same bucketing convention as [`ValueArea`](/Indicators/Indicator-ValueArea).
Where `ValueArea` collapses this distribution to the Point of Control and Value
Area High/Low, `VolumeProfile` exposes the **entire histogram** for rendering or
post-processing. See `crates/wickra-core/src/indicators/volume_profile.rs`.

## Parameters

| Name        | Type    | Default | Valid range | Description |
|-------------|---------|---------|-------------|-------------|
| `period`    | `usize` | 20 (`classic`) | `>= 1` | Rolling window length in candles. `0` errors with `Error::PeriodZero`. |
| `bin_count` | `usize` | 50 (`classic`) | `>= 1` | Number of price buckets. `0` errors with `Error::PeriodZero`. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/volume_profile.rs`:

```rust
use wickra::{Candle, Indicator, VolumeProfile, VolumeProfileOutput};
// VolumeProfile: Input = Candle, Output = VolumeProfileOutput
const _: fn(&mut VolumeProfile, Candle) -> Option<VolumeProfileOutput> =
    <VolumeProfile as Indicator>::update;
```

`VolumeProfileOutput` carries `price_low: f64`, `price_high: f64` and
`bins: Vec<f64>` (length `bin_count`, lowest bucket first).

Python `update(candle)` returns `(price_low, price_high, bins_ndarray)` or `None`
during warmup; `batch(high, low, volume)` returns a `(n, bin_count + 2)` array
whose columns are `[price_low, price_high, bin_0, …]` (warmup rows are `NaN`).
Node `update(high, low, volume)` returns `{ priceLow, priceHigh, bins }` or
`null`; `batch` returns a flat `Array<number>` of `n * (bin_count + 2)`.

## Warmup

`VolumeProfile::new(period, bin_count).warmup_period() == period`. No value is
emitted until the rolling window holds `period` candles. The unit test
`warms_up_over_period` pins this.

## Edge cases

- **Single-print window.** If every bar in the window trades at one price
  (`price_high == price_low`), the domain collapses and all volume lands in bin 0.
  Pinned by `degenerate_single_price_window`.
- **Zero-volume bars.** Bars with zero volume contribute nothing to the
  histogram. Pinned by `zero_volume_bars_are_skipped`.
- **Volume conservation.** The bins always sum to the window's total volume
  (within floating-point tolerance). Pinned by `conserves_total_volume`.
- **Rolling eviction.** When a new candle arrives the oldest leaves the window,
  so the price domain and histogram only reflect the last `period` candles.
  Pinned by `rolling_window_drops_oldest`.
- **Reset.** `reset()` clears the window and last output. Pinned by
  `reset_clears_state`.

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, VolumeProfile};

fn flat(o: f64, h: f64, l: f64, c: f64, v: f64) -> Candle {
    Candle::new(o, h, l, c, v, 0).unwrap()
}

fn main() {
    let mut vp = VolumeProfile::new(2, 4).unwrap();
    vp.update(flat(10.0, 10.0, 10.0, 10.0, 100.0)); // seed (single print at 10)
    let out = vp.update(flat(10.0, 14.0, 10.0, 12.0, 80.0)).unwrap();
    println!("[{}, {}] {:?}", out.price_low, out.price_high, out.bins);
}
```

Output:

```
[10, 14] [120.0, 20.0, 20.0, 20.0]
```

Bar 0's 100 lands in bin 0 (price 10); bar 1 spans 10‑14 over all four bins, so
its 80 splits 20 per bin → `[120, 20, 20, 20]`. This matches the
`reference_distribution` unit test.

### Python

```python
import numpy as np
import wickra as ta

vp = ta.VolumeProfile(2, 4)
print(vp.update((10.0, 10.0, 10.0, 10.0, 100.0, 0)))  # None (warmup)
low, high, bins = vp.update((10.0, 14.0, 10.0, 12.0, 80.0, 1))
print(low, high, bins)
```

Output:

```
None
10.0 14.0 [120.  20.  20.  20.]
```

### Node

```javascript
const ta = require('wickra');
const vp = new ta.VolumeProfile(2, 4);
console.log(vp.update(10, 10, 100));        // null (warmup), args: high, low, volume
const out = vp.update(14, 10, 80);
console.log(out.priceLow, out.priceHigh, out.bins);
```

Output:

```
null
10 14 [ 120, 20, 20, 20 ]
```

### Streaming vs batch (Python)

```python
import numpy as np, wickra as ta

high = np.array([12.0, 13.0, 14.0, 15.0])
low = np.array([9.0, 10.0, 11.0, 12.0])
volume = np.array([30.0, 40.0, 50.0, 60.0])
profile = ta.VolumeProfile(4, 8).batch(high, low, volume)   # shape (4, 10)
assert profile.shape == (4, 8 + 2)
```

## Interpretation

The histogram's tallest bin is the Point of Control — the price the market most
agreed on over the window — and the contiguous bins around it that hold ~70% of
volume are the Value Area. Use [`ValueArea`](/Indicators/Indicator-ValueArea) when you only
need those summary levels; reach for `VolumeProfile` when you want to render the
full distribution, detect multi-modal (double-distribution) sessions, or compute
custom value-area percentages yourself. Low-volume "gaps" between high-volume
nodes often act as fast-travel zones for price.

## Common pitfalls

- **Reading bins without the price bounds.** A bin index is only meaningful with
  `price_low` / `price_high`: bin `i` covers
  `[price_low + i·w, price_low + (i+1)·w)` where `w = (price_high − price_low) / bin_count`.
- **Expecting a fixed price grid.** The domain is recomputed each bar from the
  window's low/high, so bin boundaries shift as the window rolls — bins are not
  comparable across timestamps by index alone.
- **Confusing it with TPO.** Volume Profile weights by traded volume;
  [`TpoProfile`](/Indicators/Indicator-TpoProfile) counts time at price and ignores volume.

## References

Market-profile volume distribution and the Point-of-Control / Value-Area concepts
originate with J. Peter Steidlmayer's Market Profile work at the CBOT (1980s).

## See also

- [Indicator-ValueArea](/Indicators/Indicator-ValueArea) — POC / VAH / VAL from this distribution.
- [Indicator-TpoProfile](/Indicators/Indicator-TpoProfile) — the time-based (volume-agnostic) profile.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
