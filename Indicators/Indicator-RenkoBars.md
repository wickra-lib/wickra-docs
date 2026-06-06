# Renko Bars

> A fixed box-size bar builder: price-driven bricks with the classic two-box
> reversal rule.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Alt-Chart Bars |
| Trait | `BarBuilder` (not `Indicator`) |
| Input type | `Candle` (uses close) |
| Output type | `Vec<RenkoBrick>` (0..n bricks per candle) |
| Parameters | `box_size` (required, finite & positive) |
| Warmup | first candle seeds the reference level (no brick) |
| Interpretation | Filters time/noise; each brick is a fixed price move. |

## Why `BarBuilder`, not `Indicator`

A single candle can complete zero, one, or **many** bricks (a large move prints
several at once), which breaks the [`Indicator`](/Indicators-Overview) contract of
one output per input. Renko therefore implements the `BarBuilder` trait:
`update` returns a `Vec` of the bricks completed on each candle, and `batch`
concatenates them (its length is data-dependent, not the input length). Bar
builders are **not** `Chain`-able; to feed a downstream indicator, take the
bricks' close prices manually.

## Formula

Given a `box_size`, working from the seeded reference level on close prices:

```
continuation: price moves >= box_size in the trend direction  -> +1 brick
reversal:     price moves >= 2 * box_size against the trend    -> first opposite brick,
                                                                   then +1 per further box_size
```

The first candle seeds the reference and prints nothing. Thereafter each
additional `box_size` of close movement prints one brick; a reversal needs
`2 * box_size` (one box to unwind the last brick's body, one to print the first
opposite brick). Bricks are aligned to the `box_size` grid relative to the seed.
See `crates/wickra-core/src/indicators/renko_bars.rs`.

## Parameters

| Name       | Type  | Valid range | Description |
|------------|-------|-------------|-------------|
| `box_size` | `f64` | finite, `> 0` | Price height of one brick. Non-finite or non-positive errors with `Error::InvalidPeriod`. |

Pick `box_size` sensibly relative to the instrument's price: a tiny box against a
large gap can complete a very large number of bricks in a single `update`.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/renko_bars.rs`:

```rust
use wickra::{BarBuilder, Candle, RenkoBars, RenkoBrick};
// RenkoBars: Bar = RenkoBrick
const _: fn(&mut RenkoBars, Candle) -> Vec<RenkoBrick> = <RenkoBars as BarBuilder>::update;
```

`RenkoBrick` carries `open: f64`, `close: f64`, `direction: i8` (`+1` up, `-1`
down). Bar builders are close-driven, so the bindings take a close price:
Python `update(close)` returns a list of `(open, close, direction)` tuples and
`batch(close)` returns a `(k, 3)` array; Node `update(close)` / `batch(close)`
return `Array<{ open, close, direction }>`.

## Warmup

There is no fixed warmup period. The first candle seeds the reference level and
returns an empty vector; bricks begin once price moves a full box from the seed.
The unit test `first_candle_seeds_without_brick` pins this.

## Edge cases

- **Gapping move.** A close several boxes away prints every completed brick at
  once, grid-aligned. Pinned by `up_trend_prints_aligned_bricks` and
  `down_trend_prints_aligned_bricks`.
- **Two-box reversal.** After an up leg, a drop of three boxes prints two down
  bricks (the first box is the reversal threshold). Pinned by
  `reversal_down_needs_two_boxes` and `reversal_up_needs_two_boxes`.
- **Sub-reversal move.** A move smaller than the reversal threshold prints
  nothing. Pinned by `small_move_prints_nothing`.
- **Reset.** `reset()` clears the level and direction; the next candle re-seeds.
  Pinned by `reset_clears_state`.

## Examples

### Rust

```rust
use wickra::{BarBuilder, Candle, RenkoBars};

fn flat(p: f64) -> Candle { Candle::new(p, p, p, p, 1.0, 0).unwrap() }

fn main() {
    let mut renko = RenkoBars::new(1.0).unwrap();
    println!("{:?}", renko.update(flat(10.0))); // seed
    let up = renko.update(flat(13.0));
    println!("{} up bricks", up.len());
    let down = renko.update(flat(10.0));
    println!("{} down bricks", down.len());
}
```

Output:

```
[]
3 up bricks
2 down bricks
```

The +3 move prints `(10→11, 11→12, 12→13)`; the drop back to 10 reverses, printing
`(12→11, 11→10)`. This matches the `up_trend_prints_aligned_bricks` and
`reversal_down_needs_two_boxes` unit tests.

### Python

```python
import wickra as ta

renko = ta.RenkoBars(1.0)
print(renko.update(10.0))   # [] (seed)
print(renko.update(13.0))   # three up bricks
print(renko.update(10.0))   # two down bricks
```

Output:

```
[]
[(10.0, 11.0, 1), (11.0, 12.0, 1), (12.0, 13.0, 1)]
[(12.0, 11.0, -1), (11.0, 10.0, -1)]
```

### Node

```javascript
const ta = require('wickra');
const renko = new ta.RenkoBars(1.0);
console.log(renko.update(10)); // []
console.log(renko.update(13).map((b) => [b.open, b.close, b.direction]));
```

Output:

```
[]
[ [ 10, 11, 1 ], [ 11, 12, 1 ], [ 12, 13, 1 ] ]
```

### Batch (Python)

```python
import numpy as np, wickra as ta

bricks = ta.RenkoBars(1.0).batch(np.array([10.0, 11.0, 12.0, 13.0]))
# (k, 3) array of [open, close, direction]; k is data-dependent, here 3.
assert bricks.shape == (3, 3)
```

## Interpretation

Renko strips time and small noise from the chart: each brick is a fixed price
move, so trends render as long unbroken runs of one colour and choppy ranges
collapse to a few alternating bricks. Brick colour changes (especially after a
multi-brick run) are the classic trade trigger; support/resistance and trendlines
drawn on the brick series are cleaner than on candles. The trade-off is lag —
the two-box reversal means turns are confirmed late.

## Common pitfalls

- **Box too small for the price.** A `box_size` tiny relative to price prints a
  flood of bricks on every gap; scale it to the instrument (e.g. an ATR fraction).
- **Expecting one brick per candle.** `update` returns a `Vec` — often empty,
  sometimes several. Always iterate the result.
- **Trying to chain it.** Bar builders are not `Indicator`s and cannot go into a
  `Chain`; build downstream logic off the bricks' closes.

## References

Renko charts originate in Japan (the name derives from *renga*, "brick"); the
fixed box-size construction with a reversal rule is described in Steve Nison's
*Beyond Candlesticks* (1994).

## See also

- [Indicator-KagiBars](/Indicators/Indicator-KagiBars) — reversal-amount line segments.
- [Indicator-PointAndFigureBars](/Indicators/Indicator-PointAndFigureBars) — box-size X/O columns.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
