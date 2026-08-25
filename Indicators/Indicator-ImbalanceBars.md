# ImbalanceBars

> Order-flow bars — sample when cumulative signed tick imbalance becomes one-sided.
> *(Simplified López de Prado: fixed threshold, unweighted ticks.)*

## Quick reference

| Field | Value |
|-------|-------|
| Family | Alt-Chart Bars |
| Trait | `BarBuilder` (not `Indicator`) |
| Input type | `Candle` |
| Output type | `Vec<ImbalanceBar>` (0 or 1 bar per candle) |
| Bar element | `ImbalanceBar { open, high, low, close, imbalance, direction: i8 }` |
| Default parameters | `(threshold = 20.0)` |
| Warmup | none (seeds on the first candle) |
| Interpretation | Each bar = a burst of one-sided order flow. |

## Formula

```
sign_t = +1 if close_t > close_{t-1}
         -1 if close_t < close_{t-1}
         carry previous sign if unchanged          (tick rule)
θ      = Σ sign_t
close the bar when |θ| >= threshold
direction = sign(θ)
```

Each candle gets a tick sign; the signed imbalance `θ` accumulates until its
magnitude reaches `threshold`, closing a bar. Imbalance bars sample the market when
order flow turns *one-sided* — a run of persistent buying or selling — rather than on
time, count, or volume, making them sensitive to informed, directional trading.
Source: `crates/wickra-core/src/indicators/imbalance_bars.rs`.

> **Simplified.** The full method uses a *dynamic* threshold `E[T] · |2P − 1|`
> estimated from an EWMA of the expected run length `E[T]` and buy probability `P`,
> and can weight each sign by volume (volume-imbalance bars) or value
> (dollar-imbalance bars). This builder uses a **fixed** threshold on the unweighted
> tick imbalance. See López de Prado (2018), ch. 2, for the adaptive estimator and
> the weighted variants.

## Parameters

| Name        | Type  | Default | Valid range   | Source | Description |
|-------------|-------|---------|---------------|--------|-------------|
| `threshold` | `f64` | `20.0`  | finite, `> 0` | `imbalance_bars.rs:74` | Absolute imbalance that closes a bar. Non-finite or non-positive errors with `Error::InvalidPeriod`. |

The `threshold` and `imbalance` getters expose the configuration and the in-progress
signed imbalance.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/imbalance_bars.rs`:

```rust
use wickra::{BarBuilder, Candle, ImbalanceBar, ImbalanceBars};
// ImbalanceBars: Input = Candle, Output = Vec<ImbalanceBar>
const _: fn(&mut ImbalanceBars, Candle) -> Vec<ImbalanceBar> =
    <ImbalanceBars as BarBuilder>::update;
```

A `Candle` in, a `Vec<ImbalanceBar>` out (empty until the imbalance threshold is
reached). Bindings are close-driven: Python `update(close) -> list[tuple]`; Node
`update(close) -> ImbalanceBar[]`. No `warmupPeriod`/`isReady`.

## Signed ±1 encoding

The `direction` field is `+1` when a **buy-side** imbalance (`θ > 0`) closed the bar
and `-1` when a **sell-side** imbalance (`θ < 0`) closed it. The `imbalance` field is
the signed `θ` at the close, whose sign matches `direction` and whose magnitude is
`>= threshold`.

## Edge cases

- **Buy imbalance.** Three up-ticks at `threshold = 3` close a `+1` bar
  (`buy_imbalance_closes_up_bar` pins this).
- **Sell imbalance.** Three down-ticks close a `-1` bar
  (`sell_imbalance_closes_down_bar` pins this).
- **Flat tick.** An unchanged close carries the previous sign
  (`flat_tick_carries_previous_sign` pins this).
- **Oscillation.** Alternating ticks cancel and do not reach the threshold
  (`oscillation_does_not_reach_threshold` pins this).
- **Reset.** `reset()` clears the imbalance and the previous close
  (`reset_clears_state` pins this).
- **Batch.** `batch` concatenates completed bars; length is data-dependent
  (`batch_concatenates_completed_bars` pins this).

## Examples

### Rust

```rust
use wickra::{BarBuilder, Candle, ImbalanceBars};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let flat = |p: f64| Candle::new(p, p, p, p, 1.0, 0).unwrap();
    let mut bars = ImbalanceBars::new(3.0)?;
    bars.update(flat(10.0));            // seed
    bars.update(flat(11.0));            // +1
    bars.update(flat(12.0));            // +2
    let out = bars.update(flat(13.0));  // +3 -> close
    println!("{}", out[0].direction);   // 1
    Ok(())
}
```

Output:

```
1
```

### Python

```python
import wickra as ta

bars = ta.ImbalanceBars(3.0)
for p in (10.0, 11.0, 12.0):
    bars.update(p, p, p, p)
print(bars.update(13.0, 13.0, 13.0, 13.0))   # [(10.0, 13.0, 10.0, 13.0, 3.0, 1)]
```

### Node

```javascript
const ta = require('wickra');
const bars = new ta.ImbalanceBars(3.0);
[10.0, 11.0, 12.0].forEach((p) => bars.update(p, p, p, p));
console.log(bars.update(13.0, 13.0, 13.0, 13.0)[0].direction); // 1
```

### Streaming

```rust
use wickra::{BarBuilder, Candle, ImbalanceBars};

let mut bars = ImbalanceBars::new(20.0).unwrap();
let feed: Vec<Candle> = Vec::new(); // your live stream
for candle in feed {
    for bar in bars.update(candle) {
        // bar.direction reveals which side dominated the flow
    }
}
```

`batch` is equivalent to replaying `update` candle-by-candle and concatenating
(`batch_concatenates_completed_bars` pins this).

## Interpretation

1. **Informed-trading detector.** Imbalance bars cluster around news and large
   directional orders, where flow is persistent — exactly the regimes time bars miss.
2. **Direction is a signal.** A run of same-direction imbalance bars marks a strong
   trend; alternating directions mark choppy, balanced flow.
3. **Pair with the dynamic version.** For research, replace the fixed threshold with
   the EWMA estimator to keep bar frequency stable as activity changes.

## Common pitfalls

- **Fixed threshold drift.** With a constant threshold, bar frequency rises in
  trending markets and falls in choppy ones — acceptable for signals, but use the
  adaptive estimator for stationary bar counts.
- **Tick rule on candles.** Sign comes from close-to-close; for true tick data feed
  one candle per trade.
- **Not an `Indicator`.** No warmup, emits a `Vec`, cannot join a `Chain`.

## References

López de Prado, M. (2018), *Advances in Financial Machine Learning*, ch. 2 —
imbalance bars (tick, volume, dollar) and the EWMA threshold estimator.

## See also

- [Indicator-RunBars](/Indicators/Indicator-RunBars) — runs of same-signed flow.
- [Indicator-TickBars](/Indicators/Indicator-TickBars) — equal trade count.
- [Indicator-DollarBars](/Indicators/Indicator-DollarBars) — equal traded value.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
