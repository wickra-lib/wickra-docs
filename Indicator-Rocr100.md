# Rocr100

> Rate of Change Ratio × 100 (`ROCR100`) — `close / close[period] · 100`, the
> momentum ratio rescaled so an unchanged price reads `100`.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Momentum Oscillators |
| Input type | `f64` (single close) |
| Output type | `f64` |
| Output range | `> 0`; `100` = no change, `> 100` advance, `< 100` decline |
| Default parameters | `period` is required |
| Warmup period | `period + 1` |
| Interpretation | A percent-of-reference momentum: `105` means price is 105% of its value `period` bars ago. |

## Formula

For `t >= period` (after warmup):

```
ROCR100 = (close_t / close_{t-period}) · 100
```

This is [`Rocr`](Indicator-Rocr) scaled by 100, so the flat line moves from `1`
to `100`: `> 100` is an advance, `< 100` a decline. The `× 100` rescaling makes
the series read like a "percent of the reference price" and lines up visually
with percentage-style oscillators. Where the reference price is zero the result
is guarded to `0`. See `crates/wickra-core/src/indicators/rocr100.rs`.

## Parameters

| Name | Type | Default | Valid range | Description | Source |
|------|------|---------|-------------|-------------|--------|
| `period` | `usize` | none | `>= 1` | Lookback distance in bars. `period = 0` errors with `Error::PeriodZero`. | `rocr100.rs:40` |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/rocr100.rs`:

```rust
use wickra::{Indicator, Rocr100};
// Rocr100: Input = f64, Output = f64
const _: fn(&mut Rocr100, f64) -> Option<f64> = <Rocr100 as Indicator>::update;
```

Python streams as `float | None`, batches as a 1-D `numpy.ndarray` (`NaN` for
warmup). Node streams as `number | null`, batches as `Array<number>` with `NaN`
placeholders.

## Warmup

`Rocr100::new(period).warmup_period() == period + 1` (the
`accessors_report_config` test pins `warmup_period() == 4` for `period = 3`). The
first value is emitted at input index `period` — the `(period + 1)`-th input —
once a reference price `period` bars back is available. The
`known_value_is_a_scaled_ratio` test pins `out[0] == None`.

## Edge cases

- **Zero reference price.** When `close[period] == 0` the division is guarded and
  the output is `0`. The unit test `zero_reference_price_reports_zero` pins this.
- **Constant series.** A flat price returns `100` for every emitted value. The
  unit test `constant_series_yields_one_hundred` pins this.
- **Non-finite input.** `NaN` / infinity inputs are ignored: they leave the
  window untouched and the last computed value is returned. The unit test
  `non_finite_input_holds_last` pins this.
- **Reset.** `r.reset()` clears the window and last value. The unit test
  `reset_clears_state` pins this.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, Rocr100};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut r = Rocr100::new(1)?;
    let out: Vec<Option<f64>> = r.batch(&[10.0, 11.0]);
    println!("{:?}", out);
    Ok(())
}
```

Output:

```
[None, Some(110.0)]
```

Period 1 over `[10, 11]`: `11 / 10 · 100 = 110`. This matches the
`known_value_is_a_scaled_ratio` unit test in
`crates/wickra-core/src/indicators/rocr100.rs`.

### Python

```python
import numpy as np
import wickra as ta

r = ta.Rocr100(1)
print(r.batch(np.array([10.0, 11.0])))
```

Output:

```
[ nan 110.]
```

### Node

```javascript
const ta = require('wickra');
const r = new ta.Rocr100(1);
for (const x of [10, 11]) console.log(x, '->', r.update(x));
```

Output:

```
10 -> null
11 -> 110
```

## Interpretation

`Rocr100` is identical in shape to [`Rocr`](Indicator-Rocr) but reads on a
`100`-centred scale, which many traders find more intuitive: `110` is "price is
110% of where it was", `90` is "90%". The `100` line is the flat reference;
crossings mark a return to the lookback price. As with `Rocr`, the scale is
multiplicative and asymmetric — a halving reads `50`, a doubling `200`.

Pick whichever of `Rocp` / `Rocr` / `Rocr100` matches the scale your downstream
logic expects; they carry identical information.

## Common pitfalls

- **Reading it as a percentage change.** `ROCR100` is the *ratio* ×100, not the
  *change* ×100. A +10% move reads `110`, not `10`; the percentage change is
  `ROCR100 − 100` (here `10`), which is [`Roc`](Indicator-Roc).
- **Asymmetry around `100`.** Equal up/down moves are not symmetric on this
  scale (+10% → `110`, −10% → `90`, but the geometric pivot is `100`).

## References

The Rate of Change Ratio ×100 is TA-Lib's `ROCR100` function.

## See also

- [Indicator-Rocr](Indicator-Rocr) — the same ratio centred on `1`.
- [Indicator-Rocp](Indicator-Rocp) — the fractional form.
- [Indicator-Roc](Indicator-Roc) — the percentage-change form (`ROCR100 − 100`).
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
