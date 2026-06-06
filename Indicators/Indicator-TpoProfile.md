# TPO Profile

> The Time-Price-Opportunity (market-profile "letter") distribution: a
> volume-agnostic count of how many periods traded at each price level.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Market Profile |
| Input type | `Candle` (uses high, low) |
| Output type | `TpoProfileOutput { price_low, price_high, counts }` |
| Output range | `counts[i]` is a non-negative integer count (as `f64`) |
| Default parameters | `TpoProfile::classic()` = 30-bar window, 50 bins |
| Warmup period | `period` |
| Interpretation | Where the market spent the most *time* over the window. |

## Formula

Over the last `period` candles, the price domain spans the window's lowest low to
its highest high, split into `bin_count` equal buckets of width
`w = (price_high - price_low) / bin_count`:

```
counts[i] = number of periods whose [low, high] range touches bucket i
```

Every period that trades at a price level contributes exactly **one** TPO mark
there — a full `+1` per touched bin, with **no volume weighting and no sharing**.
A wide-range bar marks every level it spans; a single-print bar marks one. This
is the classic Market Profile letter count: it highlights the prices the market
spent the most *time* at (the profile bell curve), in contrast to
[`VolumeProfile`](/Indicators/Indicator-VolumeProfile), which distributes *volume*. See
`crates/wickra-core/src/indicators/tpo_profile.rs`.

## Parameters

| Name        | Type    | Default | Valid range | Description |
|-------------|---------|---------|-------------|-------------|
| `period`    | `usize` | 30 (`classic`) | `>= 1` | Rolling window length in candles. `0` errors with `Error::PeriodZero`. |
| `bin_count` | `usize` | 50 (`classic`) | `>= 1` | Number of price buckets. `0` errors with `Error::PeriodZero`. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/tpo_profile.rs`:

```rust
use wickra::{Candle, Indicator, TpoProfile, TpoProfileOutput};
// TpoProfile: Input = Candle, Output = TpoProfileOutput
const _: fn(&mut TpoProfile, Candle) -> Option<TpoProfileOutput> =
    <TpoProfile as Indicator>::update;
```

`TpoProfileOutput` carries `price_low: f64`, `price_high: f64` and
`counts: Vec<f64>` (length `bin_count`, lowest bucket first).

Python `update(candle)` returns `(price_low, price_high, counts_ndarray)` or
`None`; `batch(high, low)` returns a `(n, bin_count + 2)` array with columns
`[price_low, price_high, count_0, …]` (`NaN` warmup rows). Node
`update(high, low)` returns `{ priceLow, priceHigh, counts }` or `null`; `batch`
returns a flat `Array<number>` of `n * (bin_count + 2)`. TPO ignores volume, so
the binding signatures take only high and low.

## Warmup

`TpoProfile::new(period, bin_count).warmup_period() == period`. No value is
emitted until the rolling window holds `period` candles. The unit test
`warms_up_over_period` pins this.

## Edge cases

- **Volume independence.** Identical ranges with wildly different volumes produce
  identical TPO counts — volume never enters the calculation. Pinned by
  `volume_independent`.
- **Single-print window.** If every bar trades at one price the domain collapses
  and bin 0 holds one mark per period. Pinned by `degenerate_single_price_window`.
- **Single-print bar in a wider domain.** A `low == high` bar marks exactly its
  own bin. Pinned by `single_print_bar_marks_one_bin`.
- **Reset.** `reset()` clears the window and last output. Pinned by
  `reset_clears_state`.

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, TpoProfile};

fn c(o: f64, h: f64, l: f64, cl: f64) -> Candle {
    Candle::new(o, h, l, cl, 1.0, 0).unwrap()
}

fn main() {
    let mut tpo = TpoProfile::new(2, 4).unwrap();
    tpo.update(c(12.0, 14.0, 10.0, 12.0)); // seed: spans 10..14
    let out = tpo.update(c(11.5, 12.0, 11.0, 11.5)).unwrap(); // spans 11..12
    println!("[{}, {}] {:?}", out.price_low, out.price_high, out.counts);
}
```

Output:

```
[10, 14] [1.0, 2.0, 2.0, 1.0]
```

Bar 0 touches all four bins (`+1` each); bar 1 spans only bins 1‑2 (`+1` each) →
`[1, 2, 2, 1]`. This matches the `reference_counts` unit test.

### Python

```python
import wickra as ta

tpo = ta.TpoProfile(2, 4)
print(tpo.update((12.0, 14.0, 10.0, 12.0, 5.0, 0)))   # None (warmup)
low, high, counts = tpo.update((11.5, 12.0, 11.0, 11.5, 999.0, 1))
print(low, high, counts)  # volume (999) is ignored
```

Output:

```
None
10.0 14.0 [1. 2. 2. 1.]
```

### Node

```javascript
const ta = require('wickra');
const tpo = new ta.TpoProfile(2, 4);
console.log(tpo.update(14, 10));     // null (warmup), args: high, low
const out = tpo.update(12, 11);
console.log(out.priceLow, out.priceHigh, out.counts);
```

Output:

```
null
10 14 [ 1, 2, 2, 1 ]
```

### Streaming vs batch (Python)

```python
import numpy as np, wickra as ta

high = np.array([12.0, 13.0, 14.0, 15.0])
low = np.array([9.0, 10.0, 11.0, 12.0])
counts = ta.TpoProfile(4, 8).batch(high, low)   # shape (4, 10)
assert counts.shape == (4, 8 + 2)
```

## Interpretation

The TPO profile's mode (the longest row of letters) is the time-based Point of
Control — the fairest price by *acceptance*, where the market lingered longest.
Read alongside [`VolumeProfile`](/Indicators/Indicator-VolumeProfile): when the time-POC and
volume-POC diverge, time was spent at one price while volume transacted at
another, often flagging absorption or a developing imbalance. Because TPO ignores
volume it is robust on instruments with unreliable or missing volume data.

## Common pitfalls

- **Treating counts as volume.** A tall TPO bin means *many periods* traded
  there, not high volume. For volume use [`VolumeProfile`](/Indicators/Indicator-VolumeProfile).
- **Comparing bin indices across time.** As with Volume Profile, the price domain
  is recomputed each bar from the window low/high, so bin boundaries shift; use
  `price_low` / `price_high` to interpret a bin.
- **Period as TPO bracket length.** `period` is the rolling lookback in candles,
  not a session/bracket definition — each candle contributes one TPO mark per
  level it touched.

## References

Time-Price-Opportunity charts and the Market Profile are due to J. Peter
Steidlmayer (Chicago Board of Trade, 1980s); the letter-per-time-bracket
construction is the canonical Market Profile representation.

## See also

- [Indicator-VolumeProfile](/Indicators/Indicator-VolumeProfile) — the volume-weighted profile.
- [Indicator-ValueArea](/Indicators/Indicator-ValueArea) — POC / VAH / VAL summary levels.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
