# FractalChaosBands

> A step-function envelope of the most recent Bill Williams fractal
> highs and lows. The bands ratchet outwards as new fractals form and
> otherwise stay flat — a swing-level reference rather than a
> volatility envelope.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Bands & Channels |
| Input type | `Candle` (uses `high`, `low`) |
| Output type | `FractalChaosBandsOutput { upper, lower }` |
| Output range | unbounded; `upper ≥ lower` |
| Default parameters | `k = 2` (5-bar fractals) |
| Warmup period | `2k + 1`, plus enough bars for at least one fractal of each kind |
| Interpretation | Most recent confirmed swing high / swing low. Breakouts often used as Williams-style entries. |

## Formula

A bar at index `i` is a **fractal high** when its high is the strict
maximum of the window `[i − k, …, i + k]`. A **fractal low** is
defined symmetrically on lows.

```
confirmation_lag = k                     // the centre bar is known only k bars later
upper = high of the most recent confirmed fractal high
lower = low  of the most recent confirmed fractal low
```

Comparison is strict (`>` for the high, `<` for the low) so flat tops and
bottoms do not register as fractals. With `k` bars of look-ahead, every band
update reflects price `k` bars ago — strict streaming preserves this lag
rather than peeking into the future. `k = 2` (5-bar fractals) is the
canonical Williams setting and matches the "Fractal Chaos Bands" indicator
shipped with several chart vendors.

## Parameters

| Name | Type    | Default | Constraint | Source |
|------|---------|---------|------------|--------|
| `k`  | `usize` | `2`     | `>= 1`     | `FractalChaosBands::new` (`fractal_chaos_bands.rs:71`) |

`k == 0` returns [`Error::PeriodZero`] (a single bar is its own trivial
fractal). `FractalChaosBands::classic()` returns `k = 2`. Python default comes
from `#[pyo3(signature = (k=2))]`; the Node constructor takes `k` explicitly.

## Inputs / Outputs

```rust
use wickra::{Indicator, FractalChaosBands, Candle, FractalChaosBandsOutput};
// FractalChaosBands: Input = Candle, Output = FractalChaosBandsOutput
const _: fn(&mut FractalChaosBands, Candle) -> Option<FractalChaosBandsOutput> = <FractalChaosBands as Indicator>::update;
```

- **Python streaming.** `update(candle)` returns `(upper, lower)` or `None`.
- **Python batch.** `FractalChaosBands.batch(high, low)` returns an `(n, 2)`
  `np.ndarray` with columns `[upper, lower]`; rows before both bands confirm
  are `NaN`.
- **Node streaming.** `update(high, low)` returns a `{ upper, lower }` object
  or `null`.
- **Node batch.** `batch(high, low)` returns a flat `Array<number>` of
  length `n * 2`, interleaved `[upper0, lower0, …]`.

Only `high` and `low` are consumed, so both bindings take just those two
series (no `close`/`volume`).

## Warmup

`warmup_period()` returns `2k + 1` — the window size needed to evaluate the
centre bar against `k` neighbours on each side. But emission also requires at
least one confirmed fractal high *and* one confirmed fractal low, so the
first non-`None` output can land later than `2k + 1` on data without an early
swing of each kind (see the example below, where both bands first set on
index 5 for `k = 2`).

## Edge cases

- **Flat market.** No bar is strictly higher (or lower) than its neighbours,
  so no fractal ever confirms and the indicator never emits (test
  `flat_market_never_emits`).
- **Both bands required.** `update` returns `None` until at least one fractal
  high and one fractal low have been seen — neither band is reported in
  isolation under the Wickra streaming contract.
- **Ordering.** Once both are set, `upper >= lower` (test
  `upper_above_lower_when_both_set`).
- **Reset.** `reset()` clears the window and both last-fractal slots.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, FractalChaosBands, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // (high, low, close): a peak at index 2 (high 5) and a trough at index 3 (low 0.5).
    let mk = |h: f64, l: f64, c: f64| Candle::new(c, h, l, c, 1.0, 0).unwrap();
    let candles = vec![
        mk(1.0, 1.0, 1.0), mk(2.0, 2.0, 2.0), mk(5.0, 3.0, 4.0),
        mk(3.0, 0.5, 1.0), mk(2.0, 2.0, 2.0), mk(1.0, 1.0, 1.0), mk(2.0, 2.0, 2.0),
    ];
    let mut f = FractalChaosBands::new(2)?;
    for (i, v) in f.batch(&candles).into_iter().enumerate() {
        println!("i={i} -> {:?}", v);
    }
    Ok(())
}
```

Output (abridged):

```
i=0 -> None
...
i=4 -> None
i=5 -> Some(FractalChaosBandsOutput { upper: 5.0, lower: 0.5 })
```

The peak at index 2 confirms once index 4 lands; the trough at index 3
confirms once index 5 lands, so index 5 is the first bar with *both* bands
set (test `detects_simple_peak_and_trough`).

### Python

```python
import numpy as np
import wickra as ta

f = ta.FractalChaosBands(2)
high = np.array([1, 2, 5, 3, 2, 1, 2], dtype=float)
low  = np.array([1, 2, 3, 0.5, 2, 1, 2], dtype=float)
print(f.batch(high, low)[5])  # [5.  0.5]
```

### Node

```javascript
const ta = require('wickra');
const f = new ta.FractalChaosBands(2);
const highs = [1, 2, 5, 3, 2, 1, 2];
const lows  = [1, 2, 3, 0.5, 2, 1, 2];
let last = null;
for (let i = 0; i < highs.length; i++) last = f.update(highs[i], lows[i]);
console.log(last); // { upper: 5, lower: 0.5 }
```

## Interpretation

Fractal Chaos Bands expose the most recent *confirmed* swing structure as a
flat-stepping envelope:

1. **Swing levels.** `upper` is the last confirmed swing high, `lower` the
   last confirmed swing low — natural breakout triggers and stop placements.
2. **Williams system.** Williams pairs fractals with his
   [Alligator](/Indicators/Indicator-Alligator): a fractal breakout *outside* the
   Alligator's mouth is a trade signal, while one inside is ignored.

Because confirmation lags by `k` bars, treat the bands as a *structural*
reference, not a real-time trigger — the level is real, but it was set `k`
bars ago.

## Common pitfalls

- **Expecting an every-bar update.** The bands only step when a new fractal
  confirms; between fractals they are deliberately flat. For an every-bar
  rolling extreme use [Donchian](/Indicators/Indicator-Donchian) instead.
- **Forgetting the lag.** A "breakout" of the upper band is a break of a
  level that crystallised `k` bars in the past — not a break of the current
  bar's high.

## References

- Bill Williams, *Trading Chaos: Maximize Profits with Proven Technical
  Techniques*, Wiley, 1995. Williams' fractal definition underpins his
  Alligator + Awesome Oscillator system; the "Fractal Chaos Bands" naming
  convention comes from later chart-vendor implementations.

## See also

- [Donchian](/Indicators/Indicator-Donchian) — every-bar rolling high/low (no fractal
  confirmation).
- [WilliamsFractals](/Indicators/Indicator-WilliamsFractals) — the raw fractal markers.
- [Alligator](/Indicators/Indicator-Alligator) — Williams' moving-average triplet,
  often paired with fractals.
- [AwesomeOscillator](/Indicators/Indicator-AwesomeOscillator) — Williams' momentum
  reading.
