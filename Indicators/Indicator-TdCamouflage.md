# TdCamouflage

> Tom DeMark's TD Camouflage — a one-bar reversal that looks weak (or strong) on
> the close but reveals hidden accumulation (or distribution) intrabar.

## Quick reference

| Field | Value |
|-------|-------|
| Family | DeMark |
| Input type | `Candle` (open / high / low / close) |
| Output type | `f64` (signed signal) |
| Output range | `{−1, 0, +1}` |
| Default parameters | None (parameter-free) |
| Warmup period | `2` |
| Interpretation | `+1` hidden-strength buy; `−1` hidden-weakness sell. |

## Formula

```
Buy (+1):  close < close[-1]  AND  close > open   AND  low  < low[-1]
Sell (−1): close > close[-1]  AND  close < open   AND  high > high[-1]
otherwise 0
```

A lower close looks bearish, but if the same bar closed *up* from its open after
dipping to a *new low*, buyers quietly absorbed the dip — accumulation
"camouflaged" by the weak headline close. The sell pattern is the mirror. Source:
`crates/wickra-core/src/indicators/td_camouflage.rs`.

## Parameters

| Name | Type | Default | Valid range | Source | Description |
|------|------|---------|-------------|--------|-------------|
| — | — | — | — | None. | TD Camouflage is parameter-free; `TdCamouflage::new()` is infallible. |

## Signed ±1 encoding

`+1.0` = bullish (hidden strength) signal, `−1.0` = bearish (hidden weakness),
`0.0` = no pattern (including during warmup the output is `None`, then `0.0`).

## Inputs / Outputs

From `crates/wickra-core/src/indicators/td_camouflage.rs`:

```rust
use wickra::{Candle, Indicator, TdCamouflage};
// TdCamouflage: Input = Candle, Output = f64
const _: fn(&mut TdCamouflage, Candle) -> Option<f64> = <TdCamouflage as Indicator>::update;
```

A `Candle` in, an `Option<f64>` out. Python `update(candle)` / `batch(open, high,
low, close)` → `array.array('d')` (NaN warmup); Node `update(open, high, low, close)` /
`batch(o[], h[], l[], c[])`.

## Warmup

`warmup_period() == 2`. The first candle seeds the prior bar; the first signal
lands on the second (`first_bar_seeds_without_signal` pins this).

## Edge cases

- **Bullish buy.** A lower close that closed up off a new low fires `+1`
  (`bullish_camouflage_buy` pins this).
- **Bearish sell.** The mirror fires `−1` (`bearish_camouflage_sell` pins this).
- **No pattern → 0.** Otherwise `0.0` (`no_pattern_is_zero` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `td.reset()` clears the prior bar and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, TdCamouflage};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut td = TdCamouflage::new();
    td.update(Candle::new(10.0, 11.0, 8.0, 10.0, 0.0, 0)?); // seed
    let sig = td.update(Candle::new(9.0, 10.0, 7.0, 9.5, 0.0, 0)?);
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

td = ta.TDCamouflage()
o = np.array([10, 9]); h = np.array([11, 10]); l = np.array([8, 7]); c = np.array([10, 9.5])
print(td.batch(o, h, l, c))  # [nan, 1.0]
```

### Node

```javascript
const ta = require('wickra');
const td = new ta.TDCamouflage();
td.update(10, 11, 8, 10);
console.log(td.update(9, 10, 7, 9.5)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, TdCamouflage};

let mut td = TdCamouflage::new();
let feed: Vec<Candle> = Vec::new(); // your live stream
for candle in feed {
    match td.update(candle) {
        Some(1.0)  => println!("camouflage buy"),
        Some(-1.0) => println!("camouflage sell"),
        _ => {}
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Hidden reversal.** Use it to catch reversals that close-only screens miss —
   the bar's internals contradict its headline close.
2. **Context.** Strongest near support (buy) or resistance (sell), or at the end of
   a TD Setup count.
3. **Confirmation.** Pair with a level (pivot, prior low) so the camouflage fires
   where a reversal is plausible.

## Common pitfalls

- **One-bar, noisy.** Single-bar patterns fire often; filter by trend/level.
- **Definition variants.** Some sources add a close-two-bars-ago term; this uses the
  open/low (high) internals form.
- **Not a standalone system.** It flags a candidate, not a guaranteed turn.

## References

Perl, J. (2008), *DeMark Indicators*, Bloomberg Press; DeMark, T. R. (1994), *The
New Science of Technical Analysis*.

## See also

- [Indicator-TdDifferential](/Indicators/Indicator-TdDifferential) — pressure-shift reversal.
- [Indicator-TdClop](/Indicators/Indicator-TdClop) — open/close reversal pattern.
- [Indicator-TdSequential](/Indicators/Indicator-TdSequential) — the exhaustion count.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
