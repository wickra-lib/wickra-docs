# Expectancy

> The expected return per trade in units of average loss (the "R-multiple"
> expectancy) over a rolling window of returns.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Risk / Performance |
| Input type | `f64` (per-trade or per-bar return) |
| Output type | `f64` |
| Output range | unbounded; signed (`> 0` profitable edge) |
| Default parameters | `period` is required |
| Warmup period | `period` |
| Interpretation | `E = 0.3` nets `0.3R` per trade, where `R` is the average loss. |

## Formula

```
mean    = average of the `period` returns
avgLoss = average of the absolute losing returns (rᵢ < 0)
E       = mean / avgLoss          (0 when there are no losing returns)
```

Dividing the mean return by the average loss makes the figure comparable across
systems with different bet sizes — unlike the raw mean return (which is just an
SMA of the series). A positive `E` is a profitable edge, a negative `E` a losing
one. When the window contains **no** losing returns there is no risk reference,
so the indicator returns `0` (undefined R-multiple).

Source: `crates/wickra-core/src/indicators/expectancy.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= 1`      | `expectancy.rs:54` | Window of returns. `0` errors with `Error::PeriodZero`. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/expectancy.rs`:

```rust
use wickra::{Indicator, Expectancy};
// Expectancy: Input = f64, Output = f64
const _: fn(&mut Expectancy, f64) -> Option<f64> = <Expectancy as Indicator>::update;
```

Python streams as `float | None`, batches as an `array.array('d')`. Node streams
as `number | null`, batches as `Array<number>`.

## Warmup

`warmup_period() == period`. The unit test `accessors_and_metadata` pins
`warmup_period() == 20` for `period = 20`.

## Edge cases

- **Positive edge.** `+2, −1, +2, −1`: mean `0.5`, avgLoss `1` → `0.5`; pinned by
  `positive_edge`.
- **Negative edge.** `+1, −2, +1, −2`: mean `−0.5`, avgLoss `2` → `−0.25`; pinned
  by `negative_edge`.
- **No losses.** An all-winning window returns `0` (no risk reference); pinned by
  `no_losses_returns_zero`.
- **Flat returns.** Zeros are not losses; pinned by `flat_returns_are_not_losses`.
- **Rolling eviction.** Old losses slide out, flipping the window to "no losses";
  pinned by `rolling_window_evicts_old_losses`.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, Expectancy};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut e = Expectancy::new(4)?;
    println!("{:?}", e.batch(&[2.0, -1.0, 2.0, -1.0]));
    Ok(())
}
```

Output:

```
[None, None, None, Some(0.5)]
```

### Python

```python
import wickra as ta

e = ta.Expectancy(4)
for r in [2.0, -1.0, 2.0, -1.0]:
    print(r, '->', e.update(r))
```

Output:

```
2.0 -> None
-1.0 -> None
2.0 -> None
-1.0 -> 0.5
```

### Node

```javascript
const ta = require('wickra');
const e = new ta.Expectancy(4);
for (const r of [2, -1, 2, -1]) console.log(r, '->', e.update(r));
```

Output:

```
2 -> null
-1 -> null
2 -> null
-1 -> 0.5
```

## Interpretation

`Expectancy` answers "how much do I make per trade for every unit I typically
risk?". Because it normalises by the average loss, an expectancy of `0.3` means
the same thing whether you bet $10 or $10,000 — a positive, comparable edge. Read
it alongside [WinRate](/Indicators/Indicator-WinRate) (hit rate) and the payoff side: a
modest win rate with a large expectancy is a strong system.

## Common pitfalls

- **`0` means "no losses in window", not "no edge".** An all-winning window has
  no risk reference and returns `0`; that is a degenerate case, not a flat edge.
- **Not the same as mean return.** Plain `mean(return)` is an SMA of the series;
  `Expectancy` divides it by the average loss to express the edge in risk (R)
  units.

## References

Van Tharp's expectancy (`E ≈ mean(R)`, with `R` = return / initial risk),
*Trade Your Way to Financial Freedom* (1998).

## See also

- [Indicator-WinRate](/Indicators/Indicator-WinRate) — the hit-rate companion.
- [Indicator-KellyCriterion](/Indicators/Indicator-KellyCriterion) — edge-based bet sizing.
- [Indicator-ProfitFactor](/Indicators/Indicator-ProfitFactor) — gross profit / gross loss.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
