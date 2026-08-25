# TrendLabel

> A discrete `{−1, 0, +1}` trend state from the sign of the rolling
> least-squares slope — scale-invariant.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trend & Directional |
| Input type | `f64` |
| Output type | `f64` (one of `−1.0`, `0.0`, `+1.0`) |
| Output range | `{−1, 0, +1}` |
| Default parameters | `period` is required (`>= 2`) |
| Warmup period | `period` |
| Interpretation | `+1` rising regression line, `−1` falling, `0` perfectly flat. |

## Formula

```
slope = Σ (tᵢ − t̄)(xᵢ − x̄) / Σ (tᵢ − t̄)²       (regress price on bar index)
label = +1 if slope > 0,  −1 if slope < 0,  0 if slope == 0
```

The sign of the regression slope is *scale-invariant* — it does not depend on
the nominal price level — making it a clean, comparable trend state across
instruments. The denominator `Σ(tᵢ − t̄)²` is strictly positive for `period >= 2`,
so the sign is always well-defined. It is the discrete companion to
[LinRegSlope](/Indicators/Indicator-LinRegSlope) (which returns the continuous slope).

Source: `crates/wickra-core/src/indicators/trend_label.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= 2`      | `trend_label.rs:52` | Regression window. `< 2` errors with `Error::InvalidPeriod`. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/trend_label.rs`:

```rust
use wickra::{Indicator, TrendLabel};
// TrendLabel: Input = f64, Output = f64
const _: fn(&mut TrendLabel, f64) -> Option<f64> = <TrendLabel as Indicator>::update;
```

Python streams as `float | None`, batches as an `array.array('d')`. Node streams
as `number | null`, batches as `Array<number>`.

## Warmup

`warmup_period() == period`. The unit test `accessors_and_metadata` pins
`warmup_period() == 10` for `period = 10`.

## Edge cases

- **Rising series.** A strictly rising series labels `+1`; pinned by
  `rising_series_is_plus_one`.
- **Falling series.** A strictly falling series labels `−1`; pinned by
  `falling_series_is_minus_one`.
- **Flat series.** A constant series labels `0`; pinned by `flat_series_is_zero`.
- **Scale invariance.** Multiplying the whole series by a constant cannot change
  the label; pinned by `scale_invariant_sign`.
- **Ternary output.** Output is always one of `{−1, 0, +1}`; pinned by
  `output_is_ternary`.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, TrendLabel};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut tl = TrendLabel::new(10)?;
    let prices: Vec<f64> = (0..20).map(f64::from).collect();
    println!("{:?}", tl.batch(&prices).into_iter().flatten().last());
    Ok(())
}
```

Output:

```
Some(1.0)
```

### Python

```python
import wickra as ta

tl = ta.TrendLabel(10)
last = None
for i in range(20):
    last = tl.update(float(i))
print(last)
```

Output:

```
1.0
```

### Node

```javascript
const ta = require('wickra');
const tl = new ta.TrendLabel(10);
let last = null;
for (let i = 0; i < 20; i++) last = tl.update(i);
console.log(last);
```

Output:

```
1
```

## Interpretation

`TrendLabel` is the categorical trend filter for feature pipelines and rule
engines that want a clean `{up, flat, down}` state instead of a continuous slope.
The sign is scale-invariant, so the same threshold works across instruments. Any
magnitude or dead-band tuning ("only count steep trends") should key on the raw
[LinRegSlope](/Indicators/Indicator-LinRegSlope), keeping `TrendLabel` as the pure sign.

## Common pitfalls

- **`0` is rare on real data.** A perfectly flat regression is unusual; expect
  almost always `±1`. If you want a dead-band around zero, threshold
  [LinRegSlope](/Indicators/Indicator-LinRegSlope) yourself.

## References

Ordinary-least-squares trend estimation; the slope-sign trend label is a common
feature-engineering primitive.

## See also

- [Indicator-LinRegSlope](/Indicators/Indicator-LinRegSlope) — the continuous slope.
- [Indicator-LinRegAngle](/Indicators/Indicator-LinRegAngle) — slope as an angle.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
