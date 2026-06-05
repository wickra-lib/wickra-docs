# WickRatio

> The signed imbalance between the upper and lower shadows as a fraction of the
> bar range — the rejection asymmetry of a candle.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Statistics |
| Input type | `Candle` |
| Output type | `f64` |
| Output range | `[−1, +1]` |
| Default parameters | none (stateless per-bar transform) |
| Warmup period | `1` |
| Interpretation | `+1` all upper shadow (shooting-star); `−1` all lower shadow (hammer); `0` symmetric / wickless. |

## Formula

```
upper_wick  = high − max(open, close)
lower_wick  = min(open, close) − low
WickRatio   = (upper_wick − lower_wick) / (high − low)
```

Where [BodySizePct](/Indicators/Indicator-BodySizePct) measures how much of the range is
body, this measures *which side* the wicks fall on — the rejection asymmetry many
reversal setups depend on. A zero-range bar yields `0`.

Source: `crates/wickra-core/src/indicators/wick_ratio.rs`.

## Parameters

None. The constructor is `WickRatio::new()`.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/wick_ratio.rs`:

```rust
use wickra::{Candle, Indicator, WickRatio};
// WickRatio: Input = Candle, Output = f64
const _: fn(&mut WickRatio, Candle) -> Option<f64> = <WickRatio as Indicator>::update;
```

Node `update(open, high, low, close)` / `batch(open[], high[], low[], close[])`;
Python `update(candle)` / `batch(open, high, low, close)` → 1-D `ndarray`.

## Warmup

`warmup_period() == 1`; the unit test `emits_from_first_candle` pins it.

## Edge cases

- **Upper-shadow dominance.** A long upper wick gives a positive reading
  (`+2.5/3` for the test bar); pinned by `upper_shadow_dominates_is_positive`.
- **Lower-shadow dominance.** A hammer gives a negative reading; pinned by
  `lower_shadow_dominates_is_negative`.
- **Symmetric wicks.** Equal shadows give `0`; pinned by `symmetric_wicks_are_zero`.
- **Zero-range bar.** `high == low` yields `0`; pinned by `zero_range_bar_yields_zero`.
- **Bounds.** Output is always in `[−1, 1]` (since `|upper − lower| <= range`);
  pinned by `stays_within_unit_range`.

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, WickRatio};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut wr = WickRatio::new();
    // upper 13 - 10.5 = 2.5, lower 10 - 10 = 0, range 3 -> +0.8333.
    let c = Candle::new(10.0, 13.0, 10.0, 10.5, 10.0, 0)?;
    println!("{:?}", wr.update(c));
    Ok(())
}
```

Output:

```
Some(0.8333333333333334)
```

### Python

```python
import wickra as ta

wr = ta.WickRatio()
print(wr.batch([10.0], [13.0], [10.0], [10.5]))
```

Output:

```
[0.83333333]
```

### Node

```javascript
const ta = require('wickra');
const wr = new ta.WickRatio();
console.log(wr.update(10, 13, 10, 10.5));
```

Output:

```
0.8333333333333334
```

## Interpretation

`WickRatio` captures intrabar rejection: a strongly positive reading is a long
upper shadow (sellers rejected higher prices — shooting-star geometry), a
strongly negative reading a long lower shadow (buyers rejected lower prices —
hammer geometry). Combine with [BodySizePct](/Indicators/Indicator-BodySizePct) (a small
body plus a one-sided wick is the canonical pin-bar) to build reversal filters.

## Common pitfalls

- **Not a pattern detector.** This is a continuous geometry feature, not a
  yes/no pattern — threshold it yourself, or use the dedicated candlestick
  pattern indicators (e.g. [Indicator-Hammer](/Indicators/Indicator-Hammer)).

## References

Candlestick shadow / rejection geometry; Nison (1991).

## See also

- [Indicator-BodySizePct](/Indicators/Indicator-BodySizePct) — body fill.
- [Indicator-Hammer](/Indicators/Indicator-Hammer) — a dedicated lower-shadow pattern.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
