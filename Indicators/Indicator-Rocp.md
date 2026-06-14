# Rocp

> Rate of Change Percentage (`ROCP`) — `(close − close[period]) / close[period]`,
> the same momentum measure as `Roc` expressed as a raw fraction.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Momentum Oscillators |
| Input type | `f64` (single close) |
| Output type | `f64` |
| Output range | unbounded; `0` = no change, `> 0` advance, `< 0` decline |
| Default parameters | `period` is required |
| Warmup period | `period + 1` |
| Interpretation | Fractional momentum: `0.05` means price is 5% above where it was `period` bars ago. |

## Formula

For `t >= period` (after warmup):

```
ROCP = (close_t − close_{t-period}) / close_{t-period}
```

This is exactly [`Roc`](/Indicators/Indicator-Roc) divided by 100 — `Roc = 100 · ROCP`. The
fractional form is convenient when you want to compound or combine momentum with
other fractional quantities (e.g. returns) without rescaling. Where the
reference price `close_{t-period}` is zero the result is guarded to `0`. See
`crates/wickra-core/src/indicators/rocp.rs`.

## Parameters

| Name | Type | Default | Valid range | Description | Source |
|------|------|---------|-------------|-------------|--------|
| `period` | `usize` | none | `>= 1` | Lookback distance in bars. `period = 0` errors with `Error::PeriodZero`. | `rocp.rs:40` |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/rocp.rs`:

```rust
use wickra::{Indicator, Rocp};
// Rocp: Input = f64, Output = f64
const _: fn(&mut Rocp, f64) -> Option<f64> = <Rocp as Indicator>::update;
```

Python streams as `float | None`, batches as a 1-D `numpy.ndarray` (`NaN` for
warmup). Node streams as `number | null`, batches as `Array<number>` with `NaN`
placeholders.

## Warmup

`Rocp::new(period).warmup_period() == period + 1` (the `accessors_report_config`
test pins `warmup_period() == 4` for `period = 3`). The first value is emitted at
input index `period` — the `(period + 1)`-th input — once a reference price
`period` bars back is available. The `known_value_is_a_fraction` test pins
`out[0] == None`.

## Edge cases

- **Zero reference price.** When `close[period] == 0` the division is guarded and
  the output is `0` rather than infinity/`NaN`. The unit test
  `zero_reference_price_reports_zero` pins this (`[0, 5]`, period 1 → `0`).
- **Constant series.** A flat price returns `0` for every emitted value. The
  unit test `constant_series_yields_zero` pins this.
- **Non-finite input.** `NaN` / infinity inputs are ignored: they leave the
  window untouched and the last computed value is returned, matching the SMA /
  EMA convention. The unit test `non_finite_input_holds_last` pins this.
- **Reset.** `r.reset()` clears the window and last value. The unit test
  `reset_clears_state` pins this.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, Rocp};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut r = Rocp::new(1)?;
    let out: Vec<Option<f64>> = r.batch(&[10.0, 11.0]);
    println!("{:?}", out);
    Ok(())
}
```

Output:

```
[None, Some(0.1)]
```

Period 1 over `[10, 11]`: `(11 − 10) / 10 = 0.1`. This matches the
`known_value_is_a_fraction` unit test in
`crates/wickra-core/src/indicators/rocp.rs`.

### Python

```python
import numpy as np
import wickra as ta

r = ta.ROCP(1)
print(r.batch(np.array([10.0, 11.0])))
```

Output:

```
[ nan 0.1]
```

### Node

```javascript
const ta = require('wickra');
const r = new ta.ROCP(1);
for (const x of [10, 11]) console.log(x, '->', r.update(x));
```

Output:

```
10 -> null
11 -> 0.1
```

## Interpretation

`Rocp` is plain momentum on a fractional scale. Read it as a percentage change:
`0.1` is +10% versus `period` bars ago, `-0.1` is −10%. Zero crossings mark where
price returns to its level `period` bars back; the magnitude is the strength of
the move. Because it is unbounded it is best used for divergence, threshold
breaks, or as a feature fed into downstream models rather than as an
overbought/oversold gauge.

Choose `Rocp` over [`Roc`](/Indicators/Indicator-Roc) when you want a fraction (0.05) rather
than a percentage (5.0); choose [`Rocr`](/Indicators/Indicator-Rocr) /
[`Rocr100`](/Indicators/Indicator-Rocr100) when you want the ratio form centred on `1` / `100`.

## Common pitfalls

- **Scale confusion with `Roc`.** `Rocp` is `Roc / 100`. A 5% move reads `0.05`
  here and `5.0` from `Roc`; do not compare thresholds across the two without
  rescaling.
- **Reference-price zero.** A guarded `0` (not an error or `NaN`) is returned
  when the lookback price is exactly zero — relevant for spreads or de-meaned
  series that can cross zero.

## References

The Rate of Change Percentage is TA-Lib's `ROCP` function; it is the fractional
form of the classic Rate of Change momentum oscillator.

## See also

- [Indicator-Roc](/Indicators/Indicator-Roc) — the percentage form (`100 · ROCP`).
- [Indicator-Rocr](/Indicators/Indicator-Rocr) — the ratio form (`close / close[period]`).
- [Indicator-Rocr100](/Indicators/Indicator-Rocr100) — the ratio form ×100.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
