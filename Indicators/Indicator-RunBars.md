# RunBars

> Persistence bars — sample on an uninterrupted run of same-signed ticks.
> *(Simplified López de Prado: fixed run length, unweighted ticks.)*

## Quick reference

| Field | Value |
|-------|-------|
| Family | Alt-Chart Bars |
| Trait | `BarBuilder` (not `Indicator`) |
| Input type | `Candle` |
| Output type | `Vec<RunBar>` (0 or 1 bar per candle) |
| Bar element | `RunBar { open, high, low, close, length, direction: i8 }` |
| Default parameters | `(run_length = 10)` |
| Warmup | none (seeds on the first candle) |
| Interpretation | Each bar = a streak of one-directional ticks. |

## Formula

```
sign_t = +1 if close_t > close_{t-1}, -1 if below, flat extends the run
run continues while the sign is unchanged; an opposite tick restarts it at 1
close the bar when run length reaches run_length
direction = sign of the run
```

A *run* is an uninterrupted streak of same-signed ticks — a buy run or a sell run,
with unchanged closes extending it. The builder closes a bar when the current run
reaches `run_length`; an opposite tick restarts the count. Where
[`ImbalanceBars`](/Indicators/Indicator-ImbalanceBars) sample on the *net* signed
imbalance (which oscillating flow can cancel), run bars sample on *persistence* —
they fire only when the market pushes the same way without interruption, making them
a cleaner sequential-trend detector. Source:
`crates/wickra-core/src/indicators/run_bars.rs`.

> **Simplified.** The full method estimates a *dynamic* expected run length from an
> EWMA and can weight runs by volume or traded value. This builder uses a **fixed**
> run-length threshold on unweighted ticks. See López de Prado (2018), ch. 2.

## Parameters

| Name         | Type    | Default | Valid range | Source | Description |
|--------------|---------|---------|-------------|--------|-------------|
| `run_length` | `usize` | `10`    | `>= 1`      | `run_bars.rs:72` | Run length that closes a bar. `0` errors with `Error::PeriodZero`. |

The `run_length` and `run` getters expose the configuration and the in-progress run
length.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/run_bars.rs`:

```rust
use wickra::{BarBuilder, Candle, RunBar, RunBars};
// RunBars: Input = Candle, Output = Vec<RunBar>
const _: fn(&mut RunBars, Candle) -> Vec<RunBar> = <RunBars as BarBuilder>::update;
```

A `Candle` in, a `Vec<RunBar>` out (empty until a full run completes). Bindings are
close-driven: Python `update(close) -> list[tuple]`; Node `update(close) ->
RunBar[]`. No `warmupPeriod`/`isReady`.

## Signed ±1 encoding

The `direction` field is `+1` when a **buy run** (consecutive up-ticks) closed the
bar and `-1` when a **sell run** closed it. The `length` field is the run length at
the close (equal to `run_length`).

## Edge cases

- **Buy run.** Three up-ticks at `run_length = 3` close a `+1` bar
  (`buy_run_closes_up_bar` pins this).
- **Sell run.** Three down-ticks close a `-1` bar (`sell_run_closes_down_bar`).
- **Opposite tick.** A reversal restarts the run at one
  (`opposite_tick_restarts_run` pins this).
- **Flat tick.** An unchanged close extends the current run
  (`flat_tick_extends_run` pins this).
- **Reset.** `reset()` clears the run and previous close (`reset_clears_state`).
- **Batch.** `batch` concatenates completed bars; length is data-dependent
  (`batch_concatenates_completed_bars` pins this).

## Examples

### Rust

```rust
use wickra::{BarBuilder, Candle, RunBars};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let flat = |p: f64| Candle::new(p, p, p, p, 1.0, 0).unwrap();
    let mut bars = RunBars::new(3)?;
    bars.update(flat(10.0));            // seed
    bars.update(flat(11.0));            // run 1
    bars.update(flat(12.0));            // run 2
    let out = bars.update(flat(13.0));  // run 3 -> close
    println!("{} {}", out[0].direction, out[0].length); // 1 3
    Ok(())
}
```

Output:

```
1 3
```

### Python

```python
import wickra as ta

bars = ta.RunBars(3)
for p in (10.0, 11.0, 12.0):
    bars.update(p)
print(bars.update(13.0))   # [(10.0, 13.0, 10.0, 13.0, 3, 1)]
```

### Node

```javascript
const ta = require('wickra');
const bars = new ta.RunBars(3);
[10.0, 11.0, 12.0].forEach((p) => bars.update(p));
console.log(bars.update(13.0)[0].direction); // 1
```

### Streaming

```rust
use wickra::{BarBuilder, Candle, RunBars};

let mut bars = RunBars::new(10).unwrap();
let feed: Vec<Candle> = Vec::new(); // your live stream
for candle in feed {
    for bar in bars.update(candle) {
        // a closed run bar marks a persistent directional push
    }
}
```

`batch` is equivalent to replaying `update` candle-by-candle and concatenating
(`batch_concatenates_completed_bars` pins this).

## Interpretation

1. **Trend persistence.** A run bar only forms when price moves the same way without
   interruption, so a sequence of same-direction run bars is strong trend evidence.
2. **Versus imbalance.** Choppy two-sided flow can build a large net imbalance yet
   never sustain a run — run bars stay silent there, imbalance bars do not.
3. **Microstructure regime.** Frequent run bars signal momentum/trending regimes;
   their absence signals mean-reverting, balanced markets.

## Common pitfalls

- **Fixed run length.** Real markets' expected run length varies; use the adaptive
  EWMA estimator for stationary bar frequency.
- **Flat handling.** Unchanged closes extend the run here — for strict tick rules,
  pre-filter flat candles.
- **Not an `Indicator`.** No warmup, emits a `Vec`, cannot join a `Chain`.

## References

López de Prado, M. (2018), *Advances in Financial Machine Learning*, ch. 2 —
run bars and the EWMA run-length estimator.

## See also

- [Indicator-ImbalanceBars](/Indicators/Indicator-ImbalanceBars) — net signed flow.
- [Indicator-TickBars](/Indicators/Indicator-TickBars) — equal trade count.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
