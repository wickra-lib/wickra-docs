# TdMovingAverage

> Tom DeMark's TD Moving Averages — a fast (ST1) / slow (ST2) ribbon on the median
> price; their relationship defines the trend.

## Quick reference

| Field | Value |
|-------|-------|
| Family | DeMark |
| Input type | `Candle` (high / low) |
| Output type | `TdMovingAverageOutput { st1, st2 }` |
| Output range | price units |
| Default parameters | `(period_st1 = 5, period_st2 = 13)` |
| Warmup period | `period_st2` |
| Interpretation | `st1 > st2` uptrend; `st1 < st2` downtrend; cross = change. |

## Formula

```
price = (high + low) / 2          (median price)
st1   = SMA(price, period_st1)    (fast)
st2   = SMA(price, period_st2)    (slow)
```

DeMark's two-line ribbon frames the trend: `st1` above `st2` is up, below is down,
and the cross marks the change. Using the median price de-emphasises closing
noise. Source: `crates/wickra-core/src/indicators/td_moving_average.rs`.

## Parameters

| Name         | Type    | Default | Valid range | Source | Description |
|--------------|---------|---------|-------------|--------|-------------|
| `period_st1` | `usize` | `5`     | `>= 1`, `< period_st2` | `td_moving_average.rs:61` | Fast average length. |
| `period_st2` | `usize` | `13`    | `> period_st1` | `td_moving_average.rs:61` | Slow average length. `0` for either errors with `Error::PeriodZero`; bad ordering with `Error::InvalidPeriod`. |

`periods()` returns `(period_st1, period_st2)`; `value` returns the current output
if ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/td_moving_average.rs`:

```rust
use wickra::{Candle, Indicator, TdMovingAverage, TdMovingAverageOutput};
// TdMovingAverage: Input = Candle, Output = TdMovingAverageOutput
const _: fn(&mut TdMovingAverage, Candle) -> Option<TdMovingAverageOutput> =
    <TdMovingAverage as Indicator>::update;
```

A `Candle` in, an `Option<TdMovingAverageOutput>` out. The Python binding returns a
`(st1, st2)` tuple from `update` and an `(n, 2)` array from `batch(high, low)`;
Node returns `{ st1, st2 }` and a flat `Float64Array` of length `n*2`; WASM mirrors
the object with camelCase keys.

## Warmup

`warmup_period() == period_st2`. The slow average seeds last
(`first_emission_at_warmup_period` pins this).

## Edge cases

- **Uptrend.** Fast leads slow (`fast_leads_slow_in_uptrend` pins this).
- **Downtrend.** Fast trails slow (`fast_below_slow_in_downtrend` pins this).
- **Flat series.** Both lines equal the price (`flat_series_equal_lines` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `td.reset()` clears both averages and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, TdMovingAverage};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut td = TdMovingAverage::new(3, 7)?;
    let candles: Vec<Candle> = (0..40)
        .map(|i| { let b = 100.0 + f64::from(i); Candle::new(b, b + 1.0, b - 1.0, b, 1_000.0, 0).unwrap() })
        .collect();
    let out = td.batch(&candles).last().unwrap().unwrap();
    println!("st1 > st2: {}", out.st1 > out.st2);
    Ok(())
}
```

Output:

```
st1 > st2: true
```

### Python

```python
import numpy as np
import wickra as ta

td = ta.TdMovingAverage(5, 13)
high = np.arange(40, dtype=float) + 101
low  = np.arange(40, dtype=float) + 99
st1, st2 = td.batch(high, low).T
print(st1[-1], st2[-1])
```

### Node

```javascript
const ta = require('wickra');

const td = new ta.TdMovingAverage(5, 13);
console.log('warmupPeriod:', td.warmupPeriod()); // 13
```

### Streaming

```rust
use wickra::{Candle, Indicator, TdMovingAverage};

let mut td = TdMovingAverage::new(5, 13).unwrap();
for candle in feed {
    if let Some(out) = td.update(candle) {
        // out.st1 crossing out.st2 -> trend change
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Trend ribbon.** Trade with the ribbon: longs while `st1 > st2`, shorts while
   below.
2. **Crossover timing.** The ST1/ST2 cross is the DeMark trend-change trigger.
3. **Median basis.** Because it uses the median price, whipsaws from erratic closes
   are reduced versus a close-based MA cross.

## Common pitfalls

- **Lagging cross.** Like any MA cross, it confirms after the turn; combine with a
  faster signal for entries.
- **Choppy markets.** The cross whipsaws in ranges; gate with a trend/volatility
  filter.
- **Median, not close.** Signals will not match a close-based dual SMA exactly.

## References

DeMark, T. R. (1994), *The New Science of Technical Analysis*; Perl, J. (2008),
*DeMark Indicators*, Bloomberg Press.

## See also

- [Indicator-Sma](/Indicators/Indicator-Sma) — the simple moving average building block.
- [Indicator-MedianPrice](/Indicators/Indicator-MedianPrice) — the `(high+low)/2` input.
- [Indicator-MacdIndicator](/Indicators/Indicator-MacdIndicator) — momentum of an MA difference.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
