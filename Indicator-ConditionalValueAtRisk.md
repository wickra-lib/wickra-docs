# Conditional Value at Risk (CVaR / Expected Shortfall)

> Average return *in the tail below* the VaR threshold. Where
> [ValueAtRisk](Indicator-ValueAtRisk) reports the loss *at* the
> lower-tail quantile, CVaR averages **all** returns below that
> quantile — the expected loss conditional on being in the bad tail.
> A coherent risk measure (unlike VaR) — sub-additive across
> portfolio positions.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Risk / Performance                                                   |
| Input type          | `f64` — one period return per update                                 |
| Output type         | `f64` — magnitude of expected tail loss                              |
| Output range        | `[0, ∞)`                                                             |
| Default parameters  | `period`, `confidence` both required                                 |
| Warmup period       | `period`                                                             |
| Interpretation      | "Average loss in the worst (1-c)% of cases" — always ≥ VaR           |

## Formula

```
q       = 1 - confidence
tail    = returns over window with rank fraction ≤ q
CVaR    = -mean(tail)             if mean is negative
CVaR    = 0                       otherwise
```

The tail comprises the `floor(q · n)` smallest returns; if floor
rounds down to zero, the smallest single return is used so the
metric stays defined for any `period ≥ 2`. By construction
`CVaR ≥ VaR`. See
`crates/wickra-core/src/indicators/conditional_value_at_risk.rs`.

## Parameters

| Name         | Type    | Default | Constraint           | Description |
|--------------|---------|---------|----------------------|-------------|
| `period`     | `usize` | none    | `>= 2`               | Rolling window length. |
| `confidence` | `f64`   | none    | finite, `(0, 1)`     | Same as VaR confidence level. |

## Inputs / Outputs

Same as [ValueAtRisk](Indicator-ValueAtRisk).

## Warmup

`warmup_period() == period`.

## Edge cases

- **All-positive window.** Returns `0.0` (no tail loss).
- **`floor(q · n) == 0`.** The smallest single return defines the
  tail. Common for small windows / extreme confidence levels.
- **CVaR ≥ VaR.** Always — CVaR averages losses *worse than* VaR.
- **Reset.** Clears the rolling window.

## Examples

### Rust

```rust
use wickra::{BatchExt, ConditionalValueAtRisk, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let returns: Vec<f64> = (0..200)
        .map(|i| (f64::from(i) * 0.1).sin() * 0.02)
        .collect();
    let mut c = ConditionalValueAtRisk::new(100, 0.95)?;
    println!("row 150 = {:?}", c.batch(&returns)[150]);
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

returns = np.sin(np.linspace(0, 20, 200)) * 0.02
c = ta.ConditionalValueAtRisk(100, 0.95)
print(c.batch(returns)[150])
```

### Node

```javascript
const wickra = require('wickra');
const c = new wickra.ConditionalValueAtRisk(100, 0.95);
const returns = Array.from({ length: 200 }, (_, i) => Math.sin(i * 0.1) * 0.02);
console.log(c.batch(returns)[150]);
```

### Streaming

```rust
use wickra::{ConditionalValueAtRisk, Indicator};

let mut cvar = ConditionalValueAtRisk::new(252, 0.99).unwrap();
for daily_return in return_stream {
    if let Some(v) = cvar.update(daily_return) {
        // v = expected daily loss in worst 1% of cases
    }
}
```

## Interpretation

- **Expected tail loss.** A 95% CVaR of `0.035` means: in the
  worst 5% of cases, the average daily loss is 3.5%.
- **Coherent risk measure.** Sub-additive (portfolio CVaR ≤
  sum of individual CVaRs), which makes it preferred over VaR for
  capital-allocation decisions.
- **Pair with VaR.** Report both — VaR tells the threshold,
  CVaR tells how bad the tail beyond the threshold actually is.

## Common pitfalls

- **Confusing VaR and CVaR.** VaR is the *boundary*, CVaR is the
  *average beyond the boundary*. Same data, different metrics.
- **Period choice.** Same caveats as VaR — too-short windows
  produce noisy tail estimates.
- **Confidence level mismatch.** A 95% VaR and 99% CVaR are
  different things; compare like with like.

## References

- Rockafellar & Uryasev, *Optimization of Conditional
  Value-at-Risk*, *Journal of Risk*, 2000 — formalised CVaR as
  a coherent risk measure.

## See also

- [ValueAtRisk](Indicator-ValueAtRisk) — quantile boundary.
- [SortinoRatio](Indicator-SortinoRatio) — downside-deviation
  alternative.
- [MaxDrawdown](Indicator-MaxDrawdown) — drawdown-based loss
  measure.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
