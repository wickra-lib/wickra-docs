# Information Ratio (IR)

> Mean active return (asset minus benchmark) divided by the
> tracking error (volatility of active return). Quantifies skill in
> beating a benchmark per unit of active-return volatility. A high
> IR means consistent (low-noise) outperformance; near-zero IR
> means the asset moves with the benchmark regardless of any small
> alpha.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Risk / Performance                                                   |
| Input type          | `(f64, f64)` — (asset return, benchmark return) pair                 |
| Output type         | `f64`                                                                |
| Output range        | unbounded                                                            |
| Default parameters  | `period` required (`>= 2`)                                            |
| Warmup period       | `period`                                                             |
| Interpretation      | `> 0.5` good active manager; `> 1` excellent                          |

## Formula

```
active_t       = asset_t - benchmark_t
tracking_error = stddev(active over window)            (sample, n-1)
IR             = mean(active) / tracking_error
```

If tracking error is zero (asset perfectly tracks the benchmark
over the window) the indicator returns `0.0` rather than `NaN`. See
`crates/wickra-core/src/indicators/information_ratio.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `>= 2`     | Rolling window. |

`InformationRatio::new` returns `Error::InvalidPeriod` for
`period < 2`.

## Inputs / Outputs

`Indicator<Input = (f64, f64), Output = f64>`. Standard binding
shapes.

## Warmup

`warmup_period() == period`.

## Edge cases

- **Zero tracking error.** Output `0.0`.
- **Negative IR.** Asset underperformed benchmark net of
  volatility — typical for fund-of-funds with high fees.
- **Reset.** Clears running sums.

## Examples

### Rust

```rust
use wickra::{Indicator, InformationRatio};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut ir = InformationRatio::new(50)?;
    for i in 0..100 {
        let bench = (f64::from(i) * 0.1).sin() * 0.01;
        let asset = bench + 0.001;  // 10bps daily alpha
        let _ = ir.update((asset, bench));
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
asset = bench + 0.001
ir = ta.InformationRatio(50)
print(ir.batch(asset, bench)[-1])
```

### Node

```javascript
const wickra = require('wickra');
const ir = new wickra.InformationRatio(50);
const bench = Array.from({ length: 100 }, (_, i) => Math.sin(i * 0.1) * 0.01);
const asset = bench.map(b => b + 0.001);
console.log(ir.batch(asset, bench));
```

### Streaming

```rust
use wickra::{Indicator, InformationRatio};

let mut ir = InformationRatio::new(252).unwrap();  // 1-year IR
for (asset, bench) in return_stream {
    if let Some(v) = ir.update((asset, bench)) {
        // v = annualised IR (with daily returns)
    }
}
```

## Interpretation

- **IR > 0.5.** Good active manager — consistent outperformance
  with manageable noise.
- **IR > 1.0.** Excellent — top-quartile institutional managers.
- **IR < 0.** Underperformed benchmark net of volatility.
- **IR = 0.** Either perfect tracking or zero alpha — boring
  by design (index fund) or by failure (closet indexer).

## Common pitfalls

- **Comparing across benchmarks.** IR is benchmark-relative;
  same alpha against different benchmarks gives different IR.
- **Frequency.** Daily IR is `1/√252` of annualised IR
  approximately. Be explicit about which you're reporting.
- **Tracking error inflation.** Adding leverage scales both
  numerator and denominator; IR is approximately
  leverage-invariant in steady state.

## References

- Grinold & Kahn, *Active Portfolio Management* (1995, 2nd ed.
  1999) — canonical IR treatment.

## See also

- [SharpeRatio](Indicator-SharpeRatio) — own-volatility analog.
- [TreynorRatio](Indicator-TreynorRatio) — beta-based analog.
- [Alpha](Indicator-Alpha) — CAPM-adjusted active return.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
