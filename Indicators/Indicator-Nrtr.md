# Nrtr

> Nick Rypock Trailing Reverse — a scale-free **percentage** trailing-reverse
> stop that follows the trend extreme and flips when price retraces by a fixed
> percentage.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trailing Stops |
| Input type | `Candle` (close) |
| Output type | `NrtrOutput { value, direction }` |
| Output range | `value` in price units; `direction` ∈ {−1, +1} |
| Default parameters | `(pct = 2.0)` (Python) |
| Warmup period | `1` |
| Interpretation | `direction > 0` up (line below price); flip = reverse. |

## Formula

```
uptrend:   high_water = max(high_water, close)
           line       = high_water · (1 − pct/100)
           flip down when close < line  (reseed low_water = close)
downtrend: low_water  = min(low_water, close)
           line       = low_water · (1 + pct/100)
           flip up   when close > line  (reseed high_water = close)
```

NRTR uses a pure **percentage** retracement rather than a volatility band. In an
up-leg the line trails the highest close at a fixed `pct` below it; a close that
gives back that percentage reverses the trend and the line jumps to track the new
low-water mark. Because the rule is multiplicative it is scale-free — the same
`pct` behaves identically at any price level. Source:
`crates/wickra-core/src/indicators/nrtr.rs`.

## Parameters

| Name  | Type  | Default        | Valid range | Source | Description |
|-------|-------|----------------|-------------|--------|-------------|
| `pct` | `f64` | `2.0` (Python) | `(0, 100)`  | `nrtr.rs:54` | Trailing/reversal percentage. Outside `(0, 100)` or non-finite errors with `Error::InvalidParameter`. |

The `pct` getter returns the percentage; `value` returns the current output if
ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/nrtr.rs`:

```rust
use wickra::{Candle, Indicator, Nrtr, NrtrOutput};
// Nrtr: Input = Candle, Output = NrtrOutput
const _: fn(&mut Nrtr, Candle) -> Option<NrtrOutput> = <Nrtr as Indicator>::update;
```

A `Candle` in, an `Option<NrtrOutput>` out. The Python binding returns a `(value,
direction)` tuple from `update` and an `(n, 2)` array from `batch(close)`; Node
returns `{ value, direction }` and a flat `Float64Array` of length `n*2`; WASM
mirrors the object with camelCase keys. With `warmup_period == 1` there is no NaN
prefix.

## Warmup

`warmup_period() == 1`. The first bar seeds the up-trend and emits a line
immediately (`first_bar_emits_up_line` pins this).

## Edge cases

- **First bar.** Seeds the trend up with the line `pct` below the close
  (`first_bar_emits_up_line` pins this).
- **Uptrend → line below price.** A rising close keeps the line below price
  (`uptrend_keeps_line_below_price` pins this).
- **Retracement → reverse.** A close that retraces more than `pct` flips the
  direction (`reverses_on_retracement` pins this).
- **Downtrend → line above price.** A falling close keeps the line above price
  (`downtrend_keeps_line_above_price` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `n.reset()` clears the trend state, the water mark and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, Nrtr};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut n = Nrtr::new(10.0)?;
    let c = Candle::new(100.0, 100.0, 100.0, 100.0, 1_000.0, 0)?;
    let o = n.update(c).unwrap();
    println!("direction = {}, line = {}", o.direction, o.value); // 1, 90
    Ok(())
}
```

Output:

```
direction = 1, line = 90
```

### Python

```python
import numpy as np
import wickra as ta

n = ta.Nrtr(2.0)
close = np.arange(40, dtype=float) + 100.0
value, direction = np.asarray(n.batch(close + 1, close - 1, close).tolist()).T
print(value[-1], direction[-1])
```

### Node

```javascript
const ta = require('wickra');

const n = new ta.Nrtr(2.0);
console.log('warmupPeriod:', n.warmupPeriod()); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, Nrtr};

let mut n = Nrtr::new(2.0).unwrap();
let mut last = None;
for i in 0..40 {
    let close = 100.0 + f64::from(i);
    let c = Candle::new(close, close + 0.5, close - 0.5, close, 1_000.0, 0).unwrap();
    last = n.update(c);
}
println!("{last:?}");
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Trend filter.** `direction` is a clean binary trend state; many systems use
   it as the regime switch and trade only in its direction.
2. **Stop and reverse.** Because it tracks both sides, NRTR doubles as a
   stop-and-reverse system: exit and flip on each direction change.
3. **One-knob tuning.** Raising `pct` tolerates deeper pullbacks (fewer flips);
   lowering it reacts faster (more whipsaw).

## Common pitfalls

- **Percentage, not volatility.** A fixed `pct` ignores how volatile the
  instrument is; a 2% leash is loose on a calm stock and tight on a crypto pair.
- **Close-based.** Intrabar spikes do not trigger a flip — only closes do.
- **Not a fixed stop-loss.** NRTR reverses; if you only want an exit, ignore the
  opposite-direction line.

## References

Rypock, N., *Nick Rypock Trailing Reverse (NRTR)* — a percentage trailing-reverse
method widely published on trading forums and platforms.

## See also

- [Indicator-PercentageTrailingStop](/Indicators/Indicator-PercentageTrailingStop) — fixed-percent exit (no reverse).
- [Indicator-SuperTrend](/Indicators/Indicator-SuperTrend) — ATR-banded flipping stop.
- [Indicator-Psar](/Indicators/Indicator-Psar) — parabolic stop and reverse.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
