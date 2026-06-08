# AndrewsPitchfork

> Alan Andrews' median-line tool — a central line through three auto-detected
> swing pivots, flanked by two parallels, projected to the current bar.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Pivots & S/R |
| Input type | `Candle` (high / low) |
| Output type | `AndrewsPitchforkOutput { median, upper, lower }` |
| Output range | price units; `upper >= lower` |
| Default parameters | `(strength = 2)` (Python) |
| Warmup period | `2·strength + 1` (then swing-dependent) |
| Interpretation | Price oscillates around `median`; parallels are S/R. |

## Formula

```
detect alternating swing highs/lows with a `strength`-bar fractal
P0 = handle (oldest of the last three), P1, P2 = the next two
M  = midpoint of P1 and P2
median(t) = P0 + slope·(t − t0),   slope = (M − P0) / (M_t − t0)
upper / lower = median(t) offset by the vertical gap to the higher / lower anchor
```

The pitchfork draws a "fork" of three parallel lines: a median line from a handle
pivot through the midpoint of a later swing, plus parallels through that swing's
high and low. Price tends to revert to the median and find support/resistance at
the tines. Pivots are detected automatically with a symmetric `strength`-bar
fractal (confirmed `strength` bars late), keeping the three most recent alternating
swings. Source: `crates/wickra-core/src/indicators/andrews_pitchfork.rs`.

## Parameters

| Name       | Type    | Default      | Valid range | Source | Description |
|------------|---------|--------------|-------------|--------|-------------|
| `strength` | `usize` | `2` (Python) | `>= 1`      | `andrews_pitchfork.rs:78` | Fractal half-width: bars on each side of a pivot. `0` errors with `Error::PeriodZero`. |

`strength()` returns the half-width; `value` returns the current output if ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/andrews_pitchfork.rs`:

```rust
use wickra::{Candle, Indicator, AndrewsPitchfork, AndrewsPitchforkOutput};
// AndrewsPitchfork: Input = Candle, Output = AndrewsPitchforkOutput
const _: fn(&mut AndrewsPitchfork, Candle) -> Option<AndrewsPitchforkOutput> =
    <AndrewsPitchfork as Indicator>::update;
```

A `Candle` in, an `Option<AndrewsPitchforkOutput>` out. The Python binding returns
a `(median, upper, lower)` tuple from `update` and an `(n, 3)` array from
`batch(high, low)`; Node returns `{ median, upper, lower }` and a flat
`Float64Array` of length `n*3`; WASM mirrors the object with camelCase keys.

## Warmup

`warmup_period() == 2·strength + 1` — the minimum to confirm one pivot. Actual
readiness is **swing-dependent**: the first output appears once three alternating
pivots are confirmed (`eventually_emits_on_swings` pins that a swinging series
produces a pitchfork; `none_before_three_pivots` pins that too few bars yield
nothing).

## Edge cases

- **Insufficient swings → None.** Fewer than three alternating pivots yields no
  output (`none_before_three_pivots` pins this).
- **Ordering.** `upper >= lower` always (`upper_at_or_above_lower` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `p.reset()` clears the window, the pivots, the bar counter and the
  last value (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, AndrewsPitchfork};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut p = AndrewsPitchfork::new(2)?;
    let candles: Vec<Candle> = (0..120)
        .map(|i| { let b = 100.0 + (f64::from(i) * 0.5).sin() * 10.0;
                   Candle::new(b, b + 1.0, b - 1.0, b, 1_000.0, 0).unwrap() })
        .collect();
    if let Some(out) = p.batch(&candles).into_iter().flatten().last() {
        println!("median={:.2} upper={:.2} lower={:.2}", out.median, out.upper, out.lower);
    }
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

p = ta.AndrewsPitchfork(2)
base = 100 + np.sin(np.arange(120) * 0.5) * 10
median, upper, lower = p.batch(base + 1, base - 1).T
```

### Node

```javascript
const ta = require('wickra');

const p = new ta.AndrewsPitchfork(2);
console.log('warmupPeriod:', p.warmupPeriod()); // 5 (then swing-dependent)
```

### Streaming

```rust
use wickra::{Candle, Indicator, AndrewsPitchfork};

let mut p = AndrewsPitchfork::new(2).unwrap();
let feed: Vec<Candle> = Vec::new(); // your live stream
for candle in feed {
    if let Some(out) = p.update(candle) {
        // trade reversion to out.median, S/R at out.upper / out.lower
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Median reversion.** Price spends most of its time gravitating to the median
   line; fades back toward it are the classic pitchfork trade.
2. **Tine support/resistance.** The upper and lower parallels act as dynamic S/R;
   a decisive break through one signals the fork is failing.
3. **Re-anchoring.** As new swings confirm, the fork redraws — treat a fresh pivot
   set as a new structure.

## Common pitfalls

- **Confirmation lag.** Pivots are known `strength` bars late, so the fork updates
  with a delay.
- **Needs swings.** In a one-way trend with no pullbacks no alternating pivots form
  and the indicator stays silent.
- **Auto-pivots differ from hand-drawn.** A discretionary trader's chosen anchors
  may differ from the fractal-detected ones.

## References

Andrews, A. H. — the median-line ("pitchfork") method; see Patrick Mikula, *The
Best Trendline Methods of Alan Andrews* (1998).

## See also

- [Indicator-ZigZag](/Indicators/Indicator-ZigZag) — the swing pivots underlying the fork.
- [Indicator-LinRegChannel](/Indicators/Indicator-LinRegChannel) — regression channel.
- [Indicator-FibChannel](/Indicators/Indicator-FibChannel) — parallel Fibonacci channel.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
