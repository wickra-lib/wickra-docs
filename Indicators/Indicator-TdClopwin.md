# TdClopwin

> Tom DeMark's TD Clopwin — the inside-body cousin of TD Clop: the bar's open and
> close both sit inside the prior body, a compression bar whose direction hints at
> the next move.

## Quick reference

| Field | Value |
|-------|-------|
| Family | DeMark |
| Input type | `Candle` (open / close) |
| Output type | `f64` (signed signal) |
| Output range | `{−1, 0, +1}` |
| Default parameters | None (parameter-free) |
| Warmup period | `2` |
| Interpretation | `+1` bullish inside-body; `−1` bearish inside-body. |

## Formula

```
body_low  = min(open, close)[-1],  body_high = max(open, close)[-1]
inside    = body_low <= open <= body_high  AND  body_low <= close <= body_high
Buy  (+1): inside AND close >= open
Sell (−1): inside AND close <  open
otherwise 0
```

"Clopwin" = CLose/OPen WIthIN. Both the open and close are contained within the
prior bar's real body — a compression/inside bar. Its own direction (bullish or
bearish body) sets the signed signal. Source:
`crates/wickra-core/src/indicators/td_clopwin.rs`.

## Parameters

| Name | Type | Default | Valid range | Source | Description |
|------|------|---------|-------------|--------|-------------|
| — | — | — | — | None. | TD Clopwin is parameter-free; `TdClopwin::new()` is infallible. |

## Signed ±1 encoding

`+1.0` bullish inside-body, `−1.0` bearish inside-body, `0.0` not inside (warmup
emits `None`).

## Inputs / Outputs

From `crates/wickra-core/src/indicators/td_clopwin.rs`:

```rust
use wickra::{Candle, Indicator, TdClopwin};
// TdClopwin: Input = Candle, Output = f64
const _: fn(&mut TdClopwin, Candle) -> Option<f64> = <TdClopwin as Indicator>::update;
```

A `Candle` in, an `Option<f64>` out. Python `update(candle)` / `batch(open, high,
low, close)`; Node `update(open, high, low, close)` / `batch(...)`.

## Warmup

`warmup_period() == 2`. The first candle seeds the prior body
(`first_bar_seeds_without_signal` pins this).

## Edge cases

- **Bullish inside.** Both open/close inside the prior body, close ≥ open → `+1`
  (`bullish_inside_body_buy` pins this).
- **Bearish inside.** Inside body, close < open → `−1`
  (`bearish_inside_body_sell` pins this).
- **Outside body → 0.** Any leg outside → `0.0` (`outside_body_is_zero` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `td.reset()` clears the prior bar and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, TdClopwin};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut td = TdClopwin::new();
    td.update(Candle::new(10.0, 15.0, 9.0, 14.0, 0.0, 0)?);  // prev body [10,14]
    let sig = td.update(Candle::new(11.0, 14.0, 10.0, 13.0, 0.0, 0)?);
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

td = ta.TDClopwin()
o = np.array([10, 11]); h = np.array([15, 14]); l = np.array([9, 10]); c = np.array([14, 13])
print(td.batch(o, h, l, c))  # [nan, 1.0]
```

### Node

```javascript
const ta = require('wickra');
const td = new ta.TDClopwin();
td.update(10, 15, 9, 14);
console.log(td.update(11, 14, 10, 13)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, TdClopwin};

let mut td = TdClopwin::new();
let feed: Vec<Candle> = Vec::new(); // your live stream
for candle in feed {
    if let Some(s) = td.update(candle) { let _ = s; }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Compression then expansion.** An inside body marks indecision; the signed
   direction biases the resolution.
2. **Pair with a breakout.** Trade the break of the inside bar's range in the
   signalled direction.
3. **Setup context.** DeMark traders read Clopwin within a TD Setup/Countdown for
   timing.

## Common pitfalls

- **Body, not range.** Inside refers to the prior *body*, not its high/low.
- **Weak alone.** Inside bars are common; require a level or breakout filter.
- **Vs TD Clop.** Clop is open/close *beyond* the prior body (reversal); Clopwin is
  *within* it (compression) — opposite geometry.

## References

Perl, J. (2008), *DeMark Indicators*, Bloomberg Press.

## See also

- [Indicator-TdClop](/Indicators/Indicator-TdClop) — the beyond-the-body reversal.
- [Indicator-TdTrap](/Indicators/Indicator-TdTrap) — inside-bar breakout signal.
- [Indicator-Harami](/Indicators/Indicator-Harami) — classic inside-bar pattern.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
