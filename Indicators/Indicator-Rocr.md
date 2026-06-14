# Rocr

> Rate of Change Ratio (`ROCR`) — `close / close[period]`, the momentum ratio
> relative to the price `period` bars ago.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Momentum Oscillators |
| Input type | `f64` (single close) |
| Output type | `f64` |
| Output range | `> 0`; `1` = no change, `> 1` advance, `< 1` decline |
| Default parameters | `period` is required |
| Warmup period | `period + 1` |
| Interpretation | A multiplicative momentum ratio: `1.05` means price is 1.05× its value `period` bars ago. |

## Formula

For `t >= period` (after warmup):

```
ROCR = close_t / close_{t-period}
```

This is [`Rocp`](/Indicators/Indicator-Rocp) plus one (`ROCR = 1 + ROCP`): the ratio form
centred on `1` rather than `0`. It is convenient for compounding, since chaining
two ratios multiplies them. Where the reference price `close_{t-period}` is zero
the result is guarded to `0`. See
`crates/wickra-core/src/indicators/rocr.rs`.

## Parameters

| Name | Type | Default | Valid range | Description | Source |
|------|------|---------|-------------|-------------|--------|
| `period` | `usize` | none | `>= 1` | Lookback distance in bars. `period = 0` errors with `Error::PeriodZero`. | `rocr.rs:40` |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/rocr.rs`:

```rust
use wickra::{Indicator, Rocr};
// Rocr: Input = f64, Output = f64
const _: fn(&mut Rocr, f64) -> Option<f64> = <Rocr as Indicator>::update;
```

Python streams as `float | None`, batches as a 1-D `numpy.ndarray` (`NaN` for
warmup). Node streams as `number | null`, batches as `Array<number>` with `NaN`
placeholders.

## Warmup

`Rocr::new(period).warmup_period() == period + 1` (the `accessors_report_config`
test pins `warmup_period() == 4` for `period = 3`). The first value is emitted at
input index `period` — the `(period + 1)`-th input — once a reference price
`period` bars back is available. The `known_value_is_a_ratio` test pins
`out[0] == None`.

## Edge cases

- **Zero reference price.** When `close[period] == 0` the division is guarded and
  the output is `0`. The unit test `zero_reference_price_reports_zero` pins this.
- **Constant series.** A flat price returns `1` for every emitted value. The unit
  test `constant_series_yields_one` pins this.
- **Non-finite input.** `NaN` / infinity inputs are ignored: they leave the
  window untouched and the last computed value is returned. The unit test
  `non_finite_input_holds_last` pins this.
- **Reset.** `r.reset()` clears the window and last value. The unit test
  `reset_clears_state` pins this.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, Rocr};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut r = Rocr::new(1)?;
    let out: Vec<Option<f64>> = r.batch(&[10.0, 11.0]);
    println!("{:?}", out);
    Ok(())
}
```

Output:

```
[None, Some(1.1)]
```

Period 1 over `[10, 11]`: `11 / 10 = 1.1`. This matches the
`known_value_is_a_ratio` unit test in
`crates/wickra-core/src/indicators/rocr.rs`.

### Python

```python
import numpy as np
import wickra as ta

r = ta.ROCR(1)
print(r.batch(np.array([10.0, 11.0])))
```

Output:

```
[nan 1.1]
```

### Node

```javascript
const ta = require('wickra');
const r = new ta.ROCR(1);
for (const x of [10, 11]) console.log(x, '->', r.update(x));
```

Output:

```
10 -> null
11 -> 1.1
```

## Interpretation

`Rocr` expresses momentum as a multiplier rather than a difference. Read `1.0` as
the flat line: above it price has advanced over the lookback, below it price has
declined. Because it is a ratio it composes naturally — multiplying successive
non-overlapping `ROCR` values reconstructs the cumulative price ratio. It is
unbounded above and bounded below by `0`, so it is asymmetric around its `1.0`
pivot (a halving reads `0.5`, a doubling reads `2.0`).

Choose `Rocr` over [`Rocp`](/Indicators/Indicator-Rocp) when you want a ratio centred on `1`;
choose [`Rocr100`](/Indicators/Indicator-Rocr100) when you prefer the same ratio rescaled so
the flat line sits at `100`.

## Common pitfalls

- **Asymmetry around `1`.** Equal-magnitude up and down moves are **not**
  symmetric: +10% is `1.10` but −10% is `0.90`, and a move that doubles then
  halves returns to `1.0` only because ratios multiply, not add. Do not average
  `ROCR` values arithmetically.
- **Reference-price zero.** A guarded `0` (not `NaN`) is returned when the
  lookback price is exactly zero.

## References

The Rate of Change Ratio is TA-Lib's `ROCR` function; it is the multiplicative
form of the Rate of Change momentum oscillator.

## See also

- [Indicator-Rocp](/Indicators/Indicator-Rocp) — the fractional form (`ROCR − 1`).
- [Indicator-Rocr100](/Indicators/Indicator-Rocr100) — the same ratio ×100.
- [Indicator-Roc](/Indicators/Indicator-Roc) — the percentage form.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
