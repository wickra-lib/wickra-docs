# TickBars

> Activity-sampled OHLCV bars — one bar per fixed number of input candles (ticks).

## Quick reference

| Field | Value |
|-------|-------|
| Family | Alt-Chart Bars |
| Trait | `BarBuilder` (not `Indicator`) |
| Input type | `Candle` |
| Output type | `Vec<TickBar>` (0 or 1 bar per candle) |
| Bar element | `TickBar { open, high, low, close, volume }` |
| Default parameters | `(ticks = 100)` |
| Warmup | none (emits once `ticks` candles accumulate) |
| Interpretation | Each bar = equal trade count, not equal clock time. |

## Formula

```
open   = first candle's open in the group
high   = max(high) across the group
low    = min(low) across the group
close  = last candle's close in the group
volume = Σ volume across the group
emit one bar every `ticks` candles
```

Time bars sample the market on a clock; tick bars sample it on *activity* by
grouping a fixed number of trades (modelled here as candles). In fast markets a tick
bar closes quickly; in quiet markets it lingers — so each bar carries roughly equal
information. This is the simplest information-driven bar type; the
[`VolumeBars`](/Indicators/Indicator-VolumeBars) and
[`DollarBars`](/Indicators/Indicator-DollarBars) builders extend the idea to equal
traded volume and equal traded value. Source:
`crates/wickra-core/src/indicators/tick_bars.rs`.

## Parameters

| Name    | Type    | Default | Valid range | Source | Description |
|---------|---------|---------|-------------|--------|-------------|
| `ticks` | `usize` | `100`   | `>= 1`      | `tick_bars.rs:62` | Candles per bar. `0` errors with `Error::PeriodZero`. |

The `ticks` and `count` getters expose the configuration and in-progress group size.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/tick_bars.rs`:

```rust
use wickra::{BarBuilder, Candle, TickBars};
// TickBars: Input = Candle, Output = Vec<TickBar>
const _: fn(&mut TickBars, Candle) -> Vec<TickBar> = <TickBars as BarBuilder>::update;
```

A `Candle` in, a `Vec<TickBar>` out (empty until `ticks` candles accumulate). In the
bindings, tick bars take full OHLCV: Python `update(open, high, low, close, volume)
-> list[tuple]`; Node `update(open, high, low, close, volume) -> TickBar[]`. There is
no `warmupPeriod`/`isReady`.

## Edge cases

- **Emit cadence.** A bar completes exactly every `ticks` candles
  (`emits_every_n_candles` pins this).
- **OHLCV aggregation.** Open = first, high = max, low = min, close = last, volume =
  sum (`aggregates_ohlcv` pins this).
- **Partial group.** Fewer than `ticks` candles emits nothing
  (`partial_group_emits_nothing` pins this).
- **Reset.** `reset()` discards the in-progress group (`reset_clears_state` pins this).
- **Batch.** `batch` concatenates completed bars; length is data-dependent
  (`batch_concatenates_completed_bars` pins this).

## Examples

### Rust

```rust
use wickra::{BarBuilder, Candle, TickBars};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let c = |o, h, l, cl, v| Candle::new(o, h, l, cl, v, 0).unwrap();
    let mut bars = TickBars::new(3)?;
    bars.update(c(10.0, 11.0, 9.0, 10.5, 100.0));
    bars.update(c(10.5, 12.0, 10.0, 11.0, 150.0));
    let out = bars.update(c(11.0, 11.5, 10.8, 11.2, 120.0));
    println!("{:?}", out[0].volume); // 370.0
    Ok(())
}
```

Output:

```
370.0
```

### Python

```python
import wickra as ta

bars = ta.TickBars(3)
bars.update(10.0, 11.0, 9.0, 10.5, 100.0)
bars.update(10.5, 12.0, 10.0, 11.0, 150.0)
print(bars.update(11.0, 11.5, 10.8, 11.2, 120.0))
# [(10.0, 12.0, 9.0, 11.2, 370.0)]
```

### Node

```javascript
const ta = require('wickra');
const bars = new ta.TickBars(3);
bars.update(10.0, 11.0, 9.0, 10.5, 100.0);
bars.update(10.5, 12.0, 10.0, 11.0, 150.0);
console.log(bars.update(11.0, 11.5, 10.8, 11.2, 120.0)[0].volume); // 370
```

### Streaming

```rust
use wickra::{BarBuilder, Candle, TickBars};

let mut bars = TickBars::new(100).unwrap();
for candle in feed {
    for bar in bars.update(candle) {
        // bar summarises 100 ticks of activity
    }
}
```

`batch` is equivalent to replaying `update` candle-by-candle and concatenating
(`batch_concatenates_completed_bars` pins this).

## Interpretation

1. **Equal-information sampling.** López de Prado argues tick bars have better
   statistical properties (closer to i.i.d. returns) than time bars — useful as ML
   features.
2. **Microstructure-aware.** Because bar count tracks trade count, tick bars reveal
   bursts of activity that time bars smear across a fixed interval.
3. **Building block.** Run any close-based indicator on tick-bar closes to get an
   activity-clock version of it.

## Common pitfalls

- **Candle ≈ tick.** This builder treats each input candle as one "tick"; for true
  trade-level bars, feed one candle per trade.
- **`ticks` sizing.** Match it to the instrument's trade frequency, or bars will be
  too coarse or too fine.
- **Not an `Indicator`.** No warmup, emits a `Vec`, cannot join a `Chain`.

## References

López de Prado, M. (2018), *Advances in Financial Machine Learning*, ch. 2 —
information-driven bars (tick, volume, dollar).

## See also

- [Indicator-VolumeBars](/Indicators/Indicator-VolumeBars) — equal traded volume.
- [Indicator-DollarBars](/Indicators/Indicator-DollarBars) — equal traded value.
- [Indicator-ImbalanceBars](/Indicators/Indicator-ImbalanceBars) — order-flow imbalance.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
