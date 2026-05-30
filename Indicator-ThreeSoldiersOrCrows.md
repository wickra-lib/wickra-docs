# Three White Soldiers / Three Black Crows

> Three-bar continuation pattern. Three consecutive long-bodied
> bars in the same direction, each opening inside the previous body
> and closing beyond it. Three White Soldiers = three rising
> green bars; Three Black Crows = three falling red bars.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Candlestick Patterns                                                 |
| Input type          | `Candle`                                                             |
| Output type         | `f64` — `+1.0` Soldiers, `-1.0` Crows, `0.0` otherwise               |
| Output range        | `{-1.0, 0.0, +1.0}`                                                  |
| Default parameters  | none — `ThreeSoldiersOrCrows::new()`                                 |
| Warmup period       | `3`                                                                  |
| Interpretation      | Strong continuation signal in the direction of the pattern            |

## Formula

**Three White Soldiers** (`+1.0`):

```
all three candles green
AND closes monotonically rising
AND each open in [prev.open, prev.close]
AND each close > prev.close
```

**Three Black Crows** (`-1.0`): mirror — three red, monotonically
falling closes. See
`crates/wickra-core/src/indicators/three_soldiers_or_crows.rs`.

## Parameters

None.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python / Node: same as
other multi-bar patterns.

## Warmup

`warmup_period() == 3`.

## Edge cases

- **Monotonicity.** Strict — each close must exceed the prior
  close (no equal-close bars allowed).
- **Each open inside prior body.** Distinguishes Soldiers from
  three separate breakaway-gap candles.
- **Reset.** Clears the three-bar history.

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, ThreeSoldiersOrCrows};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let b1 = Candle::new(100.0, 102.0, 99.5, 101.5, 1.0, 0)?;
    let b2 = Candle::new(101.0, 103.0, 100.5, 102.8, 1.0, 1)?;
    let b3 = Candle::new(102.0, 104.0, 101.8, 103.8, 1.0, 2)?;
    let mut tsc = ThreeSoldiersOrCrows::new();
    tsc.update(b1); tsc.update(b2);
    println!("{:?}", tsc.update(b3));  // +1.0
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

o = np.array([100, 101, 102])
h = np.array([102, 103, 104])
l = np.array([99.5, 100.5, 101.8])
c = np.array([101.5, 102.8, 103.8])

tsc = ta.ThreeSoldiersOrCrows()
print(tsc.batch(o, h, l, c))
```

### Node

```javascript
const wickra = require('wickra');
const tsc = new wickra.ThreeSoldiersOrCrows();
console.log(tsc.batch([100, 101, 102], [102, 103, 104], [99.5, 100.5, 101.8], [101.5, 102.8, 103.8]));
```

### Streaming

```rust
use wickra::{Candle, Indicator, ThreeSoldiersOrCrows};

let mut tsc = ThreeSoldiersOrCrows::new();
for bar in candle_stream {
    if tsc.update(bar) == Some(1.0) { /* Three White Soldiers */ }
    if tsc.update(bar) == Some(-1.0) { /* Three Black Crows */ }
}
```

## Interpretation

- **Continuation, not reversal.** Unlike most candlestick
  patterns, Soldiers / Crows confirm an existing trend rather
  than predict reversal. Use as trend-confirmation filter.
- **Best at breakouts.** Three White Soldiers off a base
  consolidation is a high-conviction continuation signal.
- **Strong tail risk.** A late-stage Three White Soldiers
  (after extended uptrend) can mark short-term exhaustion — the
  classic "too far too fast" warning.

## Common pitfalls

- **Treating as reversal.** Soldiers / Crows are continuation
  patterns. Trading them as reversals inverts the edge.
- **Strict monotonicity.** Tiny pullbacks during the three bars
  invalidate. If a candle closes equal to or below the prior
  close, the pattern doesn't fire.
- **Without context.** Inside a tight range, three consecutive
  small-body green bars don't qualify as Soldiers — bodies need
  to be long.

## References

- Steve Nison, *Japanese Candlestick Charting Techniques* (1991).

## See also

- [Engulfing](Indicator-Engulfing) — two-bar reversal sibling.
- [MorningEveningStar](Indicator-MorningEveningStar) — three-bar
  reversal sibling.
- [Marubozu](Indicator-Marubozu) — single-bar strong-continuation
  pattern.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
