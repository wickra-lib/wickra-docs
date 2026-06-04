# CloseVsOpen

> The bar's body as a signed fraction of its open price: `(close − open) / open`
> — a scale-free, directional per-bar return.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Statistics |
| Input type | `Candle` |
| Output type | `f64` |
| Output range | unbounded; signed (positive = green bar) |
| Default parameters | none (stateless per-bar transform) |
| Warmup period | `1` |
| Interpretation | `+0.02` closed 2% above open; `−0.02` the mirror. |

## Formula

```
CloseVsOpen = (close − open) / open
```

A scale-free signed measure of how far price travelled from open to close.
Unlike [BalanceOfPower](Indicator-BalanceOfPower) — which normalises the body by
the bar *range* — this normalises by the *open price*, so it is directly
comparable to a return and stays meaningful across instruments of different
nominal price. A zero open carries no scale and yields `0`.

Source: `crates/wickra-core/src/indicators/close_vs_open.rs`.

## Parameters

None. The constructor is `CloseVsOpen::new()`.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/close_vs_open.rs`:

```rust
use wickra::{Candle, CloseVsOpen, Indicator};
// CloseVsOpen: Input = Candle, Output = f64
const _: fn(&mut CloseVsOpen, Candle) -> Option<f64> = <CloseVsOpen as Indicator>::update;
```

Node `update(open, high, low, close)` / `batch(open[], high[], low[], close[])`;
Python `update(candle)` / `batch(open, high, low, close)` → 1-D `ndarray`.

## Warmup

`warmup_period() == 1`: every candle emits a value. The unit test
`emits_from_first_candle` pins it.

## Edge cases

- **Reference value.** `(102 − 100) / 100 = 0.02`; pinned by `reference_value`.
- **Red bar.** Close below open is negative; pinned by `negative_body_is_negative`.
- **Zero open.** A zero open price yields `0` (no scale); pinned by
  `zero_open_yields_zero`.
- **Reset.** `reset()` clears the emitted flag.

## Examples

### Rust

```rust
use wickra::{Candle, CloseVsOpen, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut cvo = CloseVsOpen::new();
    let c = Candle::new(100.0, 103.0, 99.0, 102.0, 10.0, 0)?;
    println!("{:?}", cvo.update(c));
    Ok(())
}
```

Output:

```
Some(0.02)
```

### Python

```python
import wickra as ta

cvo = ta.CloseVsOpen()
print(cvo.batch([100.0], [103.0], [99.0], [102.0]))
```

Output:

```
[0.02]
```

### Node

```javascript
const ta = require('wickra');
const cvo = new ta.CloseVsOpen();
console.log(cvo.update(100, 103, 99, 102));
```

Output:

```
0.02
```

## Interpretation

`CloseVsOpen` is the simplest directional bar feature: the sign tells you green
vs red, the magnitude the conviction relative to price. Because it is a return,
it composes cleanly into rolling statistics. For the range-normalised cousin
(how the close settled within the bar's range) use
[BalanceOfPower](Indicator-BalanceOfPower); for the unsigned magnitude use
[BodySizePct](Indicator-BodySizePct).

## Common pitfalls

- **Range vs open normalisation.** This divides by *open*, not by *range*; it is
  not bounded in `[−1, 1]` (a gap-and-go bar can exceed it).

## References

A standard candlestick body feature; see Nison, *Japanese Candlestick Charting
Techniques* (1991), for body interpretation.

## See also

- [Indicator-BalanceOfPower](Indicator-BalanceOfPower) — body normalised by range.
- [Indicator-BodySizePct](Indicator-BodySizePct) — unsigned body magnitude.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
