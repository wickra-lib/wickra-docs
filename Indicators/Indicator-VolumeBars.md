# VolumeBars

> Equal-participation OHLCV bars — one bar per fixed amount of traded volume.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Alt-Chart Bars |
| Trait | `BarBuilder` (not `Indicator`) |
| Input type | `Candle` |
| Output type | `Vec<VolumeBar>` (0 or 1 bar per candle) |
| Bar element | `VolumeBar { open, high, low, close, volume }` |
| Default parameters | `(volume_per_bar = 1000.0)` |
| Warmup | none (emits once accumulated volume reaches the threshold) |
| Interpretation | Each bar = equal traded quantity. |

## Formula

```
accumulate OHLC + volume across candles
when Σ volume >= volume_per_bar  -> close the bar (overshoot kept), start fresh
```

Where [`TickBars`](/Indicators/Indicator-TickBars) sample on trade *count*, volume
bars sample on traded *quantity*: a bar closes once the candles fed into it have
accumulated at least `volume_per_bar` of volume. Each bar then carries roughly equal
participation, de-emphasising quiet periods and resolving heavy-trading bursts into
more bars. The companion [`DollarBars`](/Indicators/Indicator-DollarBars) builder
uses traded *value* (`price × volume`), which is more robust to price-level drift
over long histories. Source: `crates/wickra-core/src/indicators/volume_bars.rs`.

## Parameters

| Name             | Type  | Default  | Valid range    | Source | Description |
|------------------|-------|----------|----------------|--------|-------------|
| `volume_per_bar` | `f64` | `1000.0` | finite, `> 0`  | `volume_bars.rs:60` | Volume threshold per bar. Non-finite or non-positive errors with `Error::InvalidPeriod`. |

The `volume_per_bar` and `accumulated` getters expose the configuration and the
in-progress volume.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/volume_bars.rs`:

```rust
use wickra::{BarBuilder, Candle, VolumeBar, VolumeBars};
// VolumeBars: Input = Candle, Output = Vec<VolumeBar>
const _: fn(&mut VolumeBars, Candle) -> Vec<VolumeBar> = <VolumeBars as BarBuilder>::update;
```

A `Candle` in, a `Vec<VolumeBar>` out (empty until the volume threshold is reached).
Bindings take full OHLCV: Python `update(open, high, low, close, volume) ->
list[tuple]`; Node `update(open, high, low, close, volume) -> VolumeBar[]`. No
`warmupPeriod`/`isReady`.

## Edge cases

- **Threshold close.** A bar closes once accumulated volume reaches the threshold,
  overshoot included (`closes_when_threshold_reached` pins this).
- **OHLC aggregation.** Open = first, high = max, low = min, close = last
  (`aggregates_ohlc` pins this).
- **Below threshold.** Volume short of the threshold emits nothing
  (`below_threshold_emits_nothing` pins this).
- **Reset.** `reset()` discards the in-progress bar (`reset_clears_state` pins this).
- **Batch.** `batch` concatenates completed bars; length is data-dependent
  (`batch_concatenates_completed_bars` pins this).

## Examples

### Rust

```rust
use wickra::{BarBuilder, Candle, VolumeBars};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let c = |cl, v| Candle::new(cl, cl, cl, cl, v, 0).unwrap();
    let mut bars = VolumeBars::new(100.0)?;
    bars.update(c(10.0, 60.0));
    let out = bars.update(c(10.5, 60.0)); // 120 >= 100
    println!("{:?}", out[0].volume); // 120.0
    Ok(())
}
```

Output:

```
120.0
```

### Python

```python
import wickra as ta

bars = ta.VolumeBars(100.0)
bars.update(10.0, 10.0, 10.0, 10.0, 60.0)
print(bars.update(10.5, 10.5, 10.5, 10.5, 60.0))
# [(10.0, 10.5, 10.0, 10.5, 120.0)]
```

### Node

```javascript
const ta = require('wickra');
const bars = new ta.VolumeBars(100.0);
bars.update(10.0, 10.0, 10.0, 10.0, 60.0);
console.log(bars.update(10.5, 10.5, 10.5, 10.5, 60.0)[0].volume); // 120
```

### Streaming

```rust
use wickra::{BarBuilder, Candle, VolumeBars};

let mut bars = VolumeBars::new(1000.0).unwrap();
let feed: Vec<Candle> = Vec::new(); // your live stream
for candle in feed {
    for bar in bars.update(candle) {
        // each bar represents ~1000 units of traded volume
    }
}
```

`batch` is equivalent to replaying `update` candle-by-candle and concatenating
(`batch_concatenates_completed_bars` pins this).

## Interpretation

1. **Better return statistics.** Volume bars produce returns closer to i.i.d. than
   time bars — a recurring theme in financial machine learning.
2. **Liquidity lens.** A cluster of volume bars in a short span signals a liquidity
   event; their scarcity marks dead periods.
3. **Drift caveat.** Over years the same volume buys very different value as price
   rises — switch to [`DollarBars`](/Indicators/Indicator-DollarBars) for long
   backtests.

## Common pitfalls

- **Candle-granular.** At most one bar closes per candle; for finer resolution feed
  one candle per trade.
- **Overshoot.** The closing bar keeps the crossing candle's excess volume, so bar
  volumes are `>= volume_per_bar`, not exactly equal.
- **Not an `Indicator`.** No warmup, emits a `Vec`, cannot join a `Chain`.

## References

López de Prado, M. (2018), *Advances in Financial Machine Learning*, ch. 2 —
information-driven bars.

## See also

- [Indicator-TickBars](/Indicators/Indicator-TickBars) — equal trade count.
- [Indicator-DollarBars](/Indicators/Indicator-DollarBars) — equal traded value.
- [Indicator-ImbalanceBars](/Indicators/Indicator-ImbalanceBars) — order-flow imbalance.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
