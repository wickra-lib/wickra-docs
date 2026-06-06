# Beta

> Rolling sensitivity of an asset to a benchmark. Beta of 1 means
> the two move together one-for-one; > 1 means the asset amplifies
> the benchmark; < 1 means it dampens. The slope from a rolling OLS
> regression of asset returns on benchmark returns.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Price Statistics                                                     |
| Input type          | `(f64, f64)` — `(asset, benchmark)` pair                             |
| Output type         | `f64`                                                                |
| Output range        | unbounded                                                            |
| Default parameters  | `period` required (`> 1`)                                            |
| Warmup period       | `period`                                                             |
| Interpretation      | Market-risk sensitivity                                               |

## Formula

```
cov_ab = (1/n) · Σ a·b - ā·b̄
var_b  = (1/n) · Σ b² - b̄²
Beta   = cov_ab / var_b
```

Population formulas (not sample). Each `update` is O(1). See
`crates/wickra-core/src/indicators/beta.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 1`      | Rolling window. |

## Inputs / Outputs

`Indicator<Input = (f64, f64), Output = f64>`. Python:
`Beta(period).batch(asset, benchmark)` returns a 1-D `np.ndarray`
with `NaN` warmup. Node: same.

## Warmup

`warmup_period() == period`.

## Edge cases

- **Flat benchmark.** `var(b) = 0`; indicator returns `0.0`
  rather than NaN.
- **Negative Beta.** Asset moves opposite to benchmark (e.g.
  gold vs equities sometimes).
- **Reset.** Clears running sums.

## Examples

### Rust

```rust
use wickra::{Beta, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut b = Beta::new(50)?;
    for i in 0..100 {
        let bench = (f64::from(i) * 0.1).sin() * 0.01;
        let asset = bench * 1.2 + 0.0005;  // beta ~1.2
        let _ = b.update((asset, bench));
    }
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

bench = np.sin(np.linspace(0, 10, 100)) * 0.01
asset = bench * 1.2 + 0.0005
b = ta.Beta(50)
print(b.batch(asset, bench)[-1])  # ~1.2
```

### Node

```javascript
const wickra = require('wickra');
const b = new wickra.Beta(50);
// feed asset, benchmark
```

### Streaming

```rust
use wickra::{Beta, Indicator};

let mut b = Beta::new(252).unwrap();
let return_stream: Vec<(f64, f64)> = Vec::new(); // your stream of periodic returns
for (asset_return, bench_return) in return_stream {
    if let Some(v) = b.update((asset_return, bench_return)) {
        // v is 1-year Beta on daily returns
    }
}
```

## Interpretation

- **Beta > 1.** Asset amplifies benchmark moves — high-beta
  growth stocks vs SPX.
- **Beta < 1.** Asset dampens benchmark — defensive sectors
  (utilities, staples).
- **Beta ≈ 0.** Asset moves independently of benchmark — managed
  futures, market-neutral.
- **Beta < 0.** Inverse correlation — gold and long-duration
  bonds vs equities in some regimes.

## Common pitfalls

- **Period choice.** Short windows make Beta noisy; long windows
  hide regime changes. Industry convention: 60 months for fund
  reporting, 252 days for active management.
- **Benchmark dependence.** Beta is benchmark-specific. AAPL has
  different Beta vs SPX, vs NDX, vs sector ETF.
- **Asymmetric Beta.** Asset's response to up moves and down
  moves can differ — single Beta hides this. Look at up-beta /
  down-beta separately for skew.

## References

- William F. Sharpe, *Capital Asset Prices*, *Journal of Finance*,
  1964 — CAPM and Beta.

## See also

- [Alpha](/Indicators/Indicator-Alpha) — CAPM's other half.
- [PearsonCorrelation](/Indicators/Indicator-PearsonCorrelation) —
  correlation cousin (Beta = correlation · `σ_a / σ_b`).
- [TreynorRatio](/Indicators/Indicator-TreynorRatio) — uses Beta in
  denominator.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
