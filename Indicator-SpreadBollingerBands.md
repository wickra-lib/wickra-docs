# SpreadBollingerBands

> Bollinger bands applied to the spread `a − b` of two series — a ready-made
> pairs mean-reversion envelope.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Statistics |
| Input type | `(f64, f64)` (a pair of prices `a`, `b`) |
| Output type | `SpreadBollingerBandsOutput { middle, upper, lower, percent_b }` |
| Output range | bands in spread units; `percent_b` ~`[0, 1]` (can overshoot) |
| Default parameters | `period` (`>= 2`), `num_std` (`> 0`); both required |
| Warmup period | `period` |
| Interpretation | Spread at upper band = rich (short); at lower = cheap (long); middle = exit. |

## Formula

Each `update` forms the spread `sₜ = aₜ − bₜ` and builds a classic Bollinger
envelope over the trailing window of `period` spreads:

```
middle = mean(s)        σ = stddev(s)
upper  = middle + num_std · σ
lower  = middle − num_std · σ
%b     = (s_now − lower) / (upper − lower)
```

Applied to a spread rather than a price, the bands are a ready-made pairs
mean-reversion signal: the spread riding the **upper** band is stretched rich (a
short-the-spread setup), the **lower** band stretched cheap, and a return to the
**middle** is the exit. `%b` compresses the location into one number for
thresholding. The spread is the raw difference `a − b`, so feed the two legs in a
consistent order.

Source: `crates/wickra-core/src/indicators/spread_bollinger_bands.rs`.

## Parameters

| Name      | Type    | Default | Valid range | Source | Description |
|-----------|---------|---------|-------------|--------|-------------|
| `period`  | `usize` | none    | `>= 2`      | `spread_bollinger_bands.rs:82` | Look-back window of spreads. |
| `num_std` | `f64`   | none    | `> 0`       | `spread_bollinger_bands.rs:82` | Band width in standard deviations. Bad parameters error with `Error::InvalidPeriod`. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/spread_bollinger_bands.rs`:

```rust
use wickra::{Indicator, SpreadBollingerBands, SpreadBollingerBandsOutput};
// SpreadBollingerBands: Input = (f64, f64), Output = SpreadBollingerBandsOutput
const _: fn(&mut SpreadBollingerBands, (f64, f64)) -> Option<SpreadBollingerBandsOutput> =
    <SpreadBollingerBands as Indicator>::update;
```

`SpreadBollingerBandsOutput` carries `middle`, `upper`, `lower` and `percent_b`.
In Python `update(a, b)` returns a `(middle, upper, lower, percent_b)` tuple and
`batch` returns an `(n, 4)` array. In Node `update(a, b)` returns
`{ middle, upper, lower, percentB }` and `batch` returns a flat array of length
`4 · n`, interleaved per row as `[middle0, upper0, lower0, percentB0, ...]`.

## Warmup

`warmup_period() == period`. The unit test `accessors_and_metadata` pins
`warmup_period() == 20` for `period = 20`; `warmup_returns_none` pins the first
`Some` at the `period`-th pair.

## Edge cases

- **Band ordering.** `lower <= middle <= upper` always holds (the doc example
  asserts it).
- **`%b` overshoot.** When the spread pierces a band, `%b` goes below `0` or above
  `1` — a feature, not a clamp, signalling how far the spread is stretched.
- **Flat spread.** A constant spread has zero σ, collapsing the bands onto the
  middle.
- **Reset.** `reset()` clears the spread window.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, SpreadBollingerBands};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut bb = SpreadBollingerBands::new(20, 2.0)?;
    // Oscillating spread around zero.
    let pairs: Vec<(f64, f64)> = (0..40)
        .map(|t| (100.0 + 4.0 * (f64::from(t) * 0.6).sin(), 100.0))
        .collect();
    let out = bb.batch(&pairs).into_iter().flatten().last().unwrap();
    println!("{:.6} {:.6} {:.6} {:.6}", out.middle, out.upper, out.lower, out.percent_b);
    Ok(())
}
```

Output:

```
0.172570 5.728543 -5.383403 0.129207
```

### Python

```python
import numpy as np
import wickra as ta

t = np.arange(40)
a = 100.0 + 4.0 * np.sin(t * 0.6)
b = np.full(40, 100.0)
middle, upper, lower, percent_b = ta.SpreadBollingerBands(20, 2.0).batch(a, b)[-1]
print(round(middle, 6), round(upper, 6), round(lower, 6), round(percent_b, 6))
```

Output:

```
0.17257 5.728543 -5.383403 0.129207
```

### Node

```javascript
const ta = require('wickra');
const bb = new ta.SpreadBollingerBands(20, 2.0);
let out;
for (let t = 0; t < 40; t++) {
  out = bb.update(100 + 4 * Math.sin(t * 0.6), 100);
}
console.log(
  out.middle.toFixed(6),
  out.upper.toFixed(6),
  out.lower.toFixed(6),
  out.percentB.toFixed(6),
);
```

Output:

```
0.172570 5.728543 -5.383403 0.129207
```

## Interpretation

`SpreadBollingerBands` turns the spread into a self-calibrating reversion signal:
the bands widen when the spread is volatile and tighten when it is calm, so the
same `num_std` threshold adapts to the current regime. Trade `%b`: short the
spread (sell `a`, buy `b`) as `%b` pushes above ~`1`, go long as it drops below
~`0`, and unwind as it crosses back through `0.5`. Confirm the spread is
genuinely mean-reverting first with [SpreadHurst](Indicator-SpreadHurst) or
[VarianceRatio](Indicator-VarianceRatio) — bands on a trending spread give false
reversion signals all the way down.

## Common pitfalls

- **Bands assume reversion.** On a trending or non-stationary spread the envelope
  keeps getting pierced without reverting. Gate with a regime test.
- **Leg order sets the sign.** `a − b` and `b − a` mirror the `%b` signal. Fix the
  order so "upper band" consistently means the same trade.

## References

Bollinger, J. (2001), *Bollinger on Bollinger Bands*; here applied to a spread
rather than a single price.

## See also

- [Indicator-SpreadHurst](Indicator-SpreadHurst) — confirm the spread mean-reverts.
- [Indicator-PairSpreadZScore](Indicator-PairSpreadZScore) — z-score timing on the spread.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
