# ThreeLineBreakBars

> Line-break chart segments — a new line per close extreme, reversing only on a break
> of the last three lines.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Alt-Chart Bars |
| Trait | `BarBuilder` (not `Indicator`) |
| Input type | `Candle` |
| Output type | `Vec<LineBreakBar>` (0 or 1 line per candle) |
| Bar element | `LineBreakBar { open, close, direction: i8 }` |
| Default parameters | `(lines = 3)` |
| Warmup | none (seeds on the first candle) |
| Interpretation | Each line = one confirmed leg of the trend. |

## Formula

```
seed:        reference = first close
first line:  first move up/down draws line 1
up-trend:    close > last line's top  -> new up line   (continuation)
             close < lowest low of last `lines` lines -> new down line (reversal)
down-trend:  symmetric
```

A line-break chart draws a new line in the trend direction whenever the close makes a
new extreme, and reverses only when the close breaks the extreme of the previous
`lines` lines (three by default). A pullback that fails to exceed the last three
lines is ignored, so the chart isolates meaningful reversals and filters noise.
Source: `crates/wickra-core/src/indicators/three_line_break_bars.rs`.

This is the **bar-builder** counterpart of the
[`ThreeLineBreak`](/Indicators/Indicator-ThreeLineBreak) indicator: the indicator
streams the current line *state* as a value, while this builder emits each completed
line as a `LineBreakBar` so you can reconstruct the full chart.

## Parameters

| Name    | Type    | Default | Valid range | Source | Description |
|---------|---------|---------|-------------|--------|-------------|
| `lines` | `usize` | `3`     | `>= 1`      | `three_line_break_bars.rs:62` | Lines a reversal must break (3 = classic three-line break). `0` errors with `Error::PeriodZero`. |

The `lines` and `tracked` getters expose the configuration and the count of recent
lines held for the reversal test.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/three_line_break_bars.rs`:

```rust
use wickra::{BarBuilder, Candle, LineBreakBar, ThreeLineBreakBars};
// ThreeLineBreakBars: Input = Candle, Output = Vec<LineBreakBar>
const _: fn(&mut ThreeLineBreakBars, Candle) -> Vec<LineBreakBar> =
    <ThreeLineBreakBars as BarBuilder>::update;
```

A `Candle` in, a `Vec<LineBreakBar>` out (empty until a line forms). Bindings are
close-driven: Python `update(close) -> list[tuple]`; Node `update(close) ->
LineBreakBar[]`. No `warmupPeriod`/`isReady`.

## Signed ±1 encoding

The `direction` field is `+1` for a **rising** line (a new high extended the
up-trend, or an up-reversal) and `-1` for a **falling** line. The `open` is the
previous line's far edge; the `close` is the new close that drew the line.

## Edge cases

- **Seed then first line.** The first candle seeds; the first move draws line 1
  (`seed_then_first_line` pins this).
- **Continuation.** A new high extends the up-trend with another up line
  (`new_high_extends_up_line` pins this).
- **No break.** A pullback inside the last three lines prints nothing
  (`small_pullback_prints_nothing` pins this).
- **Reversal.** A close below the lowest low of the last three lines reverses
  (`reversal_breaks_three_lines` pins this).
- **Reset.** `reset()` clears the seed and tracked lines (`reset_clears_state`).
- **Batch.** `batch` concatenates completed lines; length is data-dependent
  (`batch_concatenates_completed_lines` pins this).

## Examples

### Rust

```rust
use wickra::{BarBuilder, Candle, ThreeLineBreakBars};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let flat = |p: f64| Candle::new(p, p, p, p, 1.0, 0).unwrap();
    let mut bars = ThreeLineBreakBars::new(3)?;
    bars.update(flat(10.0));               // seed
    let first = bars.update(flat(11.0));   // first up line
    println!("{} {}", first[0].direction, first[0].close); // 1 11
    Ok(())
}
```

Output:

```
1 11
```

### Python

```python
import wickra as ta

bars = ta.ThreeLineBreakBars(3)
bars.update(10.0)                # seed -> []
print(bars.update(11.0))         # [(10.0, 11.0, 1)]
```

### Node

```javascript
const ta = require('wickra');
const bars = new ta.ThreeLineBreakBars(3);
bars.update(10.0);                       // seed
console.log(bars.update(11.0)[0].direction); // 1
```

### Streaming

```rust
use wickra::{BarBuilder, Candle, ThreeLineBreakBars};

let mut bars = ThreeLineBreakBars::new(3).unwrap();
let feed: Vec<Candle> = Vec::new(); // your live stream
for candle in feed {
    for line in bars.update(candle) {
        // a direction flip marks a confirmed three-line-break reversal
    }
}
```

`batch` is equivalent to replaying `update` candle-by-candle and concatenating
(`batch_concatenates_completed_lines` pins this).

## Interpretation

1. **Noise filter.** Because reversals require breaking three lines, choppy ranges
   produce few or no lines — the chart only "moves" on confirmed trends.
2. **Reversal signal.** A change in `direction` is the classic three-line-break
   trade trigger; raise `lines` for a stricter (slower) filter.
3. **Pair with the indicator.** Use [`ThreeLineBreak`](/Indicators/Indicator-ThreeLineBreak)
   when you need a streaming trend state, and this builder when you need the line
   geometry for charting or pattern analysis.

## Common pitfalls

- **Close-driven.** Lines use close prices, not intrabar high/low — intrabar spikes
  do not draw lines.
- **Lookback ramp-up.** With fewer than `lines` lines drawn, reversals test against
  the lines available so far.
- **Not an `Indicator`.** No warmup, emits a `Vec`, cannot join a `Chain`.

## References

Nison, S. (1994), *Beyond Candlesticks* — three-line-break charts; a staple of the
Japanese charting tradition.

## See also

- [Indicator-ThreeLineBreak](/Indicators/Indicator-ThreeLineBreak) — the streaming indicator form.
- [Indicator-RenkoBars](/Indicators/Indicator-RenkoBars) — fixed-brick alternative chart.
- [Indicator-KagiBars](/Indicators/Indicator-KagiBars) — reversal-amount line segments.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
