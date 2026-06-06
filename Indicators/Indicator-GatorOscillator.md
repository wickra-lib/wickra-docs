# GatorOscillator

> Gator Oscillator — Bill Williams' convergence/divergence view of the
> Alligator: how far apart the Jaw, Teeth and Lips are spread.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trend & Directional |
| Input type | `Candle` (uses high and low) |
| Output type | `GatorOscillatorOutput { upper, lower }` |
| Output range | `upper >= 0`, `lower <= 0` (a two-sided histogram) |
| Default parameters | `(jaw = 13, teeth = 8, lips = 5)` via `classic()` |
| Warmup period (`warmup_period()`) | `max(jaw, teeth, lips)` (= `jaw` for the classic set) |
| Interpretation | Bar magnitude = Alligator mouth opening; widening = trend, shrinking = chop. |

## Formula

```
(jaw, teeth, lips) = Alligator(jaw_period, teeth_period, lips_period)
upper =  |jaw   - teeth|
lower = -|teeth - lips |
```

The Gator Oscillator restates the [`Alligator`](/Indicators/Indicator-Alligator) as two
histogram bars around a zero line. The upper bar is the absolute gap between the
slow Jaw and the middle Teeth; the lower bar is the negated absolute gap between
the Teeth and the fast Lips. When both bars grow the Alligator's "mouth" is
opening — the moving averages are fanning out, the hallmark of a trend. When
both shrink toward zero the lines are converging — the Gator is "sleeping" in a
range.

Source: `crates/wickra-core/src/indicators/gator_oscillator.rs`.

## Parameters

| Name           | Type    | Default | Valid range | Source | Description |
|----------------|---------|---------|-------------|--------|-------------|
| `jaw_period`   | `usize` | 13      | `>= 1`      | `gator_oscillator.rs:61` | Slow Alligator line (SMMA of median). `0` errors with `Error::PeriodZero`. |
| `teeth_period` | `usize` | 8       | `>= 1`      | `gator_oscillator.rs:61` | Middle Alligator line. `0` errors. |
| `lips_period`  | `usize` | 5       | `>= 1`      | `gator_oscillator.rs:61` | Fast Alligator line. `0` errors. |

(Python class `wickra.GatorOscillator(jaw, teeth, lips)`; Node
`new ta.GatorOscillator(jaw, teeth, lips)`.)

## Inputs / Outputs

From `crates/wickra-core/src/indicators/gator_oscillator.rs`:

```rust
use wickra::{Candle, GatorOscillator, GatorOscillatorOutput, Indicator};
// GatorOscillator: Input = Candle, Output = GatorOscillatorOutput
const _: fn(&mut GatorOscillator, Candle) -> Option<GatorOscillatorOutput> =
    <GatorOscillator as Indicator>::update;
```

Two outputs per bar. The Gator reads only the high and low (their median), so the
batch bindings take high/low/close (the close is accepted for signature
uniformity and ignored). Node: `update(high, low, close)` returns
`{ upper, lower } | null`; `batch(h[], l[], c[])` returns a flat
`Array<number>` of length `n*2` (`[upper, lower, upper, lower, …]`, `NaN` for
warmup). Python: `update(candle)` returns `(upper, lower) | None`;
`batch(high, low, close)` returns an `(n, 2)` `ndarray`.

## Warmup

`warmup_period()` returns the longest of the three periods (the Jaw, `13`, for
the classic set): all three SMMAs run on every bar and the slowest one gates the
first reading. Pinned by `accessors_and_metadata` (`warmup_period() == 13`) and
`warmup_emits_first_value_at_longest_period`.

## Edge cases

- **Collapsed mouth.** `constant_series_collapses_both_bars` feeds a constant
  median; all three lines equal it, so `upper == 0` and `lower == 0`.
- **Open mouth.** `trending_series_opens_the_mouth` feeds a clean uptrend; the
  lines separate, giving `upper > 0` and `lower < 0`.
- **Reset.** `reset_clears_state` clears the inner Alligator.
- **Streaming/batch:** `batch_equals_streaming`.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, GatorOscillator, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut g = GatorOscillator::classic();
    // A constant median price collapses both histogram bars to zero.
    let bars: Vec<Candle> = (0..40)
        .map(|i| Candle::new(10.0, 11.0, 9.0, 10.0, 1.0, i).unwrap())
        .collect();
    let last = g.batch(&bars).into_iter().flatten().last().unwrap();
    println!("upper={} lower={}", last.upper, last.lower);
    Ok(())
}
```

Output:

```
upper=0 lower=0
```

Every SMMA seeds to the constant median `10`, so both gaps are zero.

### Python

```python
import numpy as np
import wickra as ta

g = ta.GatorOscillator(13, 8, 5)
n = 40
hi = np.full(n, 11.0)
lo = np.full(n, 9.0)
cl = np.full(n, 10.0)
out = g.batch(hi, lo, cl)   # (40, 2): [upper, lower] rows, NaN for warmup
print(out[-1])              # [0. 0.]
```

Output:

```
[0. 0.]
```

### Node

```javascript
const ta = require('wickra');
const g = new ta.GatorOscillator(13, 8, 5);
let last = null;
for (let i = 0; i < 40; i++) last = g.update(11, 9, 10);
console.log(last); // { upper: 0, lower: 0 }
```

Output:

```
{ upper: 0, lower: 0 }
```

### Streaming

```rust
use wickra::{Candle, GatorOscillator, Indicator};

let mut g = GatorOscillator::classic();
let mut last = None;
for i in 0..80 {
    let base = 100.0 + f64::from(i);
    last = g.update(Candle::new(base, base + 1.0, base - 1.0, base, 1.0, i64::from(i))?);
}
println!("{last:?}");
# Ok::<(), Box<dyn std::error::Error>>(())
```

## Interpretation

The Gator turns the three Alligator lines into a single eat-or-sleep picture:

1. **Both bars growing — "eating".** The mouth is open and widening: a trend is
   in force; stay with it.
2. **Both bars shrinking — "sated".** The mouth is closing after a trend;
   momentum is fading, consider trimming.
3. **One bar growing, one shrinking — "awakening".** A transition; the Alligator
   may be waking from a range and a new trend may be starting.
4. **Both bars near zero — "sleeping".** Tight convergence; the market is
   range-bound — Bill Williams' advice is to stand aside.

## Common pitfalls

- **Reading bars in isolation.** The two histogram bars are a relationship
  between three averages; their colour-change pattern (growing vs. shrinking)
  carries the signal, not a single bar's height.
- **Price-unit scale.** The bars are in price units, so their absolute height is
  not comparable across instruments.
- **Display shift.** Wickra publishes the *unshifted* Alligator lines (see
  [`Indicator-Alligator`](/Indicators/Indicator-Alligator)); apply the classic forward shift
  on the chart side if you need the textbook visual.

## References

Bill Williams, *Trading Chaos*, 1995 — the Alligator and its Gator Oscillator.

## See also

- [Indicator-Alligator](/Indicators/Indicator-Alligator) — the three SMMA lines the Gator measures the spread of.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
