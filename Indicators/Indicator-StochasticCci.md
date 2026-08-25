# StochasticCCI

> Stochastic CCI — a stochastic oscillator computed over the CCI, re-scaling the
> unbounded CCI into a bounded `[0, 100]` momentum oscillator.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Momentum Oscillators |
| Input type | `Candle` (typical price = (high + low + close) / 3) |
| Output type | `f64` (%K) |
| Output range | `[0, 100]`; neutral `50` in a flat market |
| Default parameters | `period` (shared by CCI and stochastic lookback) |
| Warmup period (`warmup_period()`) | `2·period − 1` |
| Interpretation | Bounded, self-normalising CCI. |

## Formula

```
cci = CCI(typical_price, period)
%K  = 100 * (cci - lowest(cci, period)) / (highest(cci, period) - lowest(cci, period))
```

The CCI is unbounded and clusters inside `±100`, so fixed overbought/oversold
lines fit it poorly. Wrapping it in a stochastic re-expresses each CCI reading as
its rank within its own recent range, producing a bounded oscillator that adapts
to changing CCI volatility. The same `period` drives both the CCI and the
stochastic window. When the CCI range over the window is zero (a flat market,
CCI pinned at `0`), the result is the neutral `50`.

Source: `crates/wickra-core/src/indicators/stochastic_cci.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= 1`      | `stochastic_cci.rs:55` | CCI period and stochastic lookback. `0` errors with `Error::PeriodZero`. |

(Python class `wickra.StochasticCCI(period)`; Node `new ta.StochasticCCI(period)`.)

## Inputs / Outputs

From `crates/wickra-core/src/indicators/stochastic_cci.rs`:

```rust
use wickra::{Candle, Indicator, StochasticCci};
// StochasticCci: Input = Candle, Output = f64
const _: fn(&mut StochasticCci, Candle) -> Option<f64> =
    <StochasticCci as Indicator>::update;
```

Node: `update(high, low, close)` / `batch(h[], l[], c[])`. Python:
`update(candle)` / `batch(high, low, close)` → `array.array('d')` (`NaN` for warmup).
Node returns `number | null` / `Array<number>` with `NaN`.

## Warmup

`warmup_period()` returns `2·period − 1`: the CCI seeds at bar `period`, then
`period` CCI values fill the stochastic window. Pinned by `accessors_and_metadata`
(`warmup_period() == 27` for `StochasticCci::new(14)`) and
`first_emission_matches_warmup_period` (`== 9` for period 5, first `Some` at
index 8).

## Edge cases

- **Bounded.** `bounded_zero_to_hundred` pins every emission to `[0, 100]`.
- **Flat market → 50.** Constant candles pin the CCI at `0`, giving a zero range
  and the neutral `50`; pinned by `flat_market_is_neutral`.
- **Top of range → 100.** `highest_cci_in_window_is_hundred` checks the latest
  CCI being the window maximum yields `%K = 100`.
- **Reset.** `reset_clears_state`. **Streaming/batch:** `batch_equals_streaming`.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, StochasticCci};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut sc = StochasticCci::new(4)?;
    let bars = vec![Candle::new(10.0, 10.0, 10.0, 10.0, 1.0, 0)?; 8];
    let out: Vec<Option<f64>> = sc.batch(&bars);
    println!("warmup_period = {}", sc.warmup_period());
    println!("{:?}", out);
    Ok(())
}
```

Output:

```
warmup_period = 7
[None, None, None, None, None, None, Some(50.0), Some(50.0)]
```

On a flat series the CCI is pinned at `0`, so its window has zero range and the
oscillator returns the neutral `50` from the first emission (bar `2·period − 1 = 7`).

### Python

```python
import numpy as np
import wickra as ta

sc = ta.StochasticCCI(4)
flat = np.full(8, 10.0)
out = sc.batch(flat, flat, flat)   # high, low, close
print("warmup_period =", sc.warmup_period())
print(out)
```

Output:

```
warmup_period = 7
[nan nan nan nan nan nan 50. 50.]
```

### Node

```javascript
const ta = require('wickra');
const sc = new ta.StochasticCCI(4);
const flat = Array.from({ length: 8 }, () => 10);
console.log(sc.batch(flat, flat, flat)); // high, low, close
console.log('warmupPeriod:', sc.warmupPeriod());
```

Output:

```
[ NaN, NaN, NaN, NaN, NaN, NaN, 50, 50 ]
warmupPeriod: 7
```

### Streaming

```rust
use wickra::{Candle, Indicator, StochasticCci};

let mut sc = StochasticCci::new(14)?;
let mut last = None;
for i in 0..60 {
    let base = 100.0 + (f64::from(i) * 0.3).sin() * 10.0;
    last = sc.update(Candle::new(base, base + 1.0, base - 1.0, base, 1.0, i64::from(i))?);
}
println!("{last:?}");
# Ok::<(), Box<dyn std::error::Error>>(())
```

## Interpretation

Stochastic CCI turns the CCI into a bounded, RSI-like oscillator while keeping
the CCI's sensitivity to typical-price deviations. Because it self-normalises to
recent range, fixed `80/20` (or `90/10`) bands work consistently across regimes
where the raw CCI's `±100`/`±200` lines would not.

Typical uses:

1. **Overbought/oversold.** `80/20` crosses flag stretched CCI readings.
2. **Faster turns.** It tends to turn ahead of a plain CCI at extremes, since it
   reacts to the CCI's position in its range, not its absolute level.
3. **Range vs. trend.** Persistent pinning at 0 or 100 signals a strong trend;
   oscillation through the mid-line signals a range.

## Common pitfalls

- **Whipsaw at the rails.** Like any stochastic, it can pin at 0/100 in a strong
  trend; pair with a trend filter before fading extremes.
- **Double-smoothing expectations.** This exposes raw `%K`; apply your own SMA if
  you want a `%D` signal line.

## References

The stochastic-of-an-oscillator construction is a common refinement (cf.
[`StochRsi`](/Indicators/Indicator-StochRsi)); applied here to Lambert's CCI (1980).

## See also

- [Indicator-Cci](/Indicators/Indicator-Cci) — the underlying oscillator.
- [Indicator-StochRsi](/Indicators/Indicator-StochRsi) — the same idea applied to the RSI.
- [Indicator-Stochastic](/Indicators/Indicator-Stochastic) — the price-based stochastic.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
