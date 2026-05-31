# DoubleBollinger

> Two concentric Bollinger envelopes (Kathy Lien). The narrow `±k_inner·σ`
> band partitions price into buy / neutral / sell zones; the wide
> `±k_outer·σ` band marks extended moves to fade or trail.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Bands & Channels |
| Input type | `f64` (typically the close price) |
| Output type | `DoubleBollingerOutput { upper_outer, upper_inner, middle, lower_inner, lower_outer }` |
| Output range | unbounded; `lower_outer ≤ lower_inner ≤ middle ≤ upper_inner ≤ upper_outer` |
| Default parameters | `period = 20`, `k_inner = 1.0`, `k_outer = 2.0` |
| Warmup period | `period` (exact) |
| Interpretation | Three-zone setup: close above `upper_inner` = buy, between inner bands = neutral, below `lower_inner` = sell. Outer band marks exhaustion. |

## Formula

```
middle      = SMA(period)
sigma       = population stddev over the window
upper_outer = middle + k_outer · sigma          // wide channel (often 2σ)
upper_inner = middle + k_inner · sigma          // narrow channel (often 1σ)
lower_inner = middle − k_inner · sigma
lower_outer = middle − k_outer · sigma
```

`k_outer > k_inner` is enforced by the constructor so the outer band
strictly encloses the inner band and the five outputs remain monotonically
ordered. Internally the indicator runs one [`BollingerBands`](Indicator-BollingerBands)
at the *outer* multiplier and reconstructs the inner band from the same
`stddev` — so the two channels share an identical midline and sigma.

## Parameters

| Name      | Type    | Default | Constraint                | Source |
|-----------|---------|---------|---------------------------|--------|
| `period`  | `usize` | `20`    | `>= 1`                    | `DoubleBollinger::new` (`double_bollinger.rs:72`) |
| `k_inner` | `f64`   | `1.0`   | finite, `> 0`, `< k_outer` | `double_bollinger.rs:73` |
| `k_outer` | `f64`   | `2.0`   | finite, `> k_inner`        | `double_bollinger.rs:76` |

`period == 0` returns [`Error::PeriodZero`]; a non-finite or non-positive
multiplier returns [`Error::NonPositiveMultiplier`]; `k_outer <= k_inner`
returns [`Error::InvalidPeriod`]. `DoubleBollinger::classic()` returns
`(20, 1.0, 2.0)`. Python defaults come from
`#[pyo3(signature = (period=20, k_inner=1.0, k_outer=2.0))]`; the Node
constructor takes all three arguments explicitly.

## Inputs / Outputs

```rust
use wickra::{Indicator, DoubleBollinger, DoubleBollingerOutput};
// DoubleBollinger: Input = f64, Output = DoubleBollingerOutput
const _: fn(&mut DoubleBollinger, f64) -> Option<DoubleBollingerOutput> = <DoubleBollinger as Indicator>::update;
```

- **Python streaming.** `update(value)` returns
  `(upper_outer, upper_inner, middle, lower_inner, lower_outer)` or `None`.
- **Python batch.** `DoubleBollinger.batch(prices)` returns an `(n, 5)`
  `np.ndarray` with columns `[upper_outer, upper_inner, middle, lower_inner, lower_outer]`;
  warmup rows are `NaN`.
- **Node streaming.** `update(value)` returns a
  `{ upperOuter, upperInner, middle, lowerInner, lowerOuter }` object or `null`.
- **Node batch.** `batch(prices)` returns a flat `Array<number>` of length
  `n * 5`, interleaved in the same column order.

## Warmup

`warmup_period()` delegates to the inner [`BollingerBands`](Indicator-BollingerBands),
which returns `period`. The first non-`None` output lands on input `period`
(index `period − 1`), exactly when the underlying SMA + stddev are defined.

## Edge cases

- **Constant series.** Zero dispersion collapses all five bands onto the
  constant midline (test `constant_series_collapses_all_bands`).
- **Inner-band identity.** The inner band equals running a separate
  [`BollingerBands`](Indicator-BollingerBands) at `k_inner` (test
  `inner_band_matches_separate_bollinger`).
- **Ordering.** With dispersion, `upper_outer ≥ upper_inner ≥ middle ≥
  lower_inner ≥ lower_outer` strictly holds (test
  `bands_strictly_ordered_with_dispersion`).
- **Reset.** `reset()` clears the inner Bollinger state and restarts warmup.

## Examples

### Rust

```rust
use wickra::{BatchExt, DoubleBollinger, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prices: Vec<f64> = (0..40)
        .map(|i| 100.0 + (f64::from(i) * 0.3).sin() * 6.0)
        .collect();
    let mut db = DoubleBollinger::classic(); // (20, 1.0, 2.0)
    if let Some(o) = db.batch(&prices).into_iter().flatten().last() {
        println!(
            "{:.2} {:.2} {:.2} {:.2} {:.2}",
            o.upper_outer, o.upper_inner, o.middle, o.lower_inner, o.lower_outer
        );
    }
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

db = ta.DoubleBollinger(20, 1.0, 2.0)
prices = 100.0 + np.sin(np.arange(40) * 0.3) * 6.0
bands = db.batch(prices)  # shape (n, 5)
# columns: upper_outer, upper_inner, middle, lower_inner, lower_outer
```

### Node

```javascript
const ta = require('wickra');
const db = new ta.DoubleBollinger(20, 1.0, 2.0);
const out = db.update(104.2);
// null during warmup, else
// { upperOuter, upperInner, middle, lowerInner, lowerOuter }
```

## Interpretation

Lien's framework partitions price into three zones using the *inner* band:

- **Buy zone:** close above `upper_inner`.
- **Neutral zone:** close between `lower_inner` and `upper_inner`.
- **Sell zone:** close below `lower_inner`.

Trades are held while the close stays in the buy/sell zone and exited when
it falls back into neutral. The *outer* band marks an extended move:
a close beyond it is the point to take partial profit or trail rather than
add. Because both channels share one midline and sigma, the zones move
together and never cross.

## Common pitfalls

- **Setting `k_outer ≤ k_inner`.** The constructor rejects it — the outer
  band must strictly enclose the inner band for the zone interpretation to
  hold.
- **Treating the outer-band touch as an entry.** In Lien's system the outer
  band is an *exhaustion/trail* signal, not an entry; entries trigger on the
  inner band.

## References

- Kathy Lien, *Day Trading and Swing Trading the Currency Market*, 3rd ed.,
  Wiley, 2015 (the "Double Bollinger Bands" strategy chapter), and her
  widely-circulated BabyPips article series on the same setup.

## See also

- [BollingerBands](Indicator-BollingerBands) — single-envelope sibling.
- [BollingerBandwidth](Indicator-BollingerBandwidth) — squeeze detection.
- [PercentB](Indicator-PercentB) — normalised position within a single
  Bollinger envelope.
