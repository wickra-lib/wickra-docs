# WinRate

> The fraction of strictly-positive returns over a rolling window of returns, in
> `[0, 1]`.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Risk / Performance |
| Input type | `f64` (per-trade or per-bar return / PnL) |
| Output type | `f64` |
| Output range | `[0, 1]` |
| Default parameters | `period` is required |
| Warmup period | `period` |
| Interpretation | Share of the window that strictly made money. |

## Formula

```
WinRate = #(rᵢ > 0) / period
```

Feed a stream of per-trade or per-bar returns; the indicator reports the rolling
hit rate. A return of exactly `0` is treated as a non-win (a flat / scratch), so
`WinRate` is the share of the window that strictly made money — the most basic
performance statistic and a building block for
[Expectancy](/Indicators/Indicator-Expectancy), Kelly sizing, and confidence filters.

Source: `crates/wickra-core/src/indicators/win_rate.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= 1`      | `win_rate.rs:46` | Window of returns. `0` errors with `Error::PeriodZero`. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/win_rate.rs`:

```rust
use wickra::{Indicator, WinRate};
// WinRate: Input = f64, Output = f64
const _: fn(&mut WinRate, f64) -> Option<f64> = <WinRate as Indicator>::update;
```

Python streams as `float | None`, batches as a 1-D `numpy.ndarray`. Node streams
as `number | null`, batches as `Array<number>`.

## Warmup

`warmup_period() == period`. The unit test `accessors_and_metadata` pins
`warmup_period() == 20` for `period = 20`.

## Edge cases

- **Reference value.** `+, −, +, +` is 3 wins of 4 → `0.75`; pinned by
  `reference_value`.
- **All wins / all losses.** `1.0` / `0.0`; pinned by `all_wins_is_one` and
  `all_losses_is_zero`.
- **Flat returns.** Zeros count as non-wins; pinned by
  `flat_returns_are_not_wins`.
- **Rolling eviction.** Old wins slide out of the window; pinned by
  `rolling_window_drops_old_wins`.
- **Bounds.** Output is always in `[0, 1]`; pinned by `output_within_bounds`.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, WinRate};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut wr = WinRate::new(4)?;
    println!("{:?}", wr.batch(&[1.0, -1.0, 2.0, 1.0]));
    Ok(())
}
```

Output:

```
[None, None, None, Some(0.75)]
```

### Python

```python
import wickra as ta

wr = ta.WinRate(4)
for r in [1.0, -1.0, 2.0, 1.0]:
    print(r, '->', wr.update(r))
```

Output:

```
1.0 -> None
-1.0 -> None
2.0 -> None
1.0 -> 0.75
```

### Node

```javascript
const ta = require('wickra');
const wr = new ta.WinRate(4);
for (const r of [1, -1, 2, 1]) console.log(r, '->', wr.update(r));
```

Output:

```
1 -> null
-1 -> null
2 -> null
1 -> 0.75
```

## Interpretation

`WinRate` is the headline performance statistic for a returns or PnL stream:
what fraction of recent trades/bars made money. On its own it is incomplete (a
high win rate with large losers can still lose money), so combine it with
[Expectancy](/Indicators/Indicator-Expectancy) (per-trade edge in risk units) and
[ProfitFactor](/Indicators/Indicator-ProfitFactor) / [KellyCriterion](/Indicators/Indicator-KellyCriterion)
for a full picture.

## Common pitfalls

- **Win rate is not edge.** A 70% win rate with a 1:5 reward:risk can be a losing
  system. Always read it alongside the payoff side via
  [Expectancy](/Indicators/Indicator-Expectancy).
- **Flat = non-win.** Scratch trades (return exactly `0`) lower the rate; they are
  neither wins nor losses.

## References

A standard trade statistic; see Van Tharp, *Trade Your Way to Financial Freedom*
(1998), for win rate in the expectancy framework.

## See also

- [Indicator-Expectancy](/Indicators/Indicator-Expectancy) — per-trade edge in risk units.
- [Indicator-ProfitFactor](/Indicators/Indicator-ProfitFactor) — gross profit / gross loss.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
