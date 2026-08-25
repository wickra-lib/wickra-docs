# RangeBars

> Fixed price-range bars with no reversal penalty — one bar per `range` of close
> movement in either direction.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Alt-Chart Bars |
| Trait | `BarBuilder` (not `Indicator`) |
| Input type | `Candle` |
| Output type | `Vec<RangeBar>` (0..n completed bars per candle) |
| Bar element | `RangeBar { open, close, direction: i8 }` |
| Default parameters | `(range = 1.0)` |
| Warmup | none (first candle seeds the anchor) |
| Interpretation | Each bar = one fixed price increment travelled. |

## Formula

```
seed:     anchor = first close
up:       while close >= anchor + range  -> print up bar,   anchor += range
down:     while close <= anchor − range  -> print down bar, anchor −= range
```

A range bar completes every time price moves a fixed `range` from the anchor, in
either direction. The crucial contrast with [`RenkoBars`](/Indicators/Indicator-RenkoBars)
is the **absence of a reversal penalty**: Renko requires `2 × box_size` to turn,
filtering out small wiggles, whereas a range bar prints on a single `range` move
against the trend. Range bars thus follow every leg of price; Renko smooths them. A
single candle that gaps several ranges prints all completed bars at once, aligned to
the `range` grid relative to the seed. Source:
`crates/wickra-core/src/indicators/range_bars.rs`.

## Parameters

| Name    | Type  | Default | Valid range        | Source | Description |
|---------|-------|---------|--------------------|--------|-------------|
| `range` | `f64` | `1.0`   | finite, `> 0`      | `range_bars.rs:54` | Price increment per bar. Non-finite or non-positive errors with `Error::InvalidPeriod`. |

The `range` and `anchor` getters expose the configuration and current state.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/range_bars.rs`:

```rust
use wickra::{BarBuilder, Candle, RangeBar, RangeBars};
// RangeBars: Input = Candle, Output = Vec<RangeBar>
const _: fn(&mut RangeBars, Candle) -> Vec<RangeBar> = <RangeBars as BarBuilder>::update;
```

A `Candle` in, a `Vec<RangeBar>` out (empty until a full `range` is travelled). Bar
builders are **close-driven** in the bindings: Python `update(close) -> list[tuple]`
and `batch(closes) -> Matrix (k, 3)`; Node `update(close) -> RangeBar[]`. There is
no `warmupPeriod`/`isReady` — a `BarBuilder` emits whenever a bar completes.

## Edge cases

- **Seed.** The first candle sets the anchor and prints nothing
  (`first_candle_seeds_without_bar` pins this).
- **Up / down runs.** A multi-range move prints aligned bars
  (`up_move_prints_aligned_bars`, `down_move_prints_aligned_bars` pin this).
- **No reversal penalty.** A single-range move against the trend prints immediately,
  unlike Renko (`reversal_needs_only_one_range` pins this).
- **Small move.** A sub-range move prints nothing (`small_move_prints_nothing`).
- **Reset.** `reset()` clears the anchor; the next candle re-seeds
  (`reset_clears_state` pins this).
- **Batch.** `batch` concatenates completed bars; its length is data-dependent
  (`batch_concatenates_completed_bars` pins this).

## Examples

### Rust

```rust
use wickra::{BarBuilder, Candle, RangeBars};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let flat = |p: f64| Candle::new(p, p, p, p, 1.0, 0).unwrap();
    let mut bars = RangeBars::new(1.0)?;
    bars.update(flat(10.0));                 // seed
    let up = bars.update(flat(12.0));        // +2 ranges
    println!("{}", up.len());                // 2
    let down = bars.update(flat(11.0));      // -1 range (no penalty)
    println!("{}", down.len());              // 1
    Ok(())
}
```

Output:

```
2
1
```

### Python

```python
import wickra as ta

bars = ta.RangeBars(1.0)
bars.update(10.0)               # seed -> []
print(bars.update(12.0))        # [(10.0, 11.0, 1), (11.0, 12.0, 1)]
print(bars.update(11.0))        # [(12.0, 11.0, -1)]
```

### Node

```javascript
const ta = require('wickra');
const bars = new ta.RangeBars(1.0);
bars.update(10.0);                       // seed -> []
console.log(bars.update(12.0).length);   // 2
console.log(bars.update(11.0).length);   // 1
```

### Streaming

```rust
use wickra::{BarBuilder, Candle, RangeBars};

let mut bars = RangeBars::new(0.5).unwrap();
let feed: Vec<Candle> = Vec::new(); // your live stream
for candle in feed {
    for bar in bars.update(candle) {
        // each bar marks one 0.5 increment of price travel
    }
}
```

`batch` is equivalent to replaying `update` candle-by-candle and concatenating the
results (`batch_concatenates_completed_bars` pins this).

## Interpretation

1. **Volatility-normalised time.** Range bars print fast in volatile markets and
   slow in quiet ones, so each bar represents equal *price distance* rather than
   equal clock time.
2. **Versus Renko.** Choose range bars when you want every swing; choose
   [`RenkoBars`](/Indicators/Indicator-RenkoBars) when you want noise filtered out.
3. **Downstream indicators.** Feed the bar closes into a moving average or RSI to run
   a classic indicator on range-bar "time".

## Common pitfalls

- **Choosing `range`.** Too small and you drown in bars; too large and you miss
  structure. Scale it to the instrument's typical move.
- **Close-driven simplification.** This builder uses close prices, not intrabar
  high/low, so very large single candles still print grid-aligned bars rather than
  true tick-resolution ranges.
- **Not an `Indicator`.** Range bars have no warmup and emit a `Vec`; they cannot be
  used in a `Chain` — feed a downstream indicator from the bar closes manually.

## References

A common alternative-chart construction; see Steidlmayer / Dalton on volatility-based
bar sampling, and the broader range-bar literature.

## See also

- [Indicator-RenkoBars](/Indicators/Indicator-RenkoBars) — fixed bricks with a reversal penalty.
- [Indicator-KagiBars](/Indicators/Indicator-KagiBars) — reversal-amount line segments.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
