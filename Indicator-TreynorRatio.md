# Treynor Ratio

> Sharpe's market-risk cousin: divides excess return by the asset's
> sensitivity to a benchmark (Beta) rather than by its own
> volatility. Useful for diversified portfolios where
> idiosyncratic volatility has been mostly diversified away and the
> dominant remaining risk is systematic / market exposure.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Risk / Performance                                                   |
| Input type          | `(f64, f64)` — (asset return, benchmark return) pair per update      |
| Output type         | `f64`                                                                |
| Output range        | unbounded                                                            |
| Default parameters  | `period`, `risk_free_per_period` both required                       |
| Warmup period       | `period`                                                             |
| Interpretation      | Excess return per unit of market-risk exposure                        |

## Formula

```
cov_ab  = (1/n) · Σ a·b - ā·b̄
var_b   = (1/n) · Σ b² - b̄²
Beta    = cov_ab / var_b
Treynor = (mean(asset) - risk_free) / Beta
```

A flat benchmark window has zero variance and the indicator returns
`0.0` rather than `NaN`. A near-zero `Beta` makes the ratio
explode by construction. Each `update` is O(1) — running sums
maintain `Σa, Σb, Σb², Σa·b`. See
`crates/wickra-core/src/indicators/treynor_ratio.rs`.

## Parameters

| Name                   | Type    | Default | Constraint | Description |
|------------------------|---------|---------|------------|-------------|
| `period`               | `usize` | none    | `> 1`      | Rolling window. |
| `risk_free_per_period` | `f64`   | none    | finite     | Per-period RF rate. |

## Inputs / Outputs

`Indicator<Input = (f64, f64), Output = f64>`. Python:
`TreynorRatio(period, rf).batch(asset_returns, benchmark_returns)`
returns a 1-D `np.ndarray` with `NaN` warmup. Node: same shape;
`update(asset, benchmark)` returns `number | null`.

## Warmup

`warmup_period() == period`.

## Edge cases

- **Flat benchmark.** Variance zero; output `0.0`.
- **Near-zero Beta.** Output explodes — handle with care.
- **Negative Beta.** Asset moves opposite to benchmark; Treynor
  can be negative for positive excess return (or positive for
  negative excess return).
- **Reset.** Clears running sums.

## Examples

### Rust

```rust
use wickra::{Indicator, TreynorRatio};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut tr = TreynorRatio::new(50, 0.0)?;
    for i in 0..100 {
        let bench = (f64::from(i) * 0.1).sin() * 0.01;
        let asset = bench * 1.2 + 0.001;
        let _ = tr.update((asset, bench));
    }
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

n = 100
bench = np.sin(np.linspace(0, 10, n)) * 0.01
asset = bench * 1.2 + 0.001
tr = ta.TreynorRatio(50, 0.0)
print(tr.batch(asset, bench)[-1])
```

### Node

```javascript
const wickra = require('wickra');
const tr = new wickra.TreynorRatio(50, 0.0);
const bench = Array.from({ length: 100 }, (_, i) => Math.sin(i * 0.1) * 0.01);
const asset = bench.map(b => b * 1.2 + 0.001);
console.log(tr.batch(asset, bench));
```

### Streaming

```rust
use wickra::{Indicator, TreynorRatio};

let mut tr = TreynorRatio::new(252, 0.04 / 252.0).unwrap();
for (asset, bench) in return_stream {
    if let Some(v) = tr.update((asset, bench)) {
        // v = annualised Treynor (if returns are daily)
    }
}
```

## Interpretation

- **Excess return per Beta unit.** Treynor > 0 = asset earned
  more than its market-risk-implied return.
- **For diversified portfolios.** Treynor is appropriate when
  idiosyncratic risk is diversified — only systematic risk
  remains.
- **For single names.** Use Sharpe instead — Treynor underweights
  unsystematic risk that matters for concentrated positions.

## Common pitfalls

- **Low Beta amplifies.** Treynor ratios for low-beta assets
  swing wildly. Use carefully near `Beta = 0`.
- **Benchmark choice.** Treynor depends on which benchmark you
  pair against. Comparing Treynors against different benchmarks
  is meaningless.

## References

- Jack L. Treynor, *How to Rate Management of Investment Funds*,
  *Harvard Business Review*, 1965 — original Treynor Ratio.

## See also

- [SharpeRatio](Indicator-SharpeRatio) — own-volatility analog.
- [InformationRatio](Indicator-InformationRatio) — alternative
  benchmark-relative measure.
- [Alpha](Indicator-Alpha) — closely-related CAPM measure.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
