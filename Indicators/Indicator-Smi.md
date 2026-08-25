# SMI

> William Blau's Stochastic Momentum Index — a doubly-EMA-smoothed bounded
> oscillator measuring the close's displacement from the centre of the recent
> high-low range.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Momentum Oscillators |
| Input type | `Candle` (uses `high`, `low`, `close`) |
| Output type | `f64` |
| Output range | `[−100, 100]` in practice (by construction, not clamped) |
| Default parameters | `period = 5`, `d_period = 3`, `d2_period = 3` |
| Warmup period | `period + d_period + d2_period − 2` (`9` for defaults) |
| Interpretation | Positive in close-near-high markets, negative in close-near-low markets. |

## Formula

Over the lookback `period`, let `HH = max(high)`, `LL = min(low)`,
`C = (HH + LL) / 2`, `R = HH − LL`. The raw displacement is
`d_t = close_t − C_t`. Both `d` and `R` are smoothed twice with EMAs:

```
D_smoothed  = EMA(EMA(d, d_period), d2_period)
HL_smoothed = EMA(EMA(R, d_period), d2_period)
SMI         = 100 · D_smoothed / (HL_smoothed / 2)
```

Where a plain stochastic divides by the *raw* range, SMI divides the
*doubly-smoothed* displacement by the *doubly-smoothed* half-range — far less
jumpy than `%K`. Wickra publishes the SMI value only; the optional signal
`EMA(SMI, k)` is left to the consumer via [Chain](/Indicator-Chaining) or a
manual [Ema](/Indicators/Indicator-Ema).

## Parameters

| Name        | Type    | Default | Constraint | Source |
|-------------|---------|---------|------------|--------|
| `period`    | `usize` | `5`     | `>= 1`     | `Smi::new` (`smi.rs:60`) |
| `d_period`  | `usize` | `3`     | `>= 1`     | `smi.rs:60` |
| `d2_period` | `usize` | `3`     | `>= 1`     | `smi.rs:60` |

Any zero period returns [`Error::PeriodZero`]. `Smi::classic()` returns
`(5, 3, 3)`. Python defaults come from
`#[pyo3(signature = (period=5, d_period=3, d2_period=3))]`; the Node
constructor takes all three explicitly. The public class is `SMI` in both
bindings.

## Inputs / Outputs

```rust
use wickra::{Indicator, Smi, Candle};
// Smi: Input = Candle, Output = f64
const _: fn(&mut Smi, Candle) -> Option<f64> = <Smi as Indicator>::update;
```

Uses `high`, `low`, `close`.

- **Python.** `update(candle)` returns `float | None`;
  `batch(high, low, close)` returns an `array.array('d')` with `NaN`
  warmup.
- **Node.** `update(high, low, close)` returns `number | null`;
  `batch(high, low, close)` returns an `Array<number>` with `NaN` warmup.

## Warmup

`warmup_period()` returns `period + d_period + d2_period − 2`. The high-low
window needs `period` candles; both EMA stacks (fed in parallel) then need
`d_period + d2_period − 2` more values. For the defaults that is
`5 + 3 + 3 − 2 = 9`. Pinned by `warmup_emits_first_value_at_warmup_period`.

## Edge cases

- **Close at the high.** A rising series closing at its high drives SMI
  strongly positive (`> 50`) (test `close_at_high_pushes_toward_plus_100`).
- **Close at the low.** The mirror drives SMI strongly negative (`< −50`).
- **Flat close at range centre.** Displacement is `0` every bar ⇒ SMI = `0`
  (test `flat_close_yields_zero_displacement`).
- **Zero range.** A window where the smoothed range collapses to `0` makes
  the formula undefined; the indicator holds (test
  `zero_range_holds_previous_value`).
- **Reset.** `reset()` clears the high/low windows and all four EMAs.

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, Smi};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut smi = Smi::classic(); // (5, 3, 3)
    let mut last = None;
    for i in 0..40 {
        let p = 100.0 + f64::from(i);
        last = smi.update(Candle::new(p, p + 1.0, p - 1.0, p, 1.0, i64::from(i))?);
    }
    println!("{last:?}");
    Ok(())
}
```

### Python

```python
import wickra as ta
smi = ta.SMI(5, 3, 3)
out = smi.batch(high, low, close)  # 1-D series in ~[-100, 100], NaN warmup
```

### Node

```javascript
const ta = require('wickra');
const smi = new ta.SMI(5, 3, 3);
const v = smi.update(101, 99, 100); // high, low, close
```

## Interpretation

SMI is a smoother, ±100 reinterpretation of the classic stochastic:

1. **Overbought / oversold.** Readings near `+100` mean the close is parked
   near the top of the recent range (overbought); near `−100` the bottom.
   Common thresholds are `±40`.
2. **Zero-line and signal crosses.** A cross of zero marks the close moving
   from the lower to the upper half of the range; pairing SMI with its own
   `EMA` signal line gives Blau's crossover entries with far less whipsaw
   than raw `%K`/`%D`.

## Common pitfalls

- **Expecting hard clamping.** SMI is bounded `[−100, 100]` only by
  construction on well-behaved data; it is not explicitly clamped, so
  pathological inputs can stray slightly.
- **Confusing it with a plain stochastic.** The double EMA smoothing makes
  SMI lag a raw stochastic — that lag is the point.

## References

- William Blau, "The Stochastic Momentum Index", *Technical Analysis of
  Stocks & Commodities*, 1993.

## See also

- [Stochastic](/Indicators/Indicator-Stochastic) — the raw `%K`/`%D` SMI smooths.
- [StochRsi](/Indicators/Indicator-StochRsi) — stochastic applied to RSI.
- [Tsi](/Indicators/Indicator-Tsi) — Blau's True Strength Index, the same double-EMA idea
  on momentum.
