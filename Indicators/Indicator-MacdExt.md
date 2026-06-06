# MacdExt

> MACD Extended (`MACDEXT`) — MACD with an independently selectable moving-average
> type (SMA / EMA / WMA / DEMA / TEMA / TRIMA) for each of the fast, slow and
> signal lines.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trend & Directional |
| Input type | `f64` (single close) |
| Output type | `MacdOutput { macd, signal, histogram }` |
| Output range | unbounded; `histogram = macd − signal` |
| Default parameters | none — all three periods and all three MA types are required |
| Warmup period | `slow.warmup_period() + signal.warmup_period()` (`>= 26` at the classic lengths) |
| Interpretation | A generalised MACD: swap the EMA for any period-only moving average per line. |

## Formula

```
fast_ma   = MA_fast(close, fast_period)      // type = fast_type
slow_ma   = MA_slow(close, slow_period)      // type = slow_type
macd      = fast_ma − slow_ma
signal    = MA_signal(macd, signal_period)   // type = signal_type
histogram = macd − signal
```

Each of the three lines uses a separately chosen moving-average type. The
selectable types are the **period-only** moving averages, matching TA-Lib's
`MA_Type` codes `0..=5`:

| `MaType` | TA-Lib code | Moving average |
|----------|-------------|----------------|
| `Sma` | `0` | Simple |
| `Ema` | `1` | Exponential |
| `Wma` | `2` | Weighted |
| `Dema` | `3` | Double exponential |
| `Tema` | `4` | Triple exponential |
| `Trima` | `5` | Triangular |

(TA-Lib's KAMA / MAMA / T3 take extra shape parameters and are **not** selectable
here; codes `6..=8` are rejected.) With all three types set to `Ema` and periods
`12, 26, 9`, `MacdExt` reproduces the classic MACD. See
`crates/wickra-core/src/indicators/macd_ext.rs`.

## Parameters

| Name | Type | Default | Valid range | Description | Source |
|------|------|---------|-------------|-------------|--------|
| `fast` / `slow` / `signal` | `usize` | none | `>= 1`, `fast < slow` | The three periods. Any zero errors with `Error::PeriodZero`; `fast >= slow` errors with `Error::InvalidPeriod`. | `macd_ext.rs:158` |
| `fast_type` / `slow_type` / `signal_type` | `MaType` | none | `Sma..=Trima` | Moving-average type per line. `MaType::from_code` rejects codes outside `0..=5` with `Error::InvalidPeriod`. | `macd_ext.rs:40` |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/macd_ext.rs`:

```rust
use wickra::{Indicator, MacdExt, MaType};
use wickra::MacdOutput;
// MacdExt: Input = f64, Output = MacdOutput
const _: fn(&mut MacdExt, f64) -> Option<MacdOutput> = <MacdExt as Indicator>::update;
```

In Python the constructor takes the three periods interleaved with their TA-Lib
MA-type codes — `MacdExt(fast, fast_matype, slow, slow_matype, signal,
signal_matype)`; `update` returns a `(macd, signal, histogram)` tuple and `batch`
an `(n, 3)` `numpy.ndarray`. Node mirrors this and returns a `{ macd, signal,
histogram }` object from `update`.

## Warmup

`MacdExt::new(...).warmup_period()` is `slow.warmup_period() +
signal.warmup_period()`, so it depends on the chosen periods and types and is at
least `26` at the classic lengths. The unit test `accessors_and_metadata` pins
`warmup_period() >= 26`.

## Edge cases

- **Histogram identity holds for every MA type.** For all six types the emitted
  `histogram` equals `macd − signal` to floating-point tolerance. The unit test
  `every_ma_type_produces_a_consistent_histogram` pins this.
- **Mixed types per line.** Each line can use a different MA type (e.g. WMA fast,
  SMA slow, EMA signal). The unit test `mixed_ma_types_per_line` pins this.
- **Code mapping.** `MaType::from_code(0..=5)` maps to the six types; `6` and
  above error. The unit test `from_code_maps_all_supported_types` pins this.
- **Invalid periods.** A zero period or `fast >= slow` is rejected at
  construction. The unit test `rejects_invalid_periods` pins this.
- **Constant series.** Once warmed, a flat price gives `(0, 0, 0)` for any MA
  type. See the example below.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, MacdExt, MaType};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Classic 12/26/9 but with a WMA fast line and an SMA signal line.
    let mut m = MacdExt::new(12, MaType::Wma, 26, MaType::Ema, 9, MaType::Sma)?;
    let out = m.batch(&[100.0; 60]);
    println!("{:?}", out.last().unwrap());
    Ok(())
}
```

Output:

```
Some(MacdOutput { macd: 0.0, signal: 0.0, histogram: 0.0 })
```

On a constant series every moving average converges to the constant, so
`macd = 0`, `signal = 0`, `histogram = 0` regardless of the chosen types. On real
data the lines diverge; `histogram = macd − signal` always holds.

### Python

```python
import numpy as np
import wickra as ta

# fast=12 WMA(2), slow=26 EMA(1), signal=9 SMA(0)
m = ta.MacdExt(12, 2, 26, 1, 9, 0)
out = m.batch(np.full(60, 100.0))   # (60, 3) array
print(out[-1])
```

Output:

```
[0. 0. 0.]
```

### Node

```javascript
const ta = require('wickra');
// fast=12 WMA(2), slow=26 EMA(1), signal=9 SMA(0)
const m = new ta.MacdExt(12, 2, 26, 1, 9, 0);
let last = null;
for (let i = 0; i < 60; i++) last = m.update(100);
console.log(last);
```

Output:

```
{ macd: 0, signal: 0, histogram: 0 }
```

## Interpretation

`MacdExt` is the MACD for traders who want to control its smoothing character.
Choosing a faster MA type (WMA, DEMA, TEMA) on the fast/slow lines reduces lag at
the cost of more whipsaw; a TRIMA or SMA signal line smooths the trigger.
Otherwise read it exactly like the classic MACD — `macd`/`signal` crossovers,
zero-line crossovers, and histogram momentum. Set all three types to `Ema` with
`12, 26, 9` to recover [`MacdFix`](/Indicators/Indicator-MacdFix) / the standard MACD.

## Common pitfalls

- **Unsupported MA codes.** Only codes `0..=5` (the period-only averages) are
  valid; KAMA / MAMA / T3 (`6..=8`) are rejected because they need extra
  parameters.
- **`fast >= slow`.** The fast period must be strictly shorter than the slow
  period, or construction fails.
- **Comparing warmups across configs.** Warmup depends on the slow and signal
  types (DEMA/TEMA need longer seeding than SMA), so two `MacdExt` instances can
  start emitting at different bars.

## References

Gerald Appel's MACD (1979); the selectable-MA generalisation matches TA-Lib's
`MACDEXT` and its `MA_Type` codes.

## See also

- [Indicator-MacdIndicator](/Indicators/Indicator-MacdIndicator) — the fully configurable EMA MACD.
- [Indicator-MacdFix](/Indicators/Indicator-MacdFix) — the fixed 12/26 MACD.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
