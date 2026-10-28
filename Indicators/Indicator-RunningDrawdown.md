# Running Drawdown

> The deepest peak-to-trough decline since the first value, over an
> unbounded stream. Tracks the running peak, the current drawdown and
> the worst drawdown so far in O(1) memory, with no parameters and no
> warmup. Output is a non-negative fraction (`0.20` = 20% drop from
> peak), the same convention as `MaxDrawdown`.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Risk / Performance |
| Input type | `f64` — one equity-curve sample per update |
| Output type | `f64` |
| Output range | `[0, 1]` (fraction of peak) for non-negative equity |
| Default parameters | none — `RunningDrawdown::new()` |
| Warmup period | `1` |
| Interpretation | Worst drawdown since inception; never forgets |

## Formula

```
peak_t     = max(input over [0..=t])
current_t  = (peak_t - input_t) / peak_t        (0 while peak_t <= 0)
max_t      = max(current over [0..=t])
output_t   = max_t
```

Each `update` folds the new value into three numbers: the running
peak (the high-water mark), the drawdown of the latest value from that
peak, and the worst drawdown seen so far. Nothing is stored per bar, so
memory is constant and each update is O(1) however long the stream
runs.

Only a positive peak counts. While the running peak is zero or
negative the fractional drawdown is undefined and the indicator reports
`0`, the same guard `MaxDrawdown` uses. See
`crates/wickra-core/src/indicators/running_drawdown.rs`.

The result equals `MaxDrawdown` with a `period` at least as long as the
stream. Two unit tests pin that: `matches_max_drawdown_with_a_period_covering_the_stream`
runs both side by side over 200 bars, and
`matches_max_drawdown_at_every_bar_via_growing_periods` checks every
prefix against `MaxDrawdown(n)` over exactly that prefix.

## Parameters

None. `RunningDrawdown::new()` takes no arguments, and
`RunningDrawdown::default()` is the same (unit test
`default_matches_new`). Python: `wickra.RunningDrawdown()`. Node:
`new RunningDrawdown()`.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/running_drawdown.rs`:

```rust
use wickra::{Indicator, RunningDrawdown};
// RunningDrawdown: Input = f64, Output = f64
const _: fn(&mut RunningDrawdown, f64) -> Option<f64> = <RunningDrawdown as Indicator>::update;
```

`update` returns the maximum drawdown so far. Three accessors expose the
full running state, each `None` before the first finite value:

| Rust | Python (property) | Meaning |
|------|-------------------|---------|
| `max_drawdown()` | `max_drawdown` | Worst drawdown since the first value; what `update` returns. |
| `current_drawdown()` | `current_drawdown` | Drawdown of the latest value from the running peak; `0` at a new peak. |
| `peak()` | `peak` | Highest value seen since the first value. |

Python streams as `float | None` and batches as an `array.array('d')`.
Node streams as `number | null` and batches as `Array<number>`; the
Node class carries `update`, `batch` and the batch-fast variants, but not
the three accessors. Since the first finite value already emits, a batch
has no warmup `NaN`; it carries `NaN` only where the input itself is
non-finite.

## Warmup

`warmup_period() == 1`. The first finite input emits `0.0`: a single
value is its own peak, so there is no drawdown yet. Unit tests
`first_value_emits_immediately` and `accessors_and_metadata` pin this.

## Edge cases

- **Old drawdowns are kept.** A 50% drop followed by 1000 bars of
  new highs still reports `0.5` as the maximum, while the current
  drawdown is back to `0` (test
  `remembers_a_drawdown_older_than_any_window`). This is the point of
  the indicator: `MaxDrawdown` would drop it once it slides out of the
  window.
- **Monotonically rising input.** Output is `0` throughout (test
  `pure_uptrend_yields_zero`).
- **Non-positive peak.** While the running peak is zero or negative,
  no drawdown is measured, so an all-non-positive series gives `0`
  (test `non_positive_peak_yields_zero`). A dip below zero after a
  positive peak gives a value above `1`.
- **Non-finite input.** `NaN` and `±∞` return `None` and leave the
  peak, the current and the maximum drawdown untouched (test
  `ignores_non_finite_input`). A non-finite first input leaves the
  indicator unseeded: `is_ready()` stays `false` and `peak()` stays
  `None` (test `non_finite_first_input_leaves_it_unseeded`).
- **Reset.** `reset()` forgets the peak and both drawdowns; the next
  value seeds a fresh run and emits `0.0` (test `reset_clears_state`).
- **Batch equals streaming.** `batch` gives the same values as calling
  `update` in a loop (test `batch_equals_streaming`).

## Examples

The series below peaks at 120, falls to 90 (a 25% drawdown) and
recovers to 110. These are the numbers of the `reference_drawdown`
unit test.

### Rust

```rust
use wickra::{BatchExt, RunningDrawdown};

fn main() {
    let mut dd = RunningDrawdown::new();
    let out = dd.batch(&[100.0, 120.0, 90.0, 110.0]);
    println!("{:?}", out);
    println!("max     = {:?}", dd.max_drawdown());
    println!("current = {:?}", dd.current_drawdown());
    println!("peak    = {:?}", dd.peak());
}
```

Output:

```
[Some(0.0), Some(0.0), Some(0.25), Some(0.25)]
max     = Some(0.25)
current = Some(0.08333333333333333)
peak    = Some(120.0)
```

The drop from 120 to 90 is `30 / 120 = 0.25`. The recovery to 110
shrinks the current drawdown to `10 / 120` but leaves the maximum at
`0.25`.

### Python

```python
import wickra as ta

dd = ta.RunningDrawdown()
for x in [100.0, 120.0, 90.0, 110.0]:
    print(x, '->', dd.update(x))
print('max_drawdown:', dd.max_drawdown)
print('current_drawdown:', dd.current_drawdown)
print('peak:', dd.peak)
print(ta.RunningDrawdown().batch([100.0, 120.0, 90.0, 110.0]))
```

Output:

```
100.0 -> 0.0
120.0 -> 0.0
90.0 -> 0.25
110.0 -> 0.25
max_drawdown: 0.25
current_drawdown: 0.08333333333333333
peak: 120.0
array('d', [0.0, 0.0, 0.25, 0.25])
```

### Node

```javascript
const ta = require('wickra');
const dd = new ta.RunningDrawdown();
for (const x of [100, 120, 90, 110]) {
  console.log(x, '->', dd.update(x));
}
console.log(new ta.RunningDrawdown().batch([100, 120, 90, 110]));
```

Output:

```
100 -> 0
120 -> 0
90 -> 0.25
110 -> 0.25
[ 0, 0, 0.25, 0.25 ]
```

### Streaming

```rust
use wickra::{Indicator, RunningDrawdown};

let mut dd = RunningDrawdown::new();
let equity_stream: Vec<f64> = Vec::new(); // your equity-curve feed
for equity in equity_stream {
    // Emits from the first value on; no warmup to wait for.
    if let Some(worst) = dd.update(equity) {
        let now = dd.current_drawdown().unwrap();
        if now > 0.10 { /* currently more than 10% under water */ }
        if worst > 0.25 { /* the account has been down 25% at some point */ }
    }
}
```

## Interpretation

`RunningDrawdown` answers "what is the worst this equity curve has ever
been hit", for a stream that has no natural end. It is the metric a
live account, a long backtest fed bar by bar, or a fund's risk report
wants, where a trailing window would quietly forget the crash that
matters most.

1. **Since-inception risk.** The maximum is the figure that goes into
   a track record: the deepest loss an investor would have sat
   through, measured from the high-water mark.
2. **Live position in the drawdown.** `current_drawdown` says how far
   below the high-water mark the curve is right now; at `0` the
   account is at a new peak. Many risk rules (cut size at 10% under
   water, stop trading at 20%) key off this value rather than the
   maximum.
3. **Return per unit of pain.** Divide the total return by
   `max_drawdown` for a since-inception
   [RecoveryFactor](/Indicators/Indicator-RecoveryFactor), or use the
   rolling [CalmarRatio](/Indicators/Indicator-CalmarRatio) when a
   window is wanted.

Use [MaxDrawdown](/Indicators/Indicator-MaxDrawdown) instead when the
question is about recent behaviour ("the worst drawdown of the last
year"); its window lets old drawdowns roll off.
[DrawdownDuration](/Indicators/Indicator-DrawdownDuration) measures the
time spent under water rather than the depth.

## Common pitfalls

- **Feeding returns instead of equity.** The input is the equity
  curve (account value, cumulative wealth), not per-bar returns. A
  return series dips below zero all the time; fed directly, the
  "peak" is the best single return and the output means nothing.
  Accumulate returns into equity first.
- **Expecting the maximum to recover.** The maximum never decreases
  until `reset()`. If you want a number that comes back down after a
  recovery, read `current_drawdown`, or use `MaxDrawdown` with a
  window.
- **Reading the output as signed.** The value is a positive magnitude
  (`0.25` = 25% below peak), not a negative return.
- **Negative or zero equity.** The fraction is measured from a
  positive peak. A curve that starts at or below zero reports `0`
  until it first goes positive.

## References

- Magdon-Ismail, M. & Atiya, A. F. (2004). *Maximum Drawdown*. Risk
  Magazine, October 2004 — formal statistical treatment of the
  maximum drawdown.
- The high-water mark this indicator tracks is the same reference
  level hedge funds use to charge performance fees only on new highs.

## See also

- [MaxDrawdown](/Indicators/Indicator-MaxDrawdown) — the same measure
  over a trailing window.
- [DrawdownDuration](/Indicators/Indicator-DrawdownDuration) — time
  under water since the all-time peak.
- [RecoveryFactor](/Indicators/Indicator-RecoveryFactor) — cumulative
  net return divided by the maximum drawdown.
- [AverageDrawdown](/Indicators/Indicator-AverageDrawdown) — mean
  drawdown depth over a window.
- [UlcerIndex](/Indicators/Indicator-UlcerIndex) — RMS-weighted
  drawdown measure.
- [Indicators-Overview](/Indicators-Overview) — full taxonomy.
