# NewPriceLines

> The Japanese "eight/ten new price lines" exhaustion count — `count` consecutive
> higher (or lower) closes warns the run is stretched.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` (close) |
| Output type | `f64` (signed signal) |
| Output range | `{−1, 0, +1}` |
| Default parameters | `(count = 8)` (Python) |
| Warmup period | `2` |
| Interpretation | `−1` overbought (up-run exhausted); `+1` oversold. |

## Formula

```
consecutive higher closes form "new price lines" up
consecutive lower  closes form "new price lines" down
signal = −1 once `count` consecutive higher closes
signal = +1 once `count` consecutive lower  closes
signal =  0 otherwise (and the moment a close breaks the streak)
```

Traditional Japanese practice flags **eight** new price lines (and a stronger
**ten/twelve**) as exhaustion: the market has run one way so many bars in a row
that a corrective pause is due. The signal persists while the streak stays at or
above `count` and clears the instant a close breaks it. Source:
`crates/wickra-core/src/indicators/new_price_lines.rs`.

## Parameters

| Name    | Type    | Default      | Valid range | Source | Description |
|---------|---------|--------------|-------------|--------|-------------|
| `count` | `usize` | `8` (Python) | `>= 2`      | `new_price_lines.rs:55` | Consecutive new closes that trigger the exhaustion signal. `< 2` errors with `Error::InvalidPeriod`. |

`count()` returns the threshold; `streak()` the current `(up, down)` run length;
`value` returns the current signal if ready.

## Signed ±1 encoding

`+1.0` down-run exhaustion (buy warning), `−1.0` up-run exhaustion (sell warning),
`0.0` no signal (warmup emits `None`).

## Inputs / Outputs

From `crates/wickra-core/src/indicators/new_price_lines.rs`:

```rust
use wickra::{Candle, Indicator, NewPriceLines};
// NewPriceLines: Input = Candle, Output = f64
const _: fn(&mut NewPriceLines, Candle) -> Option<f64> = <NewPriceLines as Indicator>::update;
```

A `Candle` in, an `Option<f64>` out. Python `update(candle)` / `batch(close)`;
Node `update(close)` / `batch(close[])`.

## Warmup

`warmup_period() == 2`. One prior close is needed (`first_bar_seeds_without_signal`
pins this).

## Edge cases

- **Eight higher closes → −1.** (`eight_higher_closes_signal_sell` pins this).
- **Eight lower closes → +1.** (`eight_lower_closes_signal_buy` pins this).
- **Break clears.** A counter-close clears the signal and starts the opposite
  streak (`break_in_streak_clears_signal` pins this).
- **Unchanged close resets.** An equal close zeroes both streaks
  (`unchanged_close_resets_streak` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `n.reset()` clears the prior close, both streaks and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, NewPriceLines};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut n = NewPriceLines::new(8)?;
    let candles: Vec<Candle> = (0..12)
        .map(|i| { let cl = 100.0 + f64::from(i); Candle::new(cl, cl, cl, cl, 1_000.0, 0).unwrap() })
        .collect();
    println!("{:?}", n.batch(&candles).last().unwrap()); // Some(-1.0)
    Ok(())
}
```

Output:

```
Some(-1.0)
```

### Python

```python
import numpy as np
import wickra as ta

n = ta.NewPriceLines(8)
close = np.arange(12, dtype=float) + 100
print(n.batch(close + 1, close - 1, close)[-1])  # -1.0
```

### Node

```javascript
const ta = require('wickra');
const n = new ta.NewPriceLines(8);
const close = Array.from({ length: 12 }, (_, i) => 100 + i);
console.log(n.batch(close.map(c => c + 1), close.map(c => c - 1), close).at(-1)); // -1
```

### Streaming

```rust
use wickra::{Candle, Indicator, NewPriceLines};

let mut n = NewPriceLines::new(8).unwrap();
let feed: Vec<Candle> = Vec::new(); // your live stream
for candle in feed {
    match n.update(candle) {
        Some(-1.0) => println!("up-run exhausted"),
        Some(1.0)  => println!("down-run exhausted"),
        _ => {}
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Exhaustion warning.** Eight-plus straight closes one way flags a stretched
   move; tighten stops or fade with confirmation.
2. **Strength tiers.** Ten or twelve lines is a stronger warning than eight; run
   multiple instances for a ladder.
3. **Not a top/bottom caller.** It says "due for a pause", not "reverse now" — use
   with price structure.

## Common pitfalls

- **Trends overrun it.** Strong trends can print many more than eight lines; do not
  blindly counter-trade the first signal.
- **Close-only.** It counts closes, ignoring intrabar action.
- **Equal closes reset.** A flat close breaks the streak — expected on low-tick
  data.

## References

A classic Japanese candlestick concept ("shinne" / new price); see Nison, S.
(1994), *Beyond Candlesticks*.

## See also

- [Indicator-TdSetup](/Indicators/Indicator-TdSetup) — the DeMark consecutive-close count.
- [Indicator-Rsi](/Indicators/Indicator-Rsi) — overbought/oversold by momentum.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
