# TD Differential

> Tom DeMark's three-close momentum-divergence reversal pattern. Flags
> an exhaustion-and-reversal candle whose buying or selling pressure has
> shifted from the prior bar. Combines a direction filter (two
> consecutive lower / higher closes), a buying-pressure check
> (`close − TrueLow`), and a selling-pressure check
> (`TrueHigh − close`), both measured against DeMark's true range.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | DeMark                                                               |
| Input type          | `Candle` (uses `high`, `low`, `close`)                              |
| Output type         | `f64` — `+1.0` buy, `-1.0` sell, `0.0` no signal                     |
| Output range        | `{-1.0, 0.0, +1.0}`                                                  |
| Default parameters  | none — `TdDifferential::new()`                                       |
| Warmup period       | `3`                                                                  |
| Interpretation      | Single-bar reversal signal; momentum shift detector                  |

## Formula

Pressure is measured against DeMark's *true* range, which folds in the
previous close (Jason Perl, *DeMark Indicators*, 2008):

```
TrueLow[i]   = min(low[i],  close[i-1])
TrueHigh[i]  = max(high[i], close[i-1])
buying[i]    = close[i] - TrueLow[i]
selling[i]   = TrueHigh[i] - close[i]
```

**Buy signal** (`+1.0`) on bar `i` when:

```
1. close[i] < close[i - 1]  and  close[i - 1] < close[i - 2]   (two lower closes)
2. buying[i]  >  buying[i - 1]              (buying pressure rises)
3. selling[i] <  selling[i - 1]             (selling pressure falls)
```

**Sell signal** (`-1.0`) on bar `i` when:

```
1. close[i] > close[i - 1]  and  close[i - 1] > close[i - 2]   (two higher closes)
2. selling[i] >  selling[i - 1]             (selling pressure rises)
3. buying[i]  <  buying[i - 1]              (buying pressure falls)
```

Otherwise the output is `0.0`. See
`crates/wickra-core/src/indicators/td_differential.rs`.

## Parameters

None — `TdDifferential::new()` takes no arguments.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python:
`TdDifferential().batch(high, low, close)` returns a 1-D
`array.array('d')` (first two bars are `NaN`). Node:
`batch(high, low, close)` returns `number[]` (first two bars `NaN`);
`update(high, low, close)` returns `number | null` (first two bars
`null`).

## Warmup

`warmup_period() == 3`. The pressure of bar `i − 1` needs the close
of bar `i − 2`, so the indicator emits its first value on the third
input candle.

## Edge cases

- **No signal.** Most bars emit `0.0` — both buy and sell
  conditions are strict (four inequalities each). Identical bars
  emit `0.0` (`no_signal_on_neutral_bars`).
- **Single lower close.** One lower close is not enough: the prior
  bar must also have closed below its predecessor
  (`single_lower_close_is_not_enough`).
- **Reference fixtures.** Closes `10 → 9 → 8.5` with highs
  `11, 10, 9` / lows `9, 8, 7` give buying `1 → 1.5` and selling
  `1 → 0.5`, so `+1.0`
  (`buy_signal_after_two_lower_closes_with_shifting_pressure`);
  closes `8 → 9 → 9.8` with highs `9, 10, 11.5` / lows `7, 8, 9.5`
  give `-1.0`
  (`sell_signal_after_two_higher_closes_with_shifting_pressure`).
- **Direction conflict.** A bar that's both up and down at the
  same time is impossible; the strict close comparison filters
  noise cleanly.
- **NaN / infinity.** Rejected by `Candle::new` upstream.
- **Reset.** Clears the two-bar cache (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, TdDifferential};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut td = TdDifferential::new();
    // Two lower closes (10 -> 9 -> 8.5) while buying pressure rises
    // (1 -> 1.5) and selling pressure falls (1 -> 0.5).
    let c1 = Candle::new(10.0, 11.0, 9.0, 10.0, 1.0, 0)?;
    let c2 = Candle::new(9.0, 10.0, 8.0, 9.0, 1.0, 1)?;
    let c3 = Candle::new(8.5, 9.0, 7.0, 8.5, 1.0, 2)?;
    let _ = td.update(c1);
    let _ = td.update(c2);
    let v = td.update(c3);
    println!("signal = {v:?}"); // signal = Some(1.0)
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

h = np.array([11.0, 10.0, 9.0])
l = np.array([ 9.0,  8.0, 7.0])
c = np.array([10.0,  9.0, 8.5])

td = ta.TDDifferential()
print(list(td.batch(h, l, c)))  # [nan, nan, 1.0]
```

### Node

```javascript
const wickra = require('wickra');
const td = new wickra.TDDifferential();
console.log(td.batch([11, 10, 9], [9, 8, 7], [10, 9, 8.5])); // [ NaN, NaN, 1 ]
```

### Streaming

```rust
use wickra::{Candle, Indicator, TdDifferential};

let mut td = TdDifferential::new();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
for bar in candle_stream {
    if let Some(v) = td.update(bar) {
        if v > 0.0 { /* buy reversal pattern */ }
        if v < 0.0 { /* sell reversal pattern */ }
    }
}
```

## Interpretation

- **Single-bar exhaustion.** TD Differential flags one bar where
  price has closed lower (higher) two bars running but the
  pressure distribution has already shifted — classic
  exhaustion-bar pattern.
- **Pair with Setup / Sequential.** TD Differential signals at
  bar level; pair with Setup or Countdown progress to filter
  noise and only act when both layers agree.
- **Discrete output.** The trinary `{-1, 0, +1}` output is easy
  to feed into rule-based systems; no thresholds to tune.

## Common pitfalls

- **Treating every signal as actionable.** TD Differential
  signals appear on individual bars and many are false
  positives. Use as a filter, not a primary trigger.
- **Forgetting the direction filter.** The first rule (two
  consecutive lower closes for buys) is the direction filter;
  without it the pressure tests would fire on any momentum-shift
  bar.
- **Using the plain bar range.** Pressure is measured against the
  *true* low / high (folding in the previous close), not
  `close − low` / `high − close`; a gap bar changes the pressures.
- **Ignoring DeMark's variants.** DeMark also published TD Reverse
  Differential and TD Anti-Differential with different close
  patterns; this is the base TD Differential.

## References

- Tom DeMark, *The New Science of Technical Analysis* (1994) —
  TD Differential.
- Jason Perl, *DeMark Indicators* (Bloomberg Press, 2008) — the
  three-close rule and true-range pressure definitions.

## See also

- [TdSetup](/Indicators/Indicator-TdSetup) — wider momentum-exhaustion
  signal.
- [TdSequential](/Indicators/Indicator-TdSequential) — full Setup +
  Countdown.
- [TdOpen](/Indicators/Indicator-TdOpen) — gap-and-fade reversal sibling.
- [TdPressure](/Indicators/Indicator-TdPressure) — volume-weighted
  pressure oscillator.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
