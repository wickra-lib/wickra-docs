# CumulativeVolumeDelta

> The running total of signed trade volume since the last reset. A
> rising line is net buying, a falling line net selling; divergence
> from price is the classic absorption signal.

## Quick reference

| Item                | Value                                                          |
|---------------------|----------------------------------------------------------------|
| Family              | Microstructure                                                 |
| Input type          | `Trade` — an executed trade with an aggressor side             |
| Output type         | `f64`                                                          |
| Output range        | unbounded (running total)                                      |
| Default parameters  | none                                                           |
| Warmup period       | `1`                                                            |
| Interpretation      | Cumulative net order flow                                      |

## Formula

```
CVDₜ = CVDₜ₋₁ + sizeₜ · (+1 if buy, −1 if sell)
```

Stateful running sum; O(1) per trade. Call `reset()` at each session boundary to
re-anchor at zero. See `crates/wickra-core/src/indicators/cvd.rs`.

## Parameters

None. Construct with `CumulativeVolumeDelta::new()`.

## Inputs / Outputs

`Indicator<Input = Trade, Output = f64>`. Bindings:
`update(price, size, is_buy)`; Python / Node `batch` take three equal-length
arrays → 1-D array. WASM streaming-only.

## Warmup

`warmup_period() == 1`.

## Edge cases

- **Reset.** Re-anchors the running total at zero (new session / bar).
- Unbounded by design — it is a cumulative line, not an oscillator.

## Examples

### Rust

```rust
use wickra::{CumulativeVolumeDelta, Indicator, Side, Trade};

let mut cvd = CumulativeVolumeDelta::new();
assert_eq!(cvd.update(Trade::new(100.0, 5.0, Side::Buy, 0).unwrap()), Some(5.0));
assert_eq!(cvd.update(Trade::new(100.0, 2.0, Side::Sell, 1).unwrap()), Some(3.0));
```

### Python

```python
import wickra as ta
cvd = ta.CumulativeVolumeDelta()
print(cvd.update(100.0, 5.0, True))   # 5.0
print(cvd.update(100.0, 2.0, False))  # 3.0
```

### Node

```js
const { CumulativeVolumeDelta } = require('wickra');
const cvd = new CumulativeVolumeDelta();
cvd.update(100, 5, true);  // 5
console.log(cvd.update(100, 2, false)); // 3
```

## Interpretation

CVD is the cumulative footprint of aggression. When price makes a new high but
CVD does not, buyers are being absorbed — a classic exhaustion warning, and vice
versa. Reset per session so the line reflects the current day's flow.

## Pitfalls

- The absolute level is meaningless across sessions; only the *shape* and
  divergences matter. Always reset at session start.

## See also

- [SignedVolume](Indicator-SignedVolume), [TradeImbalance](Indicator-TradeImbalance), [Footprint](Indicator-Footprint)
