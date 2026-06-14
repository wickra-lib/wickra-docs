# TD Differential

> Tom DeMark's 2-bar momentum-divergence reversal pattern. Flags an
> exhaustion-and-reversal candle whose buying or selling pressure has
> shifted from the prior bar. Combines a direction filter
> (current vs previous close), a buying-pressure check
> (`close − low`), and a selling-pressure check (`high − close`).

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | DeMark                                                               |
| Input type          | `Candle` (uses `high`, `low`, `close`)                              |
| Output type         | `f64` — `+1.0` buy, `-1.0` sell, `0.0` no signal                     |
| Output range        | `{-1.0, 0.0, +1.0}`                                                  |
| Default parameters  | none — `TdDifferential::new()`                                       |
| Warmup period       | `2`                                                                  |
| Interpretation      | Single-bar reversal signal; momentum shift detector                  |

## Formula

```
buying_now   = close[i] - low[i]
buying_prev  = close[i-1] - low[i-1]
selling_now  = high[i] - close[i]
selling_prev = high[i-1] - close[i-1]
```

**Buy signal** (`+1.0`) on bar `i` when:

```
1. close[i]   <  close[i - 1]              (down day)
2. buying_now >  buying_prev                (more buying pressure than the prior bar)
3. selling_now <  selling_prev              (less selling pressure than the prior bar)
```

**Sell signal** (`-1.0`) on bar `i` when:

```
1. close[i]   >  close[i - 1]              (up day)
2. selling_now >  selling_prev              (more selling pressure)
3. buying_now  <  buying_prev               (less buying pressure)
```

Otherwise the output is `0.0`. See
`crates/wickra-core/src/indicators/td_differential.rs`.

## Parameters

None — `TdDifferential::new()` takes no arguments.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python:
`TdDifferential().batch(high, low, close)` returns a 1-D
`np.ndarray` (first bar is `NaN`). Node: same shape;
`update(candle)` returns `number | null` (only first bar `null`).

## Warmup

`warmup_period() == 2`. The two-bar lookback means the indicator
emits its first value on the second input candle.

## Edge cases

- **No signal.** Most bars emit `0.0` — both buy and sell
  conditions are strict (three inequalities each).
- **Direction conflict.** A bar that's both up and down at the
  same time is impossible; the strict close comparison filters
  noise cleanly.
- **NaN / infinity.** Rejected by `Candle::new` upstream.
- **Reset.** Clears the previous-bar cache.

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, TdDifferential};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut td = TdDifferential::new();
    // Bar 1: down day with weak selling
    let c1 = Candle::new(100.0, 105.0, 99.0, 100.0, 1.0, 0)?;
    let c2 = Candle::new(99.0, 104.0, 95.0, 99.5, 1.0, 1)?;
    // ... evaluate
    let _ = td.update(c1);
    let v = td.update(c2);
    println!("signal = {v:?}");
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

h = np.array([105.0, 104.0])
l = np.array([ 99.0,  95.0])
c = np.array([100.0,  99.5])

td = ta.TDDifferential()
print(td.batch(h, l, c))  # [NaN, ±1 or 0]
```

### Node

```javascript
const wickra = require('wickra');
const td = new wickra.TDDifferential();
console.log(td.batch([105, 104], [99, 95], [100, 99.5]));
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
  the price made a new close-direction extreme but the
  pressure distribution has shifted — classic exhaustion-bar
  pattern.
- **Pair with Setup / Sequential.** TD Differential signals at
  bar level; pair with Setup or Countdown progress to filter
  noise and only act when both layers agree.
- **Discrete output.** The trinary `{-1, 0, +1}` output is easy
  to feed into rule-based systems; no thresholds to tune.

## Common pitfalls

- **Treating every signal as actionable.** TD Differential
  signals appear on individual bars and many are false
  positives. Use as a filter, not a primary trigger.
- **Forgetting the direction filter.** The first rule (`close <
  prev close` for buys) is the direction filter; without it the
  pressure tests would fire on any momentum-shift bar.
- **Ignoring DeMark's variants.** DeMark also published TD
  Differential 2-bar and TD Differential 3-bar variants with
  slightly different thresholds; this is the base 2-bar variant.

## References

- Tom DeMark, *The New Science of Technical Analysis* (1994) —
  TD Differential.

## See also

- [TdSetup](/Indicators/Indicator-TdSetup) — wider momentum-exhaustion
  signal.
- [TdSequential](/Indicators/Indicator-TdSequential) — full Setup +
  Countdown.
- [TdOpen](/Indicators/Indicator-TdOpen) — gap-and-fade reversal sibling.
- [TdPressure](/Indicators/Indicator-TdPressure) — volume-weighted
  pressure oscillator.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
