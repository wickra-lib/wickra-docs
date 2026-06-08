# HaramiCross

> A stronger Harami — a large real body followed by a Doji contained within it; the
> total indecision after a strong move makes the reversal more potent.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Candlestick Patterns |
| Input type | `Candle` (open / high / low / close) |
| Output type | `f64` (signed signal) |
| Output range | `{−1, 0, +1}` |
| Default parameters | None (doji threshold fixed at `0.1`) |
| Warmup period | `2` |
| Interpretation | `+1` bullish reversal; `−1` bearish reversal. |

## Formula

```
prior is a solid body (not a doji); current is a doji (|close−open| <= 0.1·range)
contained: current open AND close within [min(open,close)[-1], max(open,close)[-1]]
Bullish (+1): prior close < open (bearish body)  AND doji contained
Bearish (−1): prior close > open (bullish body)  AND doji contained
otherwise 0
```

The Harami Cross is a [`Harami`](/Indicators/Indicator-Harami) whose inside bar is
a Doji — the market goes from a decisive large body to complete indecision, a
stronger reversal cue than a small-body inside bar. Source:
`crates/wickra-core/src/indicators/harami_cross.rs`.

## Parameters

| Name | Type | Default | Valid range | Source | Description |
|------|------|---------|-------------|--------|-------------|
| — | — | — | — | None. | Harami Cross is parameter-free; the doji threshold is fixed at `0.1`. |

## Signed ±1 encoding

`+1.0` bullish, `−1.0` bearish, `0.0` no pattern (warmup emits `None`).

## Inputs / Outputs

From `crates/wickra-core/src/indicators/harami_cross.rs`:

```rust
use wickra::{Candle, Indicator, HaramiCross};
// HaramiCross: Input = Candle, Output = f64
const _: fn(&mut HaramiCross, Candle) -> Option<f64> = <HaramiCross as Indicator>::update;
```

A `Candle` in, an `Option<f64>` out. Python `update(candle)` / `batch(open, high,
low, close)`; Node `update(open, high, low, close)` / `batch(...)`.

## Warmup

`warmup_period() == 2`. The first candle seeds the prior bar
(`first_bar_seeds_without_signal` pins this).

## Edge cases

- **Bullish.** Big bearish body then contained doji → `+1`
  (`bullish_harami_cross` pins this).
- **Bearish.** Big bullish body then contained doji → `−1`
  (`bearish_harami_cross` pins this).
- **Doji outside body → 0.** (`doji_outside_body_is_zero` pins this).
- **Second not a doji → 0.** (`non_doji_second_is_zero` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `h.reset()` clears the prior bar and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, HaramiCross};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut h = HaramiCross::new();
    h.update(Candle::new(110.0, 110.2, 99.8, 100.0, 0.0, 0)?); // big bearish body
    let sig = h.update(Candle::new(105.0, 106.0, 104.0, 105.02, 0.0, 0)?); // contained doji
    println!("{:?}", sig); // Some(1.0)
    Ok(())
}
```

Output:

```
Some(1.0)
```

### Python

```python
import numpy as np
import wickra as ta

h = ta.HaramiCross()
o = np.array([110, 105]); hi = np.array([110.2, 106]); lo = np.array([99.8, 104]); c = np.array([100, 105.02])
print(h.batch(o, hi, lo, c))  # [nan, 1.0]
```

### Node

```javascript
const ta = require('wickra');
const h = new ta.HaramiCross();
h.update(110, 110.2, 99.8, 100);
console.log(h.update(105, 106, 104, 105.02)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, HaramiCross};

let mut h = HaramiCross::new();
let feed: Vec<Candle> = Vec::new(); // your live stream
for candle in feed {
    if let Some(s) = h.update(candle) { if s != 0.0 { /* reversal */ } }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Strong reversal cue.** The shift from conviction to indecision warns the prior
   move is exhausting.
2. **Confirm.** Wait for a confirming bar in the signalled direction.
3. **Location.** Strongest at a tested level or after an extended run.

## Common pitfalls

- **Containment, not engulfing.** The doji must sit *inside* the prior body —
  opposite of an engulfing.
- **Threshold sensitivity.** What counts as a doji depends on the fixed `0.1`
  body/range ratio.
- **Needs trend.** A Harami Cross in a range carries little meaning.

## References

Nison, S. (1991), *Japanese Candlestick Charting Techniques*.

## See also

- [Indicator-Harami](/Indicators/Indicator-Harami) — the small-body version.
- [Indicator-Doji](/Indicators/Indicator-Doji) — the indecision candle.
- [Indicator-Tristar](/Indicators/Indicator-Tristar) — three-doji reversal.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
