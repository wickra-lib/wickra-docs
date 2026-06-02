# Point & Figure Bars

> A box-size bar builder: Point-and-Figure X/O columns with an N-box reversal.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Alt-Chart Bars |
| Trait | `BarBuilder` (not `Indicator`) |
| Input type | `Candle` (uses close) |
| Output type | `Vec<PnfColumn>` (0 or 1 column per candle) |
| Parameters | `box_size` (finite & positive), `reversal` (in boxes, `>= 1`) |
| Warmup | first candle seeds the grid box (no column) |
| Interpretation | Filters time/noise into X (up) and O (down) columns. |

## Why `BarBuilder`, not `Indicator`

A Point-and-Figure chart is a sequence of vertical columns; a "bar" is a
completed column. Most candles extend the current column or do nothing, and a
reversal completes exactly one column — a variable, often-zero output per input
that does not fit the [`Indicator`](Indicators-Overview) one-in-one-out contract.
P&F therefore implements `BarBuilder`: `update` returns the column(s) completed
on each candle (0 or 1), and `batch` concatenates them. Bar builders are not
`Chain`-able.

## Formula

Each close is quantised to its grid box via `floor(close / box_size)`. An X
column extends up while price makes new box highs; an O column extends down while
price makes new box lows. A reversal needs price to move `reversal` boxes against
the column:

```
extend:  new box high (X) / new box low (O)            -> no column
reverse: price moves reversal * box_size the other way -> emit the completed column,
                                                          start a new column one box offset
```

The first candle seeds the grid box; the first one-box move sets the initial
direction. See `crates/wickra-core/src/indicators/point_and_figure_bars.rs`. The
floor-to-box mapping is used for both directions, so construction is fully
deterministic.

## Parameters

| Name       | Type    | Valid range | Description |
|------------|---------|-------------|-------------|
| `box_size` | `f64`   | finite, `> 0` | Price height of one box. Non-finite or non-positive errors with `Error::InvalidPeriod`. |
| `reversal` | `usize` | `>= 1` | Boxes of opposite movement needed to start a new column (classically 3). `0` errors with `Error::PeriodZero`. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/point_and_figure_bars.rs`:

```rust
use wickra::{BarBuilder, Candle, PnfColumn, PointAndFigureBars};
// PointAndFigureBars: Bar = PnfColumn
const _: fn(&mut PointAndFigureBars, Candle) -> Vec<PnfColumn> =
    <PointAndFigureBars as BarBuilder>::update;
```

`PnfColumn` carries `direction: i8` (`+1` X/up, `-1` O/down), `high: f64`,
`low: f64`. Close-driven bindings: Python `update(close)` returns a list of
`(direction, high, low)` tuples, `batch(close)` returns a `(k, 3)` array; Node
`update(close)` / `batch(close)` return `Array<{ direction, high, low }>`.

## Warmup

No fixed warmup period: the first candle seeds the grid box (empty result) and
the first one-box move sets the initial column direction without completing a
column. The unit tests `first_candle_seeds_without_column` and
`establishes_up_then_extends` pin this.

## Edge cases

- **Reversal closes a column.** A 3-box move against an X column closes it and
  opens an O column (and vice-versa). Pinned by `reversal_closes_x_column` and
  `reversal_closes_o_column`.
- **Sub-reversal move.** A pullback smaller than `reversal` boxes prints nothing.
  Pinned by `small_move_prints_nothing` and `down_column_small_bounce_prints_nothing`.
- **Reset.** `reset()` clears the column state and re-seeds on the next candle.
  Pinned by `reset_clears_state`.

## Examples

### Rust

```rust
use wickra::{BarBuilder, Candle, PointAndFigureBars};

fn flat(p: f64) -> Candle { Candle::new(p, p, p, p, 1.0, 0).unwrap() }

fn main() {
    let mut pnf = PointAndFigureBars::new(1.0, 3).unwrap();
    pnf.update(flat(10.0)); // seed
    pnf.update(flat(13.0)); // start X column
    pnf.update(flat(15.0)); // extend up
    let cols = pnf.update(flat(12.0)); // 3-box reversal -> close X column
    println!("{:?}", cols.iter().map(|c| (c.direction, c.high, c.low)).collect::<Vec<_>>());
}
```

Output:

```
[(1, 15.0, 10.0)]
```

The X column from 10 to 15 closes when price reverses three boxes to 12. This
matches the `reversal_closes_x_column` unit test.

### Python

```python
import wickra as ta

pnf = ta.PointAndFigureBars(1.0, 3)
for x in [10.0, 13.0, 15.0]:
    print(x, '->', pnf.update(x))
print(12.0, '->', pnf.update(12.0))
```

Output:

```
10.0 -> []
13.0 -> []
15.0 -> []
12.0 -> [(1, 15.0, 10.0)]
```

### Node

```javascript
const ta = require('wickra');
const pnf = new ta.PointAndFigureBars(1.0, 3);
[10, 13, 15].forEach((x) => pnf.update(x));
console.log(pnf.update(12).map((c) => [c.direction, c.high, c.low]));
```

Output:

```
[ [ 1, 15, 10 ] ]
```

## Interpretation

Point & Figure removes both time and sub-box noise: only meaningful price moves
add boxes, and only `reversal`-sized counter-moves start a new column. Classic
signals are the double-top breakout (an X column exceeding the prior X column's
high) and double-bottom breakdown, plus 45° trendlines drawn through the grid.
The default `reversal = 3` is the textbook choice; smaller reversals track price
more closely at the cost of more columns.

## Common pitfalls

- **`reversal` is in boxes, not price.** The opposite move must cover
  `reversal * box_size` in price to start a new column.
- **Box mapping.** Closes are floored to their containing box for both
  directions; non-aligned closes map to the lower box edge.
- **Trying to chain it.** Bar builders are not `Indicator`s; build downstream
  logic off the columns' highs/lows.

## References

Point-and-Figure charting is one of the oldest Western techniques (Charles Dow,
late 19th century); the box-and-reversal method is detailed in Thomas Dorsey's
*Point and Figure Charting* (1995).

## See also

- [Indicator-RenkoBars](Indicator-RenkoBars) — fixed box-size bricks.
- [Indicator-KagiBars](Indicator-KagiBars) — reversal-amount line segments.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
