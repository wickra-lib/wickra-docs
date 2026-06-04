# HighLowRange

> The bar's high-low range as a fraction of its close: `(high − low) / close` —
> a scale-free single-bar volatility proxy.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Statistics |
| Input type | `Candle` |
| Output type | `f64` |
| Output range | `>= 0` (for positive prices) |
| Default parameters | none (stateless per-bar transform) |
| Warmup period | `1` |
| Interpretation | Larger = wider bar relative to price; an instant intrabar volatility read. |

## Formula

```
HighLowRange = (high − low) / close
```

The absolute range `high − low` grows with the nominal price level, so dividing
by the close makes a `2` range on a `100` instrument (`0.02`) directly
comparable to a `200` range on a `10000` one (`0.02`). It is the per-bar cousin
of average-true-range style measures without the smoothing. A zero close carries
no scale and yields `0`.

Source: `crates/wickra-core/src/indicators/high_low_range.rs`.

## Parameters

None. The constructor is `HighLowRange::new()`.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/high_low_range.rs`:

```rust
use wickra::{Candle, HighLowRange, Indicator};
// HighLowRange: Input = Candle, Output = f64
const _: fn(&mut HighLowRange, Candle) -> Option<f64> = <HighLowRange as Indicator>::update;
```

Node `update(open, high, low, close)` / `batch(open[], high[], low[], close[])`;
Python `update(candle)` / `batch(open, high, low, close)` → 1-D `ndarray`.

## Warmup

`warmup_period() == 1`; the unit test `emits_from_first_candle` pins it.

## Edge cases

- **Reference value.** `(104 − 98) / 100 = 0.06`; pinned by `reference_value`.
- **Zero-range bar.** `high == low` yields `0`; pinned by `zero_range_bar_yields_zero`.
- **Zero close.** A zero close yields `0` (no scale); pinned by `zero_close_yields_zero`.
- **Non-negativity.** Output is `>= 0` for positive prices; pinned by
  `output_is_non_negative`.

## Examples

### Rust

```rust
use wickra::{Candle, HighLowRange, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut hlr = HighLowRange::new();
    let c = Candle::new(99.0, 104.0, 98.0, 100.0, 10.0, 0)?;
    println!("{:?}", hlr.update(c));
    Ok(())
}
```

Output:

```
Some(0.06)
```

### Python

```python
import wickra as ta

hlr = ta.HighLowRange()
print(hlr.batch([99.0], [104.0], [98.0], [100.0]))
```

Output:

```
[0.06]
```

### Node

```javascript
const ta = require('wickra');
const hlr = new ta.HighLowRange();
console.log(hlr.update(99, 104, 98, 100));
```

Output:

```
0.06
```

## Interpretation

`HighLowRange` is an instant, scale-free volatility read for a single bar: useful
as a quick intrabar volatility gauge or as a normaliser for other features
across instruments of different price. For a smoothed, gap-aware volatility use
[Atr](Indicator-Atr) / [Natr](Indicator-Natr); for the realised volatility of a
return path use [RealizedVolatility](Indicator-RealizedVolatility).

## Common pitfalls

- **Normalised by close, not open or typical price.** A bar that closes far from
  its midpoint divides by a slightly different denominator than an ATR would;
  the difference is small but non-zero.

## References

A simple normalised true-range; cf. Wilder's ATR (1978) for the smoothed,
gap-aware version.

## See also

- [Indicator-Natr](Indicator-Natr) — normalised average true range.
- [Indicator-RealizedVolatility](Indicator-RealizedVolatility) — path volatility.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
