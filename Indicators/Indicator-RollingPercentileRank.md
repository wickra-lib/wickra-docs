# RollingPercentileRank

> The percentile rank of the most-recent value within its trailing window, in
> `[0, 100]` — a self-normalising oscillator with no distributional assumption.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Statistics |
| Input type | `f64` |
| Output type | `f64` |
| Output range | `[0, 100]` |
| Default parameters | `period` is required |
| Warmup period | `period` |
| Interpretation | `50` = the latest value sits at the window median; high = stretched up, low = stretched down. |

## Formula

```
rank = 100 · (#below + 0.5 · #equal) / period
```

where `#below` counts window values strictly less than the current value and
`#equal` counts those equal to it (including the current value itself). This is
the "mean" method of `percentileofscore`: ties split symmetrically, so a flat
window scores exactly `50`, the strict maximum just under `100`, and the strict
minimum just over `0`.

Source: `crates/wickra-core/src/indicators/rolling_percentile_rank.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= 1`      | `rolling_percentile_rank.rs:48` | Window length. `0` errors with `Error::PeriodZero`. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/rolling_percentile_rank.rs`:

```rust
use wickra::{Indicator, RollingPercentileRank};
// RollingPercentileRank: Input = f64, Output = f64
const _: fn(&mut RollingPercentileRank, f64) -> Option<f64> =
    <RollingPercentileRank as Indicator>::update;
```

Python streams as `float | None`, batches as an `array.array('d')`. Node streams
as `number | null`, batches as `Array<number>`.

## Warmup

`warmup_period() == period`. The unit test `accessors_and_metadata` pins
`warmup_period() == 14` for `period = 14`.

## Edge cases

- **Flat window.** All-equal values score `50`; pinned by `flat_window_scores_fifty`.
- **Strict maximum.** `[1,2,3,4,5]` with current `5` scores `(4 + 0.5)/5 · 100 =
  90`; pinned by `current_is_strict_maximum`.
- **Strict minimum.** `[5,4,3,2,1]` with current `1` scores `10`; pinned by
  `current_is_strict_minimum`.
- **Bounds.** Output is always in `[0, 100]`; pinned by `output_within_bounds`.
- **Reset.** `reset()` clears the window.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, RollingPercentileRank};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut pr = RollingPercentileRank::new(5)?;
    let out: Vec<Option<f64>> = pr.batch(&[1.0, 2.0, 3.0, 4.0, 5.0]);
    println!("{:?}", out);
    Ok(())
}
```

Output:

```
[None, None, None, None, Some(90.0)]
```

### Python

```python
import wickra as ta

pr = ta.RollingPercentileRank(5)
for x in [1.0, 2.0, 3.0, 4.0, 5.0]:
    print(x, '->', pr.update(x))
```

Output:

```
1.0 -> None
2.0 -> None
3.0 -> None
4.0 -> None
5.0 -> 90.0
```

### Node

```javascript
const ta = require('wickra');
const pr = new ta.RollingPercentileRank(5);
for (const x of [1, 2, 3, 4, 5]) console.log(x, '->', pr.update(x));
```

Output:

```
1 -> null
2 -> null
3 -> null
4 -> null
5 -> 90
```

## Interpretation

Percentile rank turns any series into a bounded, self-normalising oscillator:
"where does today sit relative to its own recent history?" High readings mark
stretched extremes, mid readings the typical range. It is the distribution-free
cousin of [ZScore](/Indicators/Indicator-ZScore): no Gaussian assumption, just rank.

## Common pitfalls

- **Output is `[0, 100]`, not `[0, 1]`.** Divide by 100 if you need a fraction.
- **Cost.** Each `update` scans the window (`O(period)`).

## References

The "mean" tie-handling matches `scipy.stats.percentileofscore(kind='mean')`.

## See also

- [Indicator-ZScore](/Indicators/Indicator-ZScore) — the parametric analogue.
- [Indicator-RollingQuantile](/Indicators/Indicator-RollingQuantile) — the inverse mapping (rank → value).
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
