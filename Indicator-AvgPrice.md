# AvgPrice

> Average Price (`AVGPRICE`) — the bar's `(open + high + low + close) / 4`, a
> single per-bar price aggregate that folds in the open as well as the high,
> low and close.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Statistics |
| Input type | `Candle` (uses `open`, `high`, `low`, `close`) |
| Output type | `f64` |
| Output range | unbounded (price scale) |
| Default parameters | none (no parameters) |
| Warmup period | `1` |
| Interpretation | A representative per-bar price that weights the open equally with the high, low and close. |

## Formula

```
AVGPRICE = (open + high + low + close) / 4
```

Where [`TypicalPrice`](Indicator-TypicalPrice) is `(H + L + C) / 3` and
[`WeightedClose`](Indicator-WeightedClose) is `(H + L + 2C) / 4`, `AvgPrice` is
the only per-bar aggregate that gives the **open** a vote. It collapses a full
OHLC bar to one number with all four prices weighted equally. The computation is
delegated to `Candle::avg_price()` in
`crates/wickra-core/src/ohlcv.rs` and wrapped as a stateless indicator in
`crates/wickra-core/src/indicators/avg_price.rs`.

## Parameters

`AvgPrice` takes **no parameters** — `AvgPrice::new()` in Rust,
`wickra.AvgPrice()` in Python, `new ta.AvgPrice()` in Node.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/avg_price.rs`:

```rust
use wickra::{Indicator, AvgPrice, Candle};
// AvgPrice: Input = Candle, Output = f64
const _: fn(&mut AvgPrice, Candle) -> Option<f64> = <AvgPrice as Indicator>::update;
```

`AvgPrice` is a **candle-input** indicator that reads all four OHLC prices. In
Python the streaming `update` accepts a candle (dict or tuple); the batch helper
takes `open`, `high`, `low`, `close` numpy arrays and returns a 1-D
`numpy.ndarray` (`NaN` only never appears here, since warmup is a single bar).
Node and WASM expose `update(open, high, low, close)` and the matching `batch`.

## Warmup

`AvgPrice::new().warmup_period() == 1`. It is a stateless per-bar transform — it
emits a value from the very first candle. The unit test `accessors_and_reset`
pins `warmup_period() == 1`, and `averages_the_four_prices` confirms the first
candle is immediately ready.

## Edge cases

- **No warmup.** Every candle produces a value immediately; `is_ready()` flips
  to `true` on the first `update`. The unit test `averages_the_four_prices`
  pins this.
- **Reset.** `ap.reset()` only clears the `is_ready` flag; there is no rolling
  state to discard. The unit test `accessors_and_reset` pins this.

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, AvgPrice};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut ap = AvgPrice::new();
    let v = ap.update(Candle::new(10.0, 14.0, 6.0, 12.0, 1.0, 0)?);
    println!("{:?}", v);
    Ok(())
}
```

Output:

```
Some(10.5)
```

`(10 + 14 + 6 + 12) / 4 = 10.5`. This matches the `averages_the_four_prices`
unit test in `crates/wickra-core/src/indicators/avg_price.rs`.

### Python

```python
import numpy as np
import wickra as ta

ap = ta.AvgPrice()
print(ap.batch(np.array([10.0]), np.array([14.0]), np.array([6.0]), np.array([12.0])))
```

Output:

```
[10.5]
```

### Node

```javascript
const ta = require('wickra');
const ap = new ta.AvgPrice();
console.log(ap.update(10, 14, 6, 12));
```

Output:

```
10.5
```

## Interpretation

Use `AvgPrice` when you want a single representative price per bar that does not
privilege the close. Because it includes the open, it sits closer to the bar's
geometric centre than [`TypicalPrice`](Indicator-TypicalPrice) on bars with a
long body — it is slightly more sensitive to where the bar opened. It is a
common substitute for the raw close when feeding a moving average or oscillator
and you want gaps (open ≠ prior close) to register.

Prefer [`TypicalPrice`](Indicator-TypicalPrice) when you specifically want the
`(H + L + C) / 3` series that [`Cci`](Indicator-Cci) and [`Mfi`](Indicator-Mfi)
are defined on; prefer [`MedianPrice`](Indicator-MedianPrice) when you only care
about the bar's `(H + L) / 2` midpoint.

## Common pitfalls

- **Feeding it scalar prices.** It needs the full `open`/`high`/`low`/`close`
  bar; there is no single-value mode.
- **Expecting it to differ from the close on doji-like bars.** When a bar opens
  and closes near its mid with small wicks, `AvgPrice` ≈ close; the difference
  only grows with body size and wick asymmetry.

## References

The Average Price `(O + H + L + C) / 4` is TA-Lib's `AVGPRICE` function and a
standard per-bar price aggregate on most charting platforms.

## See also

- [Indicator-TypicalPrice](Indicator-TypicalPrice) — `(H + L + C) / 3`.
- [Indicator-WeightedClose](Indicator-WeightedClose) — `(H + L + 2C) / 4`.
- [Indicator-MedianPrice](Indicator-MedianPrice) — `(H + L) / 2`.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
