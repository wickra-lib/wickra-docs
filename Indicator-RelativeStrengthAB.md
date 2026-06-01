# RelativeStrengthAB

> Comparative relative strength of two assets: the ratio line `a / b`
> together with its moving average and its RSI. The classic asset-vs-asset
> / asset-vs-index rotation screen.

## Quick reference

| Item                | Value                                                       |
|---------------------|-------------------------------------------------------------|
| Family              | Price Statistics                                            |
| Input type          | `(f64, f64)` — `(a, b)` price pair                           |
| Output type         | `{ ratio: f64, ratio_ma: f64, ratio_rsi: f64 }`            |
| Output range        | `ratio_rsi ∈ [0, 100]`; `ratio`, `ratio_ma` unbounded `> 0` |
| Default parameters  | `ma_period = 20`, `rsi_period = 14`                        |
| Warmup period       | `max(ma_period, rsi_period + 1)`                           |
| Interpretation      | Relative outperformance of `a` over `b`                    |

## Formula

```
ratio     = a / b
ratio_ma  = SMA(ratio, ma_period)
ratio_rsi = RSI(ratio, rsi_period)
```

Composes the existing [SMA](Indicator-Sma) and [RSI](Indicator-Rsi) over the
ratio line; each `update` is O(1). See
`crates/wickra-core/src/indicators/relative_strength_ab.rs`.

## Parameters

| Name         | Type    | Default | Constraint | Description |
|--------------|---------|---------|------------|-------------|
| `ma_period`  | `usize` | `20`    | `> 0`      | Moving-average look-back of the ratio. |
| `rsi_period` | `usize` | `14`    | `> 0`      | RSI look-back of the ratio. |

## Inputs / Outputs

`Indicator<Input = (f64, f64), Output = RelativeStrengthOutput>`. Python
`update(a, b)` returns `(ratio, ratio_ma, ratio_rsi)` or `None`;
`batch(a, b)` returns an `(n, 3)` array (`NaN` warmup). Node returns
`{ ratio, ratioMa, ratioRsi }`; WASM the same object.

## Warmup

`warmup_period() == max(ma_period, rsi_period + 1)` — the first output
appears once both the moving average and the RSI have warmed up.

## Edge cases

- **Zero denominator.** `b == 0` (or a non-finite price) makes the ratio
  undefined; that tick is skipped, leaving the internal averages untouched.
- **Flat ratio.** A constant ratio has no gains or losses, so `ratio_rsi`
  sits at the neutral `50`.
- **Reset.** Clears both internal indicators.

## Examples

### Rust

```rust
use wickra::{Indicator, RelativeStrengthAB};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut rs = RelativeStrengthAB::new(20, 14)?;
    for t in 0..100 {
        let a = 100.0 + f64::from(t);  // a outperforms
        let b = 100.0;
        if let Some(o) = rs.update((a, b)) {
            // rising ratio ⇒ o.ratio_rsi approaches 100
            let _ = o;
        }
    }
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

a = 100.0 + np.arange(100, dtype=float)   # a strengthens vs b
b = np.full(100, 100.0)
out = ta.RelativeStrengthAB(20, 14).batch(a, b)
ratio, ma, rsi = out[-1]                  # rsi near 100 ⇒ a strongly leading
```

### Node

```javascript
const wickra = require('wickra');
const rs = new wickra.RelativeStrengthAB(20, 14);
const { ratio, ratioMa, ratioRsi } = rs.update(a, b) ?? {};
```

## Interpretation

- **Rising `ratio` / `ratio_ma`.** `a` is outperforming `b` — favour `a` in
  a rotation.
- **`ratio_rsi > 70`.** The outperformance of `a` over `b` is overextended.
- **`ratio_rsi < 30`.** `a` is oversold relative to `b` — possible mean
  reversion of the spread in `a`'s favour.

## Common pitfalls

- **Asset vs index.** Set `b` to an index (or sector ETF) to screen a single
  name's relative strength rather than a pair.
- **Units.** The raw `ratio` scale depends on the two price levels; read
  `ratio_rsi` for a scale-free signal.

## See also

- [Rsi](Indicator-Rsi) — single-series momentum oscillator.
- [PairSpreadZScore](Indicator-PairSpreadZScore) — standardised log-spread
  of a pair.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
