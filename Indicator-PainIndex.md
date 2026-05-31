# Pain Index

> Thomas Becker's continuous-pain risk measure. The mean drawdown
> depth over the trailing window, expressed as a non-negative
> fraction. Functionally identical to
> [AverageDrawdown](Indicator-AverageDrawdown); exists as a
> separate type to expose the measure under its conventional name.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Risk / Performance                                                   |
| Input type          | `f64` — one equity-curve sample per update                           |
| Output type         | `f64`                                                                |
| Output range        | `[0, 1]` (fraction of peak)                                          |
| Default parameters  | `period` required                                                    |
| Warmup period       | `period`                                                             |
| Interpretation      | Average drawdown depth — "continuous pain"                            |

## Formula

```
peak_t  = running max over window up to t
dd_t    = (peak_t - equity_t) / peak_t       (0 if no drawdown)
PainIdx = mean(dd_t over window)
```

Same construction as [AverageDrawdown](Indicator-AverageDrawdown).
Becker introduced "Pain Index" as a complementary metric to
[UlcerIndex](Indicator-UlcerIndex) — the Ulcer Index squares
drawdowns before averaging (RMS), while Pain Index uses a plain
arithmetic mean. See
`crates/wickra-core/src/indicators/pain_index.rs`.

## Parameters

| Name     | Type    | Default | Constraint | Description |
|----------|---------|---------|------------|-------------|
| `period` | `usize` | none    | `> 0`      | Rolling window length. |

## Inputs / Outputs

Same as [AverageDrawdown](Indicator-AverageDrawdown).

## Warmup

`warmup_period() == period`.

## Edge cases

- **Equivalent to AverageDrawdown.** Same output, different
  marketing name.
- **Reset.** Clears the rolling window.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, PainIndex};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let equity = vec![100.0, 110.0, 100.0, 95.0, 88.0, 90.0, 92.0, 95.0, 100.0, 105.0];
    let mut p = PainIndex::new(10)?;
    println!("{:?}", p.batch(&equity).last());
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

equity = np.array([100, 110, 100, 95, 88, 90, 92, 95, 100, 105], dtype=float)
p = ta.PainIndex(10)
print(p.batch(equity))
```

### Node

```javascript
const wickra = require('wickra');
const p = new wickra.PainIndex(10);
console.log(p.batch([100, 110, 100, 95, 88, 90, 92, 95, 100, 105]));
```

### Streaming

```rust
use wickra::{Indicator, PainIndex};

let mut p = PainIndex::new(252).unwrap();
let equity_stream: Vec<f64> = Vec::new(); // your equity-curve feed
for equity in equity_stream {
    if let Some(v) = p.update(equity) {
        // ...
    }
}
```

## Interpretation

- **Pain index value.** A Pain Index of `0.05` means the
  strategy spent the trailing window with an average drawdown
  of 5% from peak.
- **Pair with Sharpe.** A "Pain Ratio" can be constructed as
  `return / pain_index`; useful when MDD is too sensitive to a
  single bad event.
- **Vs Ulcer Index.** Ulcer squares drawdowns first (RMS), which
  penalises deep drawdowns more heavily. Same equity curve gives
  Ulcer > Pain when drawdowns are uneven.

## Common pitfalls

- **Confused with MaxDrawdown.** Pain measures *average*, not
  worst. They tell different stories.
- **Window choice.** Same as MaxDrawdown — short windows forget.

## References

- Thomas Becker introduced the Pain Index in the
  *Financial Analysts Journal*; it's a sibling of the Ulcer Index
  (Martin & McCann, 1989).

## See also

- [AverageDrawdown](Indicator-AverageDrawdown) — same metric,
  alternate name.
- [UlcerIndex](Indicator-UlcerIndex) — RMS-weighted alternative.
- [MaxDrawdown](Indicator-MaxDrawdown) — worst-case sibling.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
