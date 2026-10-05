# TD REI (Range Expansion Index)

> DeMark's Range Expansion Index. A short-window (default 5-bar)
> oscillator that sums each bar's signed high/low change versus two
> bars earlier — counted in the numerator only when the bar's range
> overlaps the bars 5–6 back, or the bar two back overlaps the closes
> 7–8 back — and divides by the sum of the absolute changes of every
> bar, giving a `[-100, +100]` range. Designed as a fast short-cycle
> momentum oscillator within DeMark's larger toolset.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | DeMark                                                               |
| Input type          | `Candle` (uses `high`, `low`, `close`)                              |
| Output type         | `f64`                                                                |
| Output range        | `[-100, +100]`                                                       |
| Default parameters  | `period = 5`                                                         |
| Warmup period       | `8 + period` (the conditions look back 8 bars; classic `13`)         |
| Interpretation      | Above `+60` overbought; below `−60` oversold; near 0 neutral         |

## Formula

For each bar `t` (history through `t − 8` required):

```
overlap      = (high_t     >= low_{t-5}   OR high_t     >= low_{t-6})
           AND (low_t      <= high_{t-5}  OR low_t      <= high_{t-6})
overlap_back = (high_{t-2} >= close_{t-7} OR high_{t-2} >= close_{t-8})
           AND (low_{t-2}  <= close_{t-7} OR low_{t-2}  <= close_{t-8})

num_t = (high_t − high_{t-2}) + (low_t − low_{t-2})   if overlap OR overlap_back
      = 0                                             otherwise
den_t = |high_t − high_{t-2}| + |low_t − low_{t-2}|   (every bar)

REI = 100 · Σ_period num / Σ_period den, clamped to [-100, +100]
      (0 if Σ den == 0)
```

The gate only zeroes the **numerator**: a bar whose range does not
overlap the bars 5–6 back (and whose bar-two-back does not overlap
the closes 7–8 back — DeMark's alternative condition) still adds its
absolute change to the denominator, pulling REI towards zero. Since
`|num_t| ≤ den_t` bar by bar, the ratio is bounded; the clamp only
absorbs last-bit rounding. See
`crates/wickra-core/src/indicators/td_rei.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | `5`     | `> 0`      | Rolling-sum window. Most DeMark literature uses `5`. |

`TdRei::classic()` constructs the 5-period default. `new` returns
`Error::PeriodZero` for `period == 0`.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python:
`TDREI(period).batch(high, low, close)` returns an `array.array('d')`
with `NaN` in the warmup prefix (`close` is required — the
alternative condition reads the closes 7–8 bars back). Node and
WASM: `batch(high, low, close)` returns `number[]` (`NaN` warmup);
`update(high, low, close)` returns `number | null`.

## Warmup

`warmup_period() == 8 + period` (`13` for the classic 5-bar
window). The first 8 bars only fill the look-back (the alternative
condition reaches `close_{t-8}`); then `period` per-bar
numerator / denominator terms fill the window, so the first value
lands at index `8 + period − 1` (index 12 for `period = 5`).

## Edge cases

- **Zero denominator.** When highs and lows do not change over the
  window the indicator returns `0.0` (neutral)
  (`flat_market_yields_neutral_zero`).
- **Gate closed.** Bars failing both overlap conditions add `0` to
  the numerator but their full change to the denominator, so a
  steep, tight-ranged trend can read near `0`.
- **Pure expansion up / down.** A slow steady trend (slope `0.1`,
  spread `2`) passes the gate every bar → REI saturates at `+100`
  (`pure_uptrend_pegs_indicator_at_100`) or `−100`
  (`pure_downtrend_pegs_indicator_at_minus_100`).
- **Bounded.** Output stays in `[-100, +100]`
  (`stays_in_minus_100_to_100`).
- **Zero period.** `TdRei::new(0)` errors (`rejects_zero_period`).
- **Reset.** Clears the rolling buffers (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, TdRei};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..30).map(|i| {
        let b = 100.0 + f64::from(i) * 0.1;
        Candle::new(b, b + 1.0, b - 1.0, b, 1.0, i as i64).unwrap()
    }).collect();
    let mut r = TdRei::classic();
    println!("row 20 = {:?}", r.batch(&candles)[20]); // row 20 = Some(100.0)
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

base = 100 + np.arange(30, dtype=float) * 0.1
r = ta.TDREI(5)
out = r.batch(base + 1, base - 1, base)
print('warmup:', r.warmup_period())  # 13
print('row 20:', out[20])            # 100.0
```

### Node

```javascript
const wickra = require('wickra');
const r = new wickra.TDREI(5);
const base = Array.from({ length: 30 }, (_, i) => 100 + i * 0.1);
console.log('row 20:',
  r.batch(base.map(b => b + 1), base.map(b => b - 1), base)[20]); // row 20: 100
```

### Streaming

```rust
use wickra::{Candle, Indicator, TdRei};

let mut r = TdRei::classic();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if let Some(v) = r.update(bar) {
        if v > 60.0 { /* overbought */ }
        if v < -60.0 { /* oversold */ }
    }
}
```

## Interpretation

REI is the **short-window momentum oscillator** in the DeMark
toolbox:

- **REI > +60.** Recent range expansion has been dominated by new
  highs — overbought.
- **REI < −60.** Range expansion dominated by new lows — oversold.
- **Persistent zero readings.** Either highs and lows are not
  changing, or bars keep failing the overlap gate (their changes
  count only in the denominator); the market has no qualified
  range expansion in either direction.
- **As Sequential precondition.** Some DeMark traders use
  `REI > +45 / < −45` as a momentum gate for TD Sequential
  signals — REI confirms the momentum context.

## Common pitfalls

- **Comparing REI to RSI thresholds.** Different scales (`-100..+100`
  vs `0..100`) and different neutral points (`0` vs `50`).
- **Reading every zero-cross.** REI sits at zero for long periods
  in ranges; only the move *off* zero is meaningful.
- **Conditional-gate surprise.** Two seemingly-similar price
  patterns can produce very different REI readings because the
  overlap gate (or its close-based alternative) kicks in
  differently. The implementation matches
  DeMark's published rules exactly; if you're getting unexpected
  output, compare against the rule, not against your intuition.

## References

- Tom DeMark, *The New Science of Technical Analysis* (1994),
  ch. 4: Range Expansion Index.
- Jason Perl, *DeMark Indicators* (Bloomberg Press, 2008) — TD REI
  conditions, including the alternative close-based condition.

## See also

- [TdDeMarker](/Indicators/Indicator-TdDeMarker) — wider-window DeMark
  momentum oscillator.
- [TdPressure](/Indicators/Indicator-TdPressure) — volume-aware DeMark
  momentum sibling.
- [TdSequential](/Indicators/Indicator-TdSequential) — paired with REI for
  confirmation in some setups.
- [Rsi](/Indicators/Indicator-Rsi) — close-based momentum analogue.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
