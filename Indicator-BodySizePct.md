# BodySizePct

> The absolute candle body as a fraction of the bar range:
> `|close − open| / (high − low)` — the unsigned "body fill" of the bar.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Statistics |
| Input type | `Candle` |
| Output type | `f64` |
| Output range | `[0, 1]` |
| Default parameters | none (stateless per-bar transform) |
| Warmup period | `1` |
| Interpretation | `1` = full-bodied marubozu (no wicks); `0` = doji (open == close). |

## Formula

```
BodySizePct = |close − open| / (high − low)
```

The unsigned magnitude companion to [BalanceOfPower](Indicator-BalanceOfPower):
where BoP keeps the direction, this keeps only the conviction — exactly what
candlestick body/range filters key on. A zero-range bar carries no information
and yields `0`.

Source: `crates/wickra-core/src/indicators/body_size_pct.rs`.

## Parameters

None. The constructor is `BodySizePct::new()`.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/body_size_pct.rs`:

```rust
use wickra::{BodySizePct, Candle, Indicator};
// BodySizePct: Input = Candle, Output = f64
const _: fn(&mut BodySizePct, Candle) -> Option<f64> = <BodySizePct as Indicator>::update;
```

Node `update(open, high, low, close)` / `batch(open[], high[], low[], close[])`;
Python `update(candle)` / `batch(open, high, low, close)` → 1-D `ndarray`.

## Warmup

`warmup_period() == 1`; the unit test `emits_from_first_candle` pins it.

## Edge cases

- **Reference value.** `|12 − 10| / (14 − 10) = 0.5`; pinned by `reference_value`.
- **Marubozu.** Open == low and close == high gives a full body `1`; pinned by
  `marubozu_is_one`.
- **Doji.** Open == close gives body `0`; pinned by `doji_is_zero`.
- **Direction-independence.** A red and green bar of equal body read identically;
  pinned by `unsigned_regardless_of_direction`.
- **Zero-range bar.** `high == low` yields `0`; pinned by `zero_range_bar_yields_zero`.
- **Bounds.** Output is always in `[0, 1]`; pinned by `stays_within_unit_range`.

## Examples

### Rust

```rust
use wickra::{BodySizePct, Candle, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut bsp = BodySizePct::new();
    let c = Candle::new(10.0, 14.0, 10.0, 12.0, 10.0, 0)?;
    println!("{:?}", bsp.update(c));
    Ok(())
}
```

Output:

```
Some(0.5)
```

### Python

```python
import wickra as ta

bsp = ta.BodySizePct()
print(bsp.batch([10.0], [14.0], [10.0], [12.0]))
```

Output:

```
[0.5]
```

### Node

```javascript
const ta = require('wickra');
const bsp = new ta.BodySizePct();
console.log(bsp.update(10, 14, 10, 12));
```

Output:

```
0.5
```

## Interpretation

`BodySizePct` quantifies bar conviction: values near `1` are decisive marubozu
bars, values near `0` are indecisive dojis. It is the numeric backbone of many
candlestick-pattern filters (e.g. "body fills at least 60% of the range"). Pair
with [WickRatio](Indicator-WickRatio) (which side the wicks fall on) for a full
geometric description of a bar.

## Common pitfalls

- **Unsigned.** This drops direction. Use [CloseVsOpen](Indicator-CloseVsOpen)
  or [BalanceOfPower](Indicator-BalanceOfPower) when you need the sign.

## References

A standard candlestick body/range ratio; Nison (1991) for body interpretation.

## See also

- [Indicator-BalanceOfPower](Indicator-BalanceOfPower) — the signed version.
- [Indicator-WickRatio](Indicator-WickRatio) — shadow imbalance.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
