# HasbrouckInformationShare

> Each venue's contribution to price discovery — the share of total return variance
> carried by the first of two synchronised price series.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Microstructure |
| Input type | `(f64, f64)` (two venue prices) |
| Output type | `f64` |
| Output range | `[0, 1]` (share of venue x) |
| Default parameters | `(period = 20)` (Python) |
| Warmup period | `period + 1` |
| Interpretation | `> 0.5` venue x leads price discovery; `< 0.5` follows. |

## Formula

```
rx_t = x_t − x_{t−1},  ry_t = y_t − y_{t−1}
IS_x = var(rx) / ( var(rx) + var(ry) )      over the window, ∈ [0, 1]
```

When the same instrument trades on multiple venues, Hasbrouck's information share
measures how much each contributes to the common efficient price; the venue whose
innovations carry more variance leads. This streaming form is the **variance-ratio
proxy** — the fraction of total return variance from series `x`. Above `0.5` = `x`
leads. The full measure fits a VECM and reports Cholesky-ordering bounds; this
proxy captures the leading idea without the VECM. Source:
`crates/wickra-core/src/indicators/hasbrouck_information_share.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `20` (Python) | `>= 2`      | `hasbrouck_information_share.rs:55` | Rolling window of return pairs. `< 2` errors with `Error::InvalidPeriod`. |

The `period` getter returns the window.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/hasbrouck_information_share.rs`:

```rust
use wickra::{Indicator, HasbrouckInformationShare};
// HasbrouckInformationShare: Input = (f64, f64), Output = f64
const _: fn(&mut HasbrouckInformationShare, (f64, f64)) -> Option<f64> =
    <HasbrouckInformationShare as Indicator>::update;
```

A `(f64, f64)` price pair in, an `Option<f64>` out. The Python binding takes
`update(x, y)` and `batch(x[], y[])` (NaN warmup); Node mirrors `update(x, y)` /
`batch(...)`.

## Warmup

`warmup_period() == period + 1`. One pair seeds the prior level; `period` returns
fill the variance window (`warmup_needs_period_plus_one` pins this).

## Edge cases

- **Loud venue leads.** A far more volatile `x` holds nearly all the share
  (`loud_venue_leads` pins this).
- **Bounded.** The reading stays in `[0, 1]` (`equal_venues_split_evenly` pins
  this).
- **Flat series → 0.5.** Zero variance on both reports the neutral `0.5`
  (`flat_series_is_half` pins this).
- **Reset.** `h.reset()` clears the prior level, the window and the running sums
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, HasbrouckInformationShare};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut h = HasbrouckInformationShare::new(20)?;
    let pairs: Vec<(f64, f64)> = (0..40)
        .map(|i| ((f64::from(i) * 0.5).sin() * 10.0, (f64::from(i) * 0.5).sin() * 1.0))
        .collect();
    println!("x share > 0.8: {}", h.batch(&pairs).last().unwrap().unwrap() > 0.8);
    Ok(())
}
```

Output:

```
x share > 0.8: true
```

### Python

```python
import numpy as np
import wickra as ta

h = ta.HasbrouckInformationShare(20)
x = np.sin(np.arange(40) * 0.5) * 10
y = np.sin(np.arange(40) * 0.5) * 1
print(h.batch(x, y)[-1])  # near 1.0
```

### Node

```javascript
const ta = require('wickra');
const h = new ta.HasbrouckInformationShare(20);
console.log('warmupPeriod:', h.warmupPeriod()); // 21
```

### Streaming

```rust
use wickra::{Indicator, HasbrouckInformationShare};

let mut h = HasbrouckInformationShare::new(20).unwrap();
let price_feed: Vec<(f64, f64)> = Vec::new(); // your live stream
for (venue_a, venue_b) in price_feed {
    if let Some(share) = h.update((venue_a, venue_b)) {
        // share > 0.5 -> venue_a is leading price discovery
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Lead/lag venue.** A persistent share above `0.5` identifies the price-leading
   market; route or hedge accordingly.
2. **Fragmentation monitoring.** Shifts in the share track changes in where price
   discovery happens (e.g. liquidity migrating venues).
3. **Spot vs. derivative.** Apply to a spot/futures pair to see which leads.

## Common pitfalls

- **Proxy, not full Hasbrouck.** This is the variance-ratio approximation; it omits
  the VECM cointegration step and the upper/lower bounds.
- **Synchronisation.** The two series must be aligned in time; stale quotes bias the
  share.
- **Same asset.** It assumes the two prices track one efficient price; unrelated
  series make the share meaningless.

## References

Hasbrouck, J. (1995), "One Security, Many Markets: Determining the Contributions to
Price Discovery", *Journal of Finance*.

## See also

- [Indicator-LeadLagCrossCorrelation](/Indicators/Indicator-LeadLagCrossCorrelation) — cross-correlation lead/lag.
- [Indicator-Cointegration](/Indicators/Indicator-Cointegration) — long-run price linkage.
- [Indicator-RollingCorrelation](/Indicators/Indicator-RollingCorrelation) — rolling return correlation.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
