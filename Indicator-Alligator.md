# Alligator

> Bill Williams' Alligator — three SMMA lines (Jaw / Teeth / Lips) of the
> median price `(high + low) / 2` with different smoothing periods.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Moving Averages |
| Input type | `Candle` (uses `high` and `low`) |
| Output type | `AlligatorOutput { jaw, teeth, lips }` |
| Output range | unbounded; tracks the input price scale |
| Default parameters | `jaw = 13`, `teeth = 8`, `lips = 5` |
| Warmup period | `max(jaw, teeth, lips)` (`13` for classic) |
| Interpretation | Three SMMA lines whose interleaving signals the Alligator state (sleeping / awakening / eating). |

## Formula

```
median_t = (high_t + low_t) / 2

Jaw_t   = SMMA(median, jaw_period)_t
Teeth_t = SMMA(median, teeth_period)_t
Lips_t  = SMMA(median, lips_period)_t
```

[Smma](Indicator-Smma) is Wilder's smoothed moving average (RMA), SMA-seeded
with a `1 / period` smoothing factor. Williams' chart presentation also shifts
each line forward (Jaw +8, Teeth +5, Lips +3); Wickra publishes the
**unshifted** SMMA values — the visual shift is a chart convention left to the
consumer.

## Parameters

| Name           | Type    | Default | Constraint | Source |
|----------------|---------|---------|------------|--------|
| `jaw_period`   | `usize` | `13`    | `>= 1`     | `Alligator::new` (`alligator.rs:59`) |
| `teeth_period` | `usize` | `8`     | `>= 1`     | `alligator.rs:59` |
| `lips_period`  | `usize` | `5`     | `>= 1`     | `alligator.rs:59` |

Any zero period returns [`Error::PeriodZero`]. `Alligator::classic()` returns
`(13, 8, 5)`. Python defaults come from
`#[pyo3(signature = (jaw=13, teeth=8, lips=5))]`; the Node constructor takes
all three explicitly. The public class is `Alligator` in both bindings.

## Inputs / Outputs

```rust
impl Indicator for Alligator {
    type Input  = Candle;
    type Output = AlligatorOutput;
    fn update(&mut self, candle: Candle) -> Option<AlligatorOutput>;
}

pub struct AlligatorOutput { pub jaw: f64, pub teeth: f64, pub lips: f64 }
```

Uses `high` and `low` (the median price).

- **Python.** `update(candle)` returns `(jaw, teeth, lips)` or `None`;
  `batch(high, low)` returns an `(n, 3)` `np.ndarray` with columns
  `[jaw, teeth, lips]`; warmup rows are `NaN`.
- **Node.** `update(high, low)` returns a `{ jaw, teeth, lips }` object or
  `null`; `batch(high, low)` returns a flat `Array<number>` of length `3n`,
  interleaved `[jaw0, teeth0, lips0, …]`.

## Warmup

All three SMMAs see every bar (fed unconditionally so they warm in parallel),
so readiness is gated by the longest period — the Jaw. `warmup_period()`
returns `max(jaw, teeth, lips)` (`13` for classic). Pinned by
`warmup_emits_first_value_at_longest_period`.

## Edge cases

- **Constant median.** A constant `(high + low) / 2` makes all three SMMAs
  seed to that constant and hold (test `constant_series_yields_the_constant`).
- **Pure uptrend ordering.** On a clean uptrend the fastest line leads:
  `lips > teeth > jaw` at the latest bar (test `pure_uptrend_ordering`).
- **Reset.** `reset()` resets all three SMMAs.

## Examples

### Rust

```rust
use wickra::{Alligator, BatchExt, Candle, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let candles: Vec<Candle> = (0..80)
        .map(|i| {
            let base = 100.0 + f64::from(i);
            Candle::new(base, base + 1.0, base - 1.0, base, 1.0, i64::from(i)).unwrap()
        })
        .collect();
    let mut a = Alligator::classic(); // (13, 8, 5)
    if let Some(o) = a.batch(&candles).into_iter().flatten().last() {
        println!("jaw={:.2} teeth={:.2} lips={:.2}", o.jaw, o.teeth, o.lips);
    }
    Ok(())
}
```

### Python

```python
import wickra as ta
a = ta.Alligator(13, 8, 5)
out = a.batch(high, low)  # shape (n, 3): [jaw, teeth, lips]
```

### Node

```javascript
const ta = require('wickra');
const a = new ta.Alligator(13, 8, 5);
const o = a.update(101, 99); // high, low → { jaw, teeth, lips } or null
```

## Interpretation

Williams read the three lines as a sleeping/feeding alligator:

1. **Sleeping (ranging).** The three SMMAs are intertwined and flat — no
   trend; stay out.
2. **Awakening / eating (trending).** The lines fan out in order
   (`lips`/`teeth`/`jaw` for an uptrend, reversed for a downtrend) and widen —
   ride the trend while the mouth stays open.
3. **Sated.** The lines converge again — the move is ending.

Williams paired the Alligator with fractals
([FractalChaosBands](Indicator-FractalChaosBands)): a fractal breakout
*outside* the mouth is a trade; one inside is ignored.

## Common pitfalls

- **Forgetting the chart shift.** Wickra's lines are unshifted; if you compare
  against a charting package that displays the shifted Alligator (Jaw +8 etc.),
  apply the forward shift yourself before lining them up.
- **Trading the intertwined state.** Overlapping lines mean "sleeping" — the
  Alligator is explicitly a *don't-trade* signal there.

## References

- Bill Williams, *Trading Chaos*, Wiley, 1995.

## See also

- [Smma](Indicator-Smma) — the smoothed moving average each line uses.
- [FractalChaosBands](Indicator-FractalChaosBands) — Williams' fractals,
  the Alligator's usual partner.
- [AwesomeOscillator](Indicator-AwesomeOscillator) — Williams' momentum gauge.
