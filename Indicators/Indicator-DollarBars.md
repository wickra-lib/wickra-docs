# DollarBars

> Drift-robust OHLC bars — one bar per fixed amount of traded *value* (`price ×
> volume`).

## Quick reference

| Field | Value |
|-------|-------|
| Family | Alt-Chart Bars |
| Trait | `BarBuilder` (not `Indicator`) |
| Input type | `Candle` |
| Output type | `Vec<DollarBar>` (0 or 1 bar per candle) |
| Bar element | `DollarBar { open, high, low, close, volume, dollar }` |
| Default parameters | `(dollar_per_bar = 50000.0)` |
| Warmup | none (emits once accumulated value reaches the threshold) |
| Interpretation | Each bar = equal traded value. |

## Formula

```
accumulate OHLC, volume, and dollar = Σ (close · volume)
when dollar >= dollar_per_bar  -> close the bar (overshoot kept), start fresh
```

Dollar bars are the most drift-robust information-driven bar type. Where
[`VolumeBars`](/Indicators/Indicator-VolumeBars) close on a fixed *quantity*, dollar
bars close on a fixed *value*: each candle contributes `close × volume` to the
running total. As price levels rise over years a fixed share count buys ever more
value, so volume bars drift in meaning; dollar bars stay economically comparable
across the whole history — the preferred sampling for long backtests and ML
features. Source: `crates/wickra-core/src/indicators/dollar_bars.rs`.

## Parameters

| Name             | Type  | Default    | Valid range   | Source | Description |
|------------------|-------|------------|---------------|--------|-------------|
| `dollar_per_bar` | `f64` | `50000.0`  | finite, `> 0` | `dollar_bars.rs:62` | Traded-value threshold per bar. Non-finite or non-positive errors with `Error::InvalidPeriod`. |

The `dollar_per_bar` and `accumulated` getters expose the configuration and the
in-progress value.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/dollar_bars.rs`:

```rust
use wickra::{BarBuilder, Candle, DollarBars};
// DollarBars: Input = Candle, Output = Vec<DollarBar>
const _: fn(&mut DollarBars, Candle) -> Vec<DollarBar> = <DollarBars as BarBuilder>::update;
```

A `Candle` in, a `Vec<DollarBar>` out (empty until the value threshold is reached).
Bindings take full OHLCV: Python `update(open, high, low, close, volume) ->
list[tuple]`; Node `update(open, high, low, close, volume) -> DollarBar[]`. No
`warmupPeriod`/`isReady`.

## Edge cases

- **Value close.** A bar closes once accumulated `close × volume` reaches the
  threshold, overshoot included (`closes_when_value_reached` pins this).
- **OHLC aggregation.** Open = first, high = max, low = min, close = last
  (`aggregates_ohlc` pins this).
- **Below threshold.** Value short of the threshold emits nothing
  (`below_threshold_emits_nothing` pins this).
- **Reset.** `reset()` discards the in-progress bar (`reset_clears_state` pins this).
- **Batch.** `batch` concatenates completed bars; length is data-dependent
  (`batch_concatenates_completed_bars` pins this).

## Examples

### Rust

```rust
use wickra::{BarBuilder, Candle, DollarBars};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let c = |cl, v| Candle::new(cl, cl, cl, cl, v, 0).unwrap();
    let mut bars = DollarBars::new(1000.0)?;
    bars.update(c(10.0, 60.0));            // 600
    let out = bars.update(c(10.0, 60.0));  // 1200 >= 1000
    println!("{:?}", out[0].dollar);       // 1200.0
    Ok(())
}
```

Output:

```
1200.0
```

### Python

```python
import wickra as ta

bars = ta.DollarBars(1000.0)
bars.update(10.0, 10.0, 10.0, 10.0, 60.0)        # 600
print(bars.update(10.0, 10.0, 10.0, 10.0, 60.0)) # closes at 1200
# [(10.0, 10.0, 10.0, 10.0, 120.0, 1200.0)]
```

### Node

```javascript
const ta = require('wickra');
const bars = new ta.DollarBars(1000.0);
bars.update(10.0, 10.0, 10.0, 10.0, 60.0);
console.log(bars.update(10.0, 10.0, 10.0, 10.0, 60.0)[0].dollar); // 1200
```

### Streaming

```rust
use wickra::{BarBuilder, Candle, DollarBars};

let mut bars = DollarBars::new(50_000.0).unwrap();
for candle in feed {
    for bar in bars.update(candle) {
        // each bar represents ~$50k of traded value
    }
}
```

`batch` is equivalent to replaying `update` candle-by-candle and concatenating
(`batch_concatenates_completed_bars` pins this).

## Interpretation

1. **Long-history comparability.** Use dollar bars when a backtest spans years of
   price appreciation — they keep each bar's economic weight constant.
2. **Crypto and FX.** Where notional value matters more than unit count, dollar bars
   normalise across assets of very different price levels.
3. **ML features.** López de Prado recommends dollar bars as the default sampling for
   downstream models.

## Common pitfalls

- **Candle-granular.** At most one bar closes per candle; feed one candle per trade
  for finer resolution.
- **Overshoot.** The closing bar keeps the crossing candle's excess value, so bar
  values are `>= dollar_per_bar`.
- **Not an `Indicator`.** No warmup, emits a `Vec`, cannot join a `Chain`.

## References

López de Prado, M. (2018), *Advances in Financial Machine Learning*, ch. 2 —
dollar bars as the recommended information-driven sampling.

## See also

- [Indicator-VolumeBars](/Indicators/Indicator-VolumeBars) — equal traded volume.
- [Indicator-TickBars](/Indicators/Indicator-TickBars) — equal trade count.
- [Indicator-ImbalanceBars](/Indicators/Indicator-ImbalanceBars) — order-flow imbalance.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
