# M2Measure

> The Modigliani–Modigliani measure — the Sharpe ratio rescaled into the
> benchmark's return units.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Risk / Performance |
| Input type | `f64` (per-period returns) |
| Output type | `f64` (per-period return units) |
| Output range | unbounded |
| Default parameters | `(period = 20, risk_free = 0.0, benchmark_stddev = 0.02)` (Python) |
| Warmup period | `period` |
| Interpretation | Risk-matched return: higher beats the benchmark on equal volatility. |

## Formula

```
Sharpe = (mean(returns) − risk_free) / stddev(returns)
M²     = risk_free + Sharpe · benchmark_stddev
```

`stddev` is the sample standard deviation (Bessel's `n − 1`). M² takes the
dimensionless [`SharpeRatio`](/Indicators/Indicator-SharpeRatio) and projects it
back onto a return scale by imagining the portfolio levered to the benchmark's
volatility. The output is "the return this strategy would have earned at the
market's risk level" — directly comparable across strategies and quotable as a
percentage. M² preserves the Sharpe ordering. A flat window has zero volatility, the
Sharpe ratio is undefined, and the indicator reports `0.0`. Source:
`crates/wickra-core/src/indicators/m2_measure.rs`.

## Parameters

| Name               | Type    | Default        | Valid range      | Source | Description |
|--------------------|---------|----------------|------------------|--------|-------------|
| `period`           | `usize` | `20` (Python)  | `>= 2`           | `m2_measure.rs:60` | Window of returns. `< 2` errors with `Error::InvalidPeriod`. |
| `risk_free`        | `f64`   | `0.0`          | finite           | `m2_measure.rs:65` | Per-period risk-free rate. |
| `benchmark_stddev` | `f64`   | `0.02`         | finite, `>= 0`   | `m2_measure.rs:65` | Per-period benchmark volatility. Negative/non-finite errors with `Error::InvalidParameter`. |

The `period`, `risk_free`, and `benchmark_stddev` getters return the configuration.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/m2_measure.rs`:

```rust
use wickra::{Indicator, M2Measure};
// M2Measure: Input = f64, Output = f64
const _: fn(&mut M2Measure, f64) -> Option<f64> = <M2Measure as Indicator>::update;
```

An `f64` return in, an `Option<f64>` out. Python `update(ret)` / `batch(returns)`
(NaN warmup); Node `update(ret)` / `batch(returns[])` (null warmup).

## Warmup

`warmup_period() == period`. The first value lands once `period` returns are seen
(`reference_value` exercises the emission at index `period − 1`).

## Edge cases

- **Reference value.** `[0.01, 0.02, 0.03, 0.04]`, `rf = 0`, `benchmark_stddev = 0.02`
  → `Sharpe · 0.02` (`reference_value` pins this).
- **Constant returns.** A flat window has zero volatility and reports `0.0`
  (`constant_returns_yield_zero` pins this).
- **Non-finite input.** A NaN/∞ return is skipped (`ignores_non_finite_input`).
- **Invalid `benchmark_stddev`.** Negative or non-finite errors at construction
  (`rejects_invalid_benchmark_stddev` pins this).
- **Reset.** `m2.reset()` clears the window and running sums (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, M2Measure};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut m2 = M2Measure::new(4, 0.0, 0.02)?;
    let out = m2.batch(&[0.01, 0.02, 0.03, 0.04]);
    println!("{:?}", out[3]); // Some(0.0387...)
    Ok(())
}
```

Output:

```
Some(0.03872983346207417)
```

### Python

```python
import numpy as np
import wickra as ta

m2 = ta.M2Measure(20, 0.0, 0.02)
returns = 0.001 + np.random.randn(60) * 0.01
print(m2.batch(returns)[-1])
```

### Node

```javascript
const ta = require('wickra');
const m2 = new ta.M2Measure(4, 0.0, 0.02);
console.log(m2.batch([0.01, 0.02, 0.03, 0.04]).at(-1)); // ~0.0387
```

### Streaming

```rust
use wickra::{Indicator, M2Measure};

let mut m2 = M2Measure::new(20, 0.0, 0.02).unwrap();
for r in monthly_returns {
    if let Some(m) = m2.update(r) {
        // m is the risk-matched return, comparable to the benchmark return
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Client communication.** Quote M² as "risk-adjusted return" — a percentage a
   non-quant understands, unlike a bare Sharpe number.
2. **Same ordering, better units.** M² ranks strategies identically to the Sharpe
   ratio, so use it whenever the audience needs a return, not a ratio.
3. **Beat the market test.** Compare M² to the benchmark's own mean return: if M²
   exceeds it, the strategy outperformed on a risk-matched basis.

## Common pitfalls

- **Frequency consistency.** `risk_free` and `benchmark_stddev` must match the
  return frequency — annualise all three together or none.
- **Zero-volatility anomaly.** A flat window reports `0.0` (undefined), not the
  risk-free rate.
- **Benchmark choice matters.** M² is only as meaningful as the `benchmark_stddev`
  you feed it.

## References

Modigliani, F., & Modigliani, L. (1997), *Risk-Adjusted Performance*, Journal of
Portfolio Management — the M² measure.

## See also

- [Indicator-SharpeRatio](/Indicators/Indicator-SharpeRatio) — the underlying ratio.
- [Indicator-KRatio](/Indicators/Indicator-KRatio) — equity-curve consistency.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
