# Kagi Bars

> A reversal-amount bar builder: the Kagi line's vertical segments, emitted each
> time the line turns.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Alt-Chart Bars |
| Trait | `BarBuilder` (not `Indicator`) |
| Input type | `Candle` (uses close) |
| Output type | `Vec<KagiBar>` (0 or 1 segment per candle) |
| Parameters | `reversal` (required, finite & positive) |
| Warmup | first candle seeds; first move sets the initial direction |
| Interpretation | Trend persistence; turns only on a reversal-sized move. |

## Why `BarBuilder`, not `Indicator`

A Kagi chart is one continuous line; a "bar" is the completed vertical segment
between two reversals. Most candles complete no segment (the line just extends),
and a turn completes exactly one — a variable, often-zero output per input that
does not fit the [`Indicator`](Indicators-Overview) one-in-one-out contract.
Kagi therefore implements `BarBuilder`: `update` returns the segment(s) completed
on each candle (here 0 or 1), and `batch` concatenates them. Bar builders are
not `Chain`-able.

## Formula

The line extends in its current direction while price makes new extremes, and
turns when price retraces by at least `reversal` from the latest extreme:

```
extend:  new extreme in the current direction        -> no segment
reverse: retrace >= reversal from the extreme         -> emit the completed segment,
                                                          start a new one the other way
```

The first candle seeds the start price; the first subsequent move (of any size)
sets the initial direction. Each turn emits a `KagiBar` running from the previous
reversal point to the extreme just reached. See
`crates/wickra-core/src/indicators/kagi_bars.rs`.

## Parameters

| Name       | Type  | Valid range | Description |
|------------|-------|-------------|-------------|
| `reversal` | `f64` | finite, `> 0` | Minimum retrace from the extreme that turns the line. Non-finite or non-positive errors with `Error::InvalidPeriod`. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/kagi_bars.rs`:

```rust
use wickra::{BarBuilder, Candle, KagiBar, KagiBars};
// KagiBars: Bar = KagiBar
const _: fn(&mut KagiBars, Candle) -> Vec<KagiBar> = <KagiBars as BarBuilder>::update;
```

`KagiBar` carries `start: f64`, `end: f64`, `direction: i8` (`+1` rising, `-1`
falling). Close-driven bindings: Python `update(close)` returns a list of
`(start, end, direction)` tuples, `batch(close)` returns a `(k, 3)` array; Node
`update(close)` / `batch(close)` return `Array<{ start, end, direction }>`.

## Warmup

No fixed warmup period: the first candle seeds the start price (empty result),
and the first move establishes the initial direction without yet completing a
segment. The unit tests `seeds_then_establishes_up_direction` and
`establishes_down_direction_from_seed` pin this.

## Edge cases

- **Extension.** New extremes in the current direction extend the segment without
  emitting. Pinned by `extends_without_emitting`.
- **Reversal.** A retrace `>= reversal` closes the current segment and starts the
  opposite one. Pinned by `reversal_closes_up_segment` and
  `reversal_closes_down_segment`.
- **Sub-reversal pullback.** A retrace smaller than `reversal` emits nothing and
  leaves the extreme unchanged. Pinned by `small_pullback_does_not_reverse` and
  `down_trend_small_bounce_does_not_reverse`.
- **Reset.** `reset()` clears direction, extreme and segment start. Pinned by
  `reset_clears_state`.

## Examples

### Rust

```rust
use wickra::{BarBuilder, Candle, KagiBars};

fn flat(p: f64) -> Candle { Candle::new(p, p, p, p, 1.0, 0).unwrap() }

fn main() {
    let mut kagi = KagiBars::new(2.0).unwrap();
    kagi.update(flat(10.0)); // seed
    kagi.update(flat(11.0)); // establishes up
    kagi.update(flat(15.0)); // extends to 15
    let bars = kagi.update(flat(12.0)); // retrace 3 >= 2 -> turn
    println!("{:?}", bars.iter().map(|b| (b.start, b.end, b.direction)).collect::<Vec<_>>());
}
```

Output:

```
[(10.0, 15.0, 1)]
```

The up segment from the seed (10) to the extreme (15) closes when price retraces
to 12. This matches the `reversal_closes_up_segment` unit test.

### Python

```python
import wickra as ta

kagi = ta.KagiBars(2.0)
for x in [10.0, 11.0, 15.0]:
    print(x, '->', kagi.update(x))
print(12.0, '->', kagi.update(12.0))
```

Output:

```
10.0 -> []
11.0 -> []
15.0 -> []
12.0 -> [(10.0, 15.0, 1)]
```

### Node

```javascript
const ta = require('wickra');
const kagi = new ta.KagiBars(2.0);
[10, 11, 15].forEach((x) => kagi.update(x));
console.log(kagi.update(12).map((b) => [b.start, b.end, b.direction]));
```

Output:

```
[ [ 10, 15, 1 ] ]
```

## Interpretation

Kagi turns only on a reversal-sized move, so each completed segment is a confirmed
leg of the trend; long alternating segments map the swing structure without the
time axis. Traders watch the line's thickness flip (yang/yin) as price crosses
prior shoulders/waists — this builder exposes the segment geometry
(`start`/`end`/`direction`) from which that thickness logic is derived. A run of
ever-higher segment highs and lows signals a persistent uptrend; a `reversal`
chosen too small produces noisy, frequent turns.

## Common pitfalls

- **`reversal` units.** It is an absolute price amount, not a percentage or a box
  count — scale it to the instrument.
- **Waiting for the in-progress leg.** A segment is only emitted *after* it turns;
  the current, still-extending leg is not reported until a reversal closes it.
- **Trying to chain it.** Bar builders are not `Indicator`s; build downstream
  logic off the segment prices.

## References

Kagi charts originate in 1870s Japan; the fixed reversal-amount construction is
described in Steve Nison's *Beyond Candlesticks* (1994).

## See also

- [Indicator-RenkoBars](Indicator-RenkoBars) — fixed box-size bricks.
- [Indicator-PointAndFigureBars](Indicator-PointAndFigureBars) — box-size X/O columns.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
