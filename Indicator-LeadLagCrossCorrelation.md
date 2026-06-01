# LeadLagCrossCorrelation

> Which of two assets leads the other, and by how many bars. Reports the
> integer offset `k ∈ [−max_lag, max_lag]` that maximises
> `|corr(a[t], b[t+k])|`, together with the correlation at that lag.

## Quick reference

| Item                | Value                                                   |
|---------------------|---------------------------------------------------------|
| Family              | Price Statistics                                        |
| Input type          | `(f64, f64)` — `(a, b)` pair                             |
| Output type         | `{ lag: i64, correlation: f64 }`                        |
| Output range        | `lag ∈ [−max_lag, max_lag]`, `correlation ∈ [−1, +1]`   |
| Default parameters  | `window = 20`, `max_lag = 10`                           |
| Warmup period       | `window + 2·max_lag`                                    |
| Interpretation      | Lead/lag relationship between two assets                |

## Formula

```
lag = argmax_k | corr( a[t], b[t+k] ) |,   k ∈ [−max_lag, max_lag]
```

`a`'s window is held fixed in the centre of a `window + 2·max_lag` buffer
while `b`'s window slides across it, so every lag is evaluated only against
data already seen (fully causal). Candidate lags are scanned by increasing
`|k|`, so ties resolve to the smallest offset (`0` wins an exact tie). Each
`update` is `O(window · max_lag)`. See
`crates/wickra-core/src/indicators/lead_lag_cross_correlation.rs`.

## Parameters

| Name      | Type    | Default | Constraint | Description |
|-----------|---------|---------|------------|-------------|
| `window`  | `usize` | `20`    | `>= 2`     | Points per correlation. |
| `max_lag` | `usize` | `10`    | `>= 1`     | Largest offset searched either way. |

## Inputs / Outputs

`Indicator<Input = (f64, f64), Output = LeadLagCrossCorrelationOutput>`.
Python `update(a, b)` returns `(lag, correlation)` or `None`; `batch(a, b)`
returns an `(n, 2)` array with columns `[lag, correlation]` (`NaN` warmup).
Node returns `{ lag, correlation }`; WASM returns the same object.

## Warmup

`warmup_period() == window + 2·max_lag`.

## Edge cases

- **Flat channel.** A constant `a` or `b` has zero variance ⇒ every
  correlation is `0` and the reported lag is `0`.
- **Positive vs negative lag.** Positive ⇒ `a` leads `b`; negative ⇒ `b`
  leads `a`; `0` ⇒ most correlated contemporaneously.
- **Reset.** Clears both ring buffers.

## Examples

### Rust

```rust
use wickra::{Indicator, LeadLagCrossCorrelation};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut ll = LeadLagCrossCorrelation::new(12, 5)?;
    for t in 0..60 {
        let a = (f64::from(t) * 0.4).sin();
        let b = (f64::from(t - 3) * 0.4).sin(); // b lags a by 3
        if let Some(o) = ll.update((a, b)) {
            // o.lag converges to +3 (a leads b by 3)
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

t = np.arange(60)
a = np.sin(t * 0.4)
b = np.sin((t - 3) * 0.4)            # b lags a by 3
out = ta.LeadLagCrossCorrelation(12, 5).batch(a, b)
print(int(out[-1, 0]))               # 3  (a leads b)
```

### Node

```javascript
const wickra = require('wickra');
const ll = new wickra.LeadLagCrossCorrelation(12, 5);
const { lag, correlation } = ll.update(a, b) ?? {};
```

## Interpretation

- **lag > 0.** `a` leads `b` — `a`'s moves show up in `b` `lag` bars later;
  trade `b` off `a`'s signal.
- **lag < 0.** `b` leads `a`.
- **correlation sign.** Positive ⇒ same-direction lead; negative ⇒ inverse.

## Common pitfalls

- **Periodic signals.** A pure sinusoid correlates with many shifts; the
  detected lag can be ambiguous. Use returns or de-trended series.
- **Look-ahead.** This indicator is causal by construction — it never uses
  future `b` to assess a negative lag.

## See also

- [PearsonCorrelation](Indicator-PearsonCorrelation) — contemporaneous
  correlation (the `lag = 0` special case).
- [Autocorrelation](Indicator-Autocorrelation) — single-series lagged
  correlation.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
