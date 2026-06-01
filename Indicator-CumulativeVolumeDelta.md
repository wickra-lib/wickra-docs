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

CVD is the cumulative footprint of aggression — the running tug-of-war between
buyers lifting offers and sellers hitting bids.

- **Rising.** Net aggressive buying; demand is in control of the tape.
- **Falling.** Net aggressive selling.
- **Divergence — the key signal.** When price makes a new high but CVD does
  *not*, buyers are being absorbed by passive sellers without moving price — a
  classic exhaustion / absorption warning. The mirror holds for a new price low
  on flat CVD. Confirmation comes when price then reverses on the lighter side.

Reset per session so the line reflects the current day's flow rather than an
unbounded all-time total.

## Common pitfalls

- **The absolute level is meaningless.** Only the *shape* and *divergences*
  carry information; the cumulative value drifts arbitrarily. Always
  `reset()` at the session (or bar) boundary so two days are comparable.
- **Aggressor flag required.** CVD is only as good as the buy/sell labelling;
  if your feed lacks an aggressor side, infer it (tick / quote rule) first.
- **Venue-local.** Flow on one exchange is not the whole market; a divergence
  on a single venue may simply be flow migrating elsewhere.

## References

- Charles M. C. Lee and Mark J. Ready, *Inferring Trade Direction from Intraday
  Data*, *Journal of Finance*, 1991 — signing trades into buy/sell volume.
- David Easley, Marcos López de Prado, Maureen O'Hara, *Flow Toxicity and
  Liquidity in a High-Frequency World*, *Review of Financial Studies*, 2012 —
  cumulative signed-volume order flow.

## See also

- [SignedVolume](Indicator-SignedVolume) — the per-trade increment CVD sums.
- [TradeImbalance](Indicator-TradeImbalance) — the bounded, windowed cousin.
- [Footprint](Indicator-Footprint) — the same flow resolved by price level.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
