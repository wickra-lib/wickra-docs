# TdTrap

> Tom DeMark's TD Trap — an inside ("trap") bar followed by a close beyond its
> range fires a directional breakout signal.

## Quick reference

| Field | Value |
|-------|-------|
| Family | DeMark |
| Input type | `Candle` (high / low / close) |
| Output type | `f64` (signed signal) |
| Output range | `{−1, 0, +1}` |
| Default parameters | None (parameter-free) |
| Warmup period | `3` |
| Interpretation | `+1` upside trap break; `−1` downside trap break. |

## Formula

```
inside bar: high[-1] < high[-2]  AND  low[-1] > low[-2]
Buy  (+1):  inside  AND  close > high[-1]
Sell (−1):  inside  AND  close < low[-1]
otherwise 0
```

An inside bar coils the market inside the prior bar's range — the "trap". The next
bar that closes beyond the trap bar's high (or low) springs the breakout. Source:
`crates/wickra-core/src/indicators/td_trap.rs`.

## Parameters

| Name | Type | Default | Valid range | Source | Description |
|------|------|---------|-------------|--------|-------------|
| — | — | — | — | None. | TD Trap is parameter-free; `TdTrap::new()` is infallible. |

## Signed ±1 encoding

`+1.0` upside break of the trap bar, `−1.0` downside break, `0.0` no signal
(warmup emits `None`).

## Inputs / Outputs

From `crates/wickra-core/src/indicators/td_trap.rs`:

```rust
use wickra::{Candle, Indicator, TdTrap};
// TdTrap: Input = Candle, Output = f64
const _: fn(&mut TdTrap, Candle) -> Option<f64> = <TdTrap as Indicator>::update;
```

A `Candle` in, an `Option<f64>` out. Python `update(candle)` / `batch(high, low,
close)`; Node `update(high, low, close)` / `batch(...)`.

## Warmup

`warmup_period() == 3`. Two bars set the inside-bar relationship; the breakout is
read on the third (`first_two_bars_seed_without_signal` pins this).

## Edge cases

- **Inside then break up.** Fires `+1` (`inside_then_breakout_up_buys` pins this).
- **Inside then break down.** Fires `−1` (`inside_then_breakdown_sells` pins this).
- **No inside bar → 0.** (`no_inside_bar_is_zero` pins this).
- **Inside but no break → 0.** (`inside_but_no_breakout_is_zero` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `td.reset()` clears the two prior bars and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, TdTrap};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut td = TdTrap::new();
    td.update(Candle::new(100.0, 110.0, 90.0, 100.0, 0.0, 0)?);  // wide bar
    td.update(Candle::new(102.0, 108.0, 95.0, 102.0, 0.0, 0)?);  // inside (trap) bar
    let sig = td.update(Candle::new(106.0, 112.0, 100.0, 109.0, 0.0, 0)?);
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

td = ta.TDTrap()
o = np.array([95, 100, 103]); h = np.array([110, 108, 112])
l = np.array([90, 95, 100]); c = np.array([100, 102, 109])
print(td.batch(o, h, l, c))  # [nan, nan, 1.0]
```

### Node

```javascript
const ta = require('wickra');
const td = new ta.TDTrap();
td.update(95, 110, 90, 100); td.update(100, 108, 95, 102);
console.log(td.update(103, 112, 100, 109)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, TdTrap};

let mut td = TdTrap::new();
let feed: Vec<Candle> = Vec::new(); // your live stream
for candle in feed {
    match td.update(candle) {
        Some(1.0)  => println!("trap break up"),
        Some(-1.0) => println!("trap break down"),
        _ => {}
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Breakout entry.** Trade the close beyond the trap bar; the opposite extreme is
   a natural stop.
2. **Compression release.** Inside bars precede volatility expansion; TD Trap times
   the release.
3. **Filter.** Combine with trend or a Setup count to take only aligned breaks.

## Common pitfalls

- **False breaks.** Low-volume trap breaks fail often; confirm with volume or a
  retest.
- **Inside = body? No.** Here "inside" uses the high/low range, not the body.
- **Lag.** The signal needs the trap bar to complete first.

## References

Perl, J. (2008), *DeMark Indicators*, Bloomberg Press.

## See also

- [Indicator-TdClopwin](/Indicators/Indicator-TdClopwin) — inside-body compression.
- [Indicator-PivotReversal](/Indicators/Indicator-PivotReversal) — swing-pivot breakout.
- [Indicator-Donchian](/Indicators/Indicator-Donchian) — channel breakout.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
