# Alpha (Jensen)

> Jensen's Alpha — the risk-adjusted excess return that cannot be
> explained by simple market exposure (Beta). Positive alpha
> indicates outperformance net of the market premium implied by the
> asset's beta; negative alpha is the opposite.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Risk / Performance                                                   |
| Input type          | `(f64, f64)` — (asset return, benchmark return) pair                 |
| Output type         | `f64`                                                                |
| Output range        | unbounded                                                            |
| Default parameters  | `period`, `risk_free_per_period` both required                       |
| Warmup period       | `period`                                                             |
| Interpretation      | Skill alpha after removing market-risk contribution                   |

## Formula

```
Beta  = cov(asset, bench) / var(bench)
Alpha = mean(asset) - ( risk_free + Beta · (mean(bench) - risk_free) )
```

Population covariance and variance are used (matching common
implementations in pandas-ta / quantstats). If the benchmark is
flat (`var(bench) = 0`) the indicator falls back to `alpha =
mean(asset) - risk_free` — the asset's mean excess return, with no
market-risk adjustment (since regression slope is undefined). Each
`update` is O(1). See
`crates/wickra-core/src/indicators/alpha.rs`.

## Parameters

| Name                   | Type    | Default | Constraint | Description |
|------------------------|---------|---------|------------|-------------|
| `period`               | `usize` | none    | `> 1`      | Rolling window. |
| `risk_free_per_period` | `f64`   | none    | finite     | Per-period RF rate. |

## Inputs / Outputs

`Indicator<Input = (f64, f64), Output = f64>`. Standard binding
shapes.

## Warmup

`warmup_period() == period`.

## Edge cases

- **Flat benchmark.** Falls back to mean excess return without
  Beta adjustment.
- **Negative alpha.** Underperformed market-adjusted expectation.
- **Reset.** Clears running sums.

## Examples

### Rust

```rust
use wickra::{Alpha, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut a = Alpha::new(50, 0.0)?;
    for i in 0..100 {
        let bench = (f64::from(i) * 0.1).sin() * 0.01;
        let asset = bench * 0.8 + 0.001;  // some alpha, low beta
        let _ = a.update((asset, bench));
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
asset = bench * 0.8 + 0.001
a = ta.Alpha(50, 0.0)
print(a.batch(asset, bench)[-1])
```

### Node

```javascript
const wickra = require('wickra');
const a = new wickra.Alpha(50, 0.0);
const bench = Array.from({ length: 100 }, (_, i) => Math.sin(i * 0.1) * 0.01);
const asset = bench.map(b => b * 0.8 + 0.001);
console.log(a.batch(asset, bench));
```

### Streaming

```rust
use wickra::{Alpha, Indicator};

let mut a = Alpha::new(252, 0.04 / 252.0).unwrap();
let return_stream: Vec<(f64, f64)> = Vec::new(); // (asset, benchmark) return pairs
for (asset, bench) in return_stream {
    if let Some(v) = a.update((asset, bench)) {
        // v is per-period alpha; · 252 for annualised
    }
}
```

## Interpretation

- **Positive Alpha.** Skill beyond market exposure — the
  manager added value after accounting for the risk taken via
  Beta.
- **Negative Alpha.** Underperformed CAPM expectation — paying
  fees for no skill or actively destroying value.
- **Pair with Beta.** Alpha alone doesn't tell you the risk
  taken to generate it. A small alpha at high Beta may be less
  impressive than the same alpha at low Beta.
- **Statistical significance.** A nonzero Alpha estimate must be
  tested for significance — small samples produce noisy alpha
  estimates indistinguishable from zero.

## Common pitfalls

- **Confusing Alpha with raw outperformance.** Alpha is *risk-
  adjusted* excess return. Raw outperformance can be high while
  Alpha is zero (if it's all explained by Beta).
- **Period choice.** Too short → noisy. Too long → stale.
  Typical practitioner choice: 252 daily bars or 36 months.
- **Population vs sample stats.** Wickra uses population (`n`),
  matching pandas-ta. Some references use sample (`n-1`); ratios
  differ slightly.

## References

- Michael C. Jensen, *The Performance of Mutual Funds in the
  Period 1945-1964*, *Journal of Finance*, 1968 — original
  Jensen's Alpha paper.

## See also

- [TreynorRatio](/Indicators/Indicator-TreynorRatio) — Beta-relative cousin.
- [InformationRatio](/Indicators/Indicator-InformationRatio) — tracking-error
  cousin.
- [Beta](/Indicators/Indicator-Beta) — CAPM's other half.
- [SharpeRatio](/Indicators/Indicator-SharpeRatio) — non-CAPM alternative.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
