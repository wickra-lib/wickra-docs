# TdClop

> Tom DeMark's TD Clop — a two-bar open/close reversal: the bar opens beyond the
> whole prior body and closes back beyond it.

## Quick reference

| Field | Value |
|-------|-------|
| Family | DeMark |
| Input type | `Candle` (open / close) |
| Output type | `f64` (signed signal) |
| Output range | `{−1, 0, +1}` |
| Default parameters | None (parameter-free) |
| Warmup period | `2` |
| Interpretation | `+1` open-gap-down reversal up; `−1` open-gap-up reversal down. |

## Formula

```
Buy (+1):  open < open[-1] AND open < close[-1]  AND  close > open[-1] AND close > close[-1]
Sell (−1): open > open[-1] AND open > close[-1]  AND  close < open[-1] AND close < close[-1]
otherwise 0
```

"Clop" = CLose/OPen. A bar that opens below **both** the prior open and close,
then closes above both, has fully reversed an opening gap — a strong bullish turn.
The sell pattern mirrors it. Source:
`crates/wickra-core/src/indicators/td_clop.rs`.

## Parameters

| Name | Type | Default | Valid range | Source | Description |
|------|------|---------|-------------|--------|-------------|
| — | — | — | — | None. | TD Clop is parameter-free; `TdClop::new()` is infallible. |

## Signed ±1 encoding

`+1.0` bullish reversal, `−1.0` bearish reversal, `0.0` no pattern (warmup emits
`None`).

## Inputs / Outputs

From `crates/wickra-core/src/indicators/td_clop.rs`:

```rust
use wickra::{Candle, Indicator, TdClop};
// TdClop: Input = Candle, Output = f64
const _: fn(&mut TdClop, Candle) -> Option<f64> = <TdClop as Indicator>::update;
```

A `Candle` in, an `Option<f64>` out. Python `update(candle)` / `batch(open, high,
low, close)` → `array.array('d')`; Node `update(open, high, low, close)` / `batch(...)`.

## Warmup

`warmup_period() == 2`. The first candle seeds the prior bar
(`first_bar_seeds_without_signal` pins this).

## Edge cases

- **Bullish buy.** Open below the prior body, close above it → `+1`
  (`bullish_clop_buy` pins this).
- **Bearish sell.** The mirror → `−1` (`bearish_clop_sell` pins this).
- **No pattern → 0.** Otherwise `0.0` (`no_pattern_is_zero` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `td.reset()` clears the prior bar and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, TdClop};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut td = TdClop::new();
    td.update(Candle::new(10.0, 12.0, 9.0, 11.0, 0.0, 0)?);     // prev body [10,11]
    let sig = td.update(Candle::new(9.0, 13.0, 8.0, 12.0, 0.0, 0)?);
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

td = ta.TDClop()
o = np.array([10, 9]); h = np.array([12, 13]); l = np.array([9, 8]); c = np.array([11, 12])
print(td.batch(o, h, l, c))  # [nan, 1.0]
```

### Node

```javascript
const ta = require('wickra');
const td = new ta.TDClop();
td.update(10, 12, 9, 11);
console.log(td.update(9, 13, 8, 12)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, TdClop};

let mut td = TdClop::new();
let feed: Vec<Candle> = Vec::new(); // your live stream
for candle in feed {
    if let Some(s) = td.update(candle) { if s != 0.0 { /* reversal */ } }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Gap-and-reverse.** TD Clop catches opening drives that fail and reverse — a
   high-conviction one-bar turn.
2. **Body engulfment.** Because it uses open/close (not high/low), it keys on the
   body, akin to an [`Engulfing`](/Indicators/Indicator-Engulfing) with DeMark's
   strict both-sides rule.
3. **At levels.** Strongest at support/resistance or the end of a Setup count.

## Common pitfalls

- **Body-only.** Wicks are ignored; a long-wick bar can still qualify on its body.
- **Strictness.** All four inequalities must hold; near-misses do not signal.
- **Variant naming.** TD Clop is closely related to TD Clopwin (inside-body) — do
  not confuse the two.

## References

Perl, J. (2008), *DeMark Indicators*, Bloomberg Press.

## See also

- [Indicator-TdClopwin](/Indicators/Indicator-TdClopwin) — the inside-body counterpart.
- [Indicator-Engulfing](/Indicators/Indicator-Engulfing) — classic body engulfing.
- [Indicator-TdCamouflage](/Indicators/Indicator-TdCamouflage) — hidden-strength reversal.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
