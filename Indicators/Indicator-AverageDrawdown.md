# Average Drawdown

> The mean **maximum depth** of the distinct drawdown episodes inside a rolling
> window. Each stretch where equity is below its running peak is one episode; the
> indicator averages those episodes' worst depths — the conventional "average
> drawdown", distinct from the per-bar Pain Index.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Risk / Performance |
| Input type | `f64` — one equity-curve sample per update |
| Output type | `f64` — non-negative fraction of peak |
| Output range | `[0, 1)` (`0.05` ≈ 5 % mean episode depth) |
| Default parameters | `period` required |
| Warmup period | `period` |
| Interpretation | Average worst depth across separate drawdowns in the window |

## Formula

```text
episode opens  when equity < running peak
episode closes when equity reaches a new peak (full recovery)
depth(episode) = (episode_peak − episode_trough) / episode_peak
AvgDD          = mean(depth over the episodes in the window)   (0 if no drawdown)
```

The window is scanned once. A running peak is tracked; the first bar that dips
below it opens an episode, recording the peak and following the trough down. When
equity makes a new high the episode closes and its depth `(peak − trough) / peak`
is booked. An episode still open at the window's right edge is booked at its
current trough. The result is the **mean of those episode depths**.

This is distinct from the [`PainIndex`](/Indicators/Indicator-PainIndex), which
averages the under-water fraction at *every* bar — so a long shallow drawdown
weighs more there than here. It is also distinct from
[`MaxDrawdown`](/Indicators/Indicator-MaxDrawdown) (the single worst depth).

See `crates/wickra-core/src/indicators/average_drawdown.rs` (the episode scan is
at `average_drawdown.rs:77`).

## Parameters

| Name | Type | Default | Valid range | Source | Description |
|------|------|---------|-------------|--------|-------------|
| `period` | `usize` | none | `>= 1` | `average_drawdown.rs:40`, `:51` | Rolling window length over the equity curve. `period = 0` errors with `Error::PeriodZero`. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/average_drawdown.rs`:

```rust
use wickra::{AverageDrawdown, Indicator};
// AverageDrawdown: Input = f64, Output = f64
const _: fn(&mut AverageDrawdown, f64) -> Option<f64> = <AverageDrawdown as Indicator>::update;
```

Python streams as `float | None` and batches `AverageDrawdown(period).batch(prices)`
to a 1-D `numpy.ndarray` (`NaN` for warmup). Node streams as `number | null` via
`update(value)` and batches `batch(prices)`.

## Warmup

`AverageDrawdown::new(period).warmup_period() == period`. The first output lands
once the window holds `period` samples; before that, `update` returns `None`. The
unit test `accessors_and_metadata` pins `warmup_period() == period` (10).

## Edge cases

- **Pure uptrend.** Equity that only rises has no episode → `AvgDD = 0`
  throughout. Unit test `pure_uptrend_yields_zero`.
- **Single episode.** Window `[100, 120, 90, 110]` opens one episode at the peak
  `120`; the trough `90` gives depth `(120 − 90)/120 = 0.25`, and `110` stays
  inside the same (unrecovered) episode without deepening it → `0.25`. Unit test
  `reference_value`.
- **Multiple episodes averaged.** `[100, 90, 100, 80, 100]` has two episodes
  (depths `0.10` and `0.20`) → mean `0.15` (where the Pain Index would instead
  weight every under-water bar). Unit test `averages_distinct_episodes`.
- **Non-finite input.** `NaN`/`infinity` are dropped (return `None`, no state
  change). Unit test `ignores_non_finite_input`.
- **Non-positive peak.** An all-zero (or negative) window cannot form a valid
  fractional depth → `0`. Unit test `non_positive_peak_yields_zero`.
- **Zero period.** `AverageDrawdown::new(0)` returns `Err(Error::PeriodZero)`.
  Unit test `rejects_zero_period`.
- **Reset.** `reset()` clears the rolling window. Unit test `reset_clears_state`.

## Examples

### Rust

```rust
use wickra::{AverageDrawdown, BatchExt, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // One episode: peak 120, trough 90 -> depth (120-90)/120 = 0.25.
    let mut adv = AverageDrawdown::new(4)?;
    let out = adv.batch(&[100.0, 120.0, 90.0, 110.0]);
    println!("{:?}", out);

    // Two distinct episodes (depths 0.10 and 0.20) -> mean 0.15.
    let mut adv2 = AverageDrawdown::new(5)?;
    println!("{:?}", adv2.batch(&[100.0, 90.0, 100.0, 80.0, 100.0]).last());
    Ok(())
}
```

Output:

```
[None, None, None, Some(0.25)]
Some(Some(0.15))
```

The first three samples are warmup (`None`); `out[3] = 0.25` matches the
`reference_value` unit test, and the two-episode mean `0.15` matches
`averages_distinct_episodes`.

### Python

```python
import wickra as ta

adv = ta.AverageDrawdown(4)
print(adv.batch([100.0, 120.0, 90.0, 110.0])[-1])  # 0.25
```

Output:

```
0.25
```

### Node

```javascript
const wickra = require('wickra');

const adv = new wickra.AverageDrawdown(4);
console.log(adv.batch([100, 120, 90, 110])[3]); // 0.25
```

Output:

```
0.25
```

### Streaming

```rust
use wickra::{AverageDrawdown, Indicator};

let mut adv = AverageDrawdown::new(252).unwrap();
let equity_feed: Vec<f64> = Vec::new(); // your equity-curve feed
for equity in equity_feed {
    if let Some(v) = adv.update(equity) {
        // v is the mean episode depth over the trailing year
        let _ = v;
    }
}
```

## Interpretation

1. **Typical episode depth.** Where `MaxDrawdown` reports the single worst dip,
   `AverageDrawdown` reports how deep a *typical* drawdown runs — useful for
   sizing expectations rather than worst-case capital.
2. **Vs Pain Index.** The Pain Index averages the under-water fraction over every
   bar, so it rises with both depth *and* duration; `AverageDrawdown` averages
   only the per-episode worst depths, so a long shallow slump weighs less here.
3. **Pair with MaxDrawdown.** "Worst 20 % / typical 6 %" tells a fuller risk
   story than either number alone.

## Common pitfalls

- **Treating it as the Pain Index.** They are now distinct: episode-mean depth vs
  per-bar mean under-water fraction.
- **Confusing it with `MaxDrawdown`.** Average ≠ maximum; two curves with the
  same max can have very different averages.
- **Short windows forget.** A window shorter than your drawdown-and-recovery
  cycle drops past episodes out of the average.

## References

- Standard performance-analytics "average drawdown" — the mean of separate
  drawdown episodes' depths; see Bacon, C. (2008), *Practical Portfolio
  Performance Measurement and Attribution*.

## See also

- [PainIndex](/Indicators/Indicator-PainIndex) — per-bar mean under-water fraction.
- [MaxDrawdown](/Indicators/Indicator-MaxDrawdown) — single worst depth.
- [UlcerIndex](/Indicators/Indicator-UlcerIndex) — RMS of the under-water series.
- [DrawdownDuration](/Indicators/Indicator-DrawdownDuration) — time spent under water.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
