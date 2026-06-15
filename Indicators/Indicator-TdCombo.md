# TD Combo

> DeMark's stricter, faster countdown variant. Unlike vanilla TD
> Sequential (which only requires `close <= low[i - 2]` for a buy
> countdown), Combo adds two strictness conditions that prevent the
> countdown from advancing on weak bars: monotone non-rising lows
> and strictly-lower closes (mirrored for sells). The result is a
> faster, higher-conviction exhaustion signal.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | DeMark                                                               |
| Input type          | `Candle` (uses `high`, `low`, `close`)                              |
| Output type         | `f64` — signed combo count                                           |
| Output range        | `[-target, +target]` (classic `±13`)                                 |
| Default parameters  | `(4, 9, 2, 13)` — same as TdSequential                               |
| Warmup period       | `max(setup_lookback, countdown_lookback) + 1`                         |
| Interpretation      | `+13` = buy combo complete; `−13` = sell combo complete              |

## Formula

Setup phase is identical to [TdSetup](/Indicators/Indicator-TdSetup) (arms the
combo after 9 consecutive bars satisfying the directional setup
rule).

Buy combo bars must satisfy **all three** conditions:

```
1. close[i] <= low[i - 2]          // classic countdown rule
2. low[i]   <= low[i - 1]           // monotone non-rising lows
3. close[i] <  close[i - 1]          // strictly lower close
```

Sell combo bars must satisfy the mirror:

```
1. close[i] >= high[i - 2]
2. high[i]  >= high[i - 1]
3. close[i] >  close[i - 1]
```

The combo count saturates at `target` (DeMark's classic value is
`13`). See `crates/wickra-core/src/indicators/td_combo.rs`.

## Parameters

| Name                 | Type    | Default | Description |
|----------------------|---------|---------|-------------|
| `setup_lookback`     | `usize` | `4`     | Setup-phase lookback. |
| `setup_target`       | `usize` | `9`     | Setup count needed to arm. |
| `countdown_lookback` | `usize` | `2`     | Countdown lookback (first condition). |
| `countdown_target`   | `usize` | `13`    | Combo target count. |

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>` — signed combo count.
Same shape as TdCountdown. Python: 1-D `np.ndarray` with `NaN`
warmup. Node: same.

## Warmup

`warmup_period() == max(setup_lookback, countdown_lookback) + 1`.

## Edge cases

- **Stricter than vanilla Countdown.** Many bars that would count
  in vanilla TD Countdown are filtered out by the additional
  monotone-low and strictly-lower-close conditions. Combo
  completes less often but with higher conviction.
- **Opposite-direction setup invalidates.** Same behaviour as
  TdCountdown.
- **Reset.** Clears all internal state.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, TdCombo};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let prices: Vec<f64> = (0..40).map(|i| 100.0 - f64::from(i) * 0.6).collect();
    let candles: Vec<Candle> = prices.iter().enumerate()
        .map(|(i, &c)| Candle::new(c, c + 0.3, c - 0.3, c, 1.0, i as i64).unwrap())
        .collect();
    let mut td = TdCombo::classic();
    let max = td.batch(&candles).iter().flatten().fold(0.0f64, |a, &b| a.max(b));
    println!("max buy combo: {max}");
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

close = 100 - np.arange(40, dtype=float) * 0.6  # strict downtrend
td = ta.TDCombo()
print('max:', np.nanmax(td.batch(close + 0.3, close - 0.3, close)))
```

### Node

```javascript
const wickra = require('wickra');
const td = new wickra.TDCombo();
const close = Array.from({ length: 40 }, (_, i) => 100 - i * 0.6);
console.log('max:',
  Math.max(...td.batch(close.map(c => c + 0.3), close.map(c => c - 0.3), close)
              .filter(x => x != null)));
```

### Streaming

```rust
use wickra::{Candle, Indicator, TdCombo};

let mut td = TdCombo::classic();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if let Some(v) = td.update(bar) {
        if v == 13.0 { /* high-conviction buy combo */ }
        if v == -13.0 { /* high-conviction sell combo */ }
    }
}
```

## Interpretation

- **Higher conviction than vanilla.** Combo completion requires
  monotone-non-rising lows *and* strictly-lower closes — capturing
  capitulation more strictly than vanilla Countdown's weaker
  `close <= low[i - 2]` rule.
- **Faster in strong trends.** Counter-intuitively, on a clean
  capitulation Combo can complete *before* vanilla Countdown,
  because the stricter conditions tend to be satisfied early in
  a clean panic-style drop and miss later "muddy" bars.
- **Lower hit rate.** Combos complete less often; many setups
  that would mature into Countdown 13 don't satisfy the Combo
  conditions.

## Common pitfalls

- **Using Combo as a drop-in for Sequential.** Different conditions
  → different signal timing. Compare on historical data for the
  instrument before deploying.
- **Resetting on session boundaries.** Same as all DeMark
  indicators — do not reset on session boundaries.
- **Ignoring Setup completion.** Combo is armed by a completed
  setup; the same arming/invalidation rules apply as in
  TdCountdown.

## References

- Tom DeMark, *The New Science of Technical Analysis* (1994) —
  TD Combo as the "aggressive countdown" variant.
- *DeMark Indicators* (with Jason Perl, 2008) — refined Combo
  rules and parameter guidance.

## See also

- [TdSequential](/Indicators/Indicator-TdSequential) — vanilla Setup +
  Countdown.
- [TdCountdown](/Indicators/Indicator-TdCountdown) — standalone vanilla
  countdown.
- [TdSetup](/Indicators/Indicator-TdSetup) — setup phase.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
