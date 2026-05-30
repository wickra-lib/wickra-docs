# Williams Fractals

> Bill Williams' five-bar swing detector. A bar is an **up fractal**
> if its high is strictly above the highs of the two bars
> immediately before and the two bars immediately after; a **down
> fractal** if its low is strictly below those four neighbours.
> Because confirmation requires two bars to the right of the
> candidate, the indicator inherently lags by two bars.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Pivots & S/R                                                         |
| Input type          | `Candle`                                                             |
| Output type         | `WilliamsFractalsOutput { up: Option<f64>, down: Option<f64> }`      |
| Output range        | unbounded (price-units)                                              |
| Default parameters  | none — `WilliamsFractals::new()`                                     |
| Warmup period       | `5` — first output lands at bar 5 referring to bar 3                 |
| Interpretation      | Confirmed swing high/low at the centre of a 5-bar window             |

## Formula

```
up_fractal_t-2   = candidate_high[t-2] > high[t-4], high[t-3], high[t-1], high[t]
down_fractal_t-2 = candidate_low[t-2]  < low[t-4],  low[t-3],  low[t-1],  low[t]
```

Both checks use **strict** inequality. The same bar can be both an
up and down fractal if it's the maximum high *and* minimum low of
the window. See
`crates/wickra-core/src/indicators/williams_fractals.rs`.

## Parameters

None — `WilliamsFractals::new()` takes no arguments. The 5-bar
window is fixed.

## Inputs / Outputs

`Indicator<Input = Candle, Output = WilliamsFractalsOutput>` with
two `Option<f64>` fields: `up` and `down`. Each is `Some(price)`
when a fractal was confirmed at the centre of the most recent
5-bar window, `None` otherwise.

- **Python.** `WilliamsFractals().batch(high, low)` returns an
  `(n, 2)` `float64` array — `NaN` where no fractal was emitted.
  Note the 2-bar lag: the array index is the bar the *fractal was
  confirmed on*, not the bar it refers to.
- **Node.** Returns a flat `number[]` of length `n * 2` interleaved;
  `null` slots are encoded as `NaN`. Streaming `update(candle)`
  returns `{ up: number | null, down: number | null } | null`.

## Warmup

`warmup_period() == 5`. The first non-`None` output lands on bar 5
and refers to bar 3 (the centre of the first complete window).
Subsequent outputs slide the window by one bar each.

## Edge cases

- **Equal highs.** Strict inequality means equal-high neighbours
  disqualify an up-fractal. This makes the detector
  *non-repainting* — once confirmed, it stays confirmed.
- **Both fractals on one bar.** A bar that is the max high *and*
  min low of the 5-bar window emits both `up` and `down` non-`None`.
  Rare but possible on outside-range bars.
- **Neither fractal.** Most bars emit `(None, None)` even after
  warmup — fractals are sparse signals.
- **Reset.** `reset()` clears the 5-bar rolling buffer.

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, WilliamsFractals};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Prices forming a clear high at bar 3: 100, 102, 105, 103, 101
    let highs = [100.5, 102.5, 105.5, 103.5, 101.5];
    let lows  = [ 99.5, 101.5, 104.5, 102.5, 100.5];
    let mut wf = WilliamsFractals::new();
    for i in 0..highs.len() {
        let c = Candle::new(
            (highs[i] + lows[i]) / 2.0, highs[i], lows[i],
            (highs[i] + lows[i]) / 2.0, 1.0, i as i64,
        )?;
        if let Some(o) = wf.update(c) {
            if let Some(u) = o.up { println!("up fractal at bar {}: {u}", i - 2); }
            if let Some(d) = o.down { println!("down fractal at bar {}: {d}", i - 2); }
        }
    }
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

high = np.array([100.5, 102.5, 105.5, 103.5, 101.5])
low  = np.array([ 99.5, 101.5, 104.5, 102.5, 100.5])

wf = ta.WilliamsFractals()
out = wf.batch(high, low)
print(out)  # NaN except where fractals were confirmed
```

### Node

```javascript
const wickra = require('wickra');
const wf = new wickra.WilliamsFractals();
console.log(wf.batch(
  [100.5, 102.5, 105.5, 103.5, 101.5],
  [ 99.5, 101.5, 104.5, 102.5, 100.5],
));
```

### Streaming swing-trade pattern

```rust
use wickra::{Candle, Indicator, WilliamsFractals};

let mut wf = WilliamsFractals::new();
let mut last_up: Option<f64> = None;
let mut last_down: Option<f64> = None;
for bar in candle_stream {
    if let Some(o) = wf.update(bar) {
        if let Some(u) = o.up { last_up = Some(u); }
        if let Some(d) = o.down { last_down = Some(d); }
    }
    // Use last_up / last_down as dynamic resistance / support
}
```

## Interpretation

- **Swing high / low markers.** Each confirmed up-fractal marks a
  local swing high; each down-fractal marks a swing low. Together
  they form the structural skeleton of the price action.
- **Trendline / structure systems.** Two consecutive higher-low
  down-fractals signal a rising support line; two consecutive
  lower-high up-fractals signal a falling resistance.
- **Pairs with Alligator.** In Bill Williams' canonical "trading
  chaos" methodology, fractals provide entry signals and the
  Alligator provides trend direction.
- **2-bar lag.** Fractals confirm at the bar +2 from the swing
  extreme. Any system using them is at least 2 bars behind
  real-time.

## Common pitfalls

- **Treating fractals as real-time signals.** Confirmed only 2
  bars after the fact. Strategies that act on "fractal at bar t"
  must use bar `t + 2` as the earliest action point.
- **Non-strict inequality bugs.** Wickra uses strict `>` and `<`.
  Some alternative implementations use `>=` / `<=`, which gives
  more fractals but introduces repaint risk on equal-high bars.
- **Fractal as resistance.** A single up-fractal at price `X` is
  used as resistance until price closes above it; once broken, it
  becomes support. Track the most recent fractal as a dynamic
  level; older ones grow stale.

## References

- Bill Williams, *Trading Chaos* (1995) — original Fractal +
  Alligator system.
- Bill Williams, *New Trading Dimensions* (1998) — extended
  treatment.

## See also

- [Alligator](Indicator-Alligator) — Williams' trend-direction
  companion.
- [AwesomeOscillator](Indicator-AwesomeOscillator) — Williams'
  momentum companion.
- [ZigZag](Indicator-ZigZag) — alternative swing detector with
  percentage threshold.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
