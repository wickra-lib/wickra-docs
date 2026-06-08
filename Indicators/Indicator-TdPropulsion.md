# TdPropulsion

> Tom DeMark's TD Propulsion — a two-bar continuation thrust: open on the trend
> side of the prior close, then close beyond the prior bar's extreme.

## Quick reference

| Field | Value |
|-------|-------|
| Family | DeMark |
| Input type | `Candle` (open / high / low / close) |
| Output type | `f64` (signed signal) |
| Output range | `{−1, 0, +1}` |
| Default parameters | None (parameter-free) |
| Warmup period | `2` |
| Interpretation | `+1` upside thrust; `−1` downside thrust. |

## Formula

```
Up   (+1): open >= close[-1]  AND  close > high[-1]
Down (−1): open <= close[-1]  AND  close < low[-1]
otherwise 0
```

A bar that opens at or above the prior close and then closes above the prior high
"propels" an advance forward — a continuation thrust. The down case mirrors it.
Source: `crates/wickra-core/src/indicators/td_propulsion.rs`.

## Parameters

| Name | Type | Default | Valid range | Source | Description |
|------|------|---------|-------------|--------|-------------|
| — | — | — | — | None. | TD Propulsion is parameter-free; `TdPropulsion::new()` is infallible. |

## Signed ±1 encoding

`+1.0` upside thrust, `−1.0` downside thrust, `0.0` no thrust (warmup emits
`None`).

## Inputs / Outputs

From `crates/wickra-core/src/indicators/td_propulsion.rs`:

```rust
use wickra::{Candle, Indicator, TdPropulsion};
// TdPropulsion: Input = Candle, Output = f64
const _: fn(&mut TdPropulsion, Candle) -> Option<f64> = <TdPropulsion as Indicator>::update;
```

A `Candle` in, an `Option<f64>` out. Python `update(candle)` / `batch(open, high,
low, close)`; Node `update(open, high, low, close)` / `batch(...)`.

## Warmup

`warmup_period() == 2`. The first candle seeds the prior bar
(`first_bar_seeds_without_signal` pins this).

## Edge cases

- **Up thrust.** Open ≥ prior close and close > prior high → `+1`
  (`propulsion_up` pins this).
- **Down thrust.** The mirror → `−1` (`propulsion_down` pins this).
- **No thrust → 0.** (`no_thrust_is_zero` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `td.reset()` clears the prior bar and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{Candle, Indicator, TdPropulsion};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut td = TdPropulsion::new();
    td.update(Candle::new(9.5, 11.0, 9.0, 10.0, 0.0, 0)?);
    let sig = td.update(Candle::new(10.5, 12.0, 10.0, 11.5, 0.0, 0)?);
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

td = ta.TdPropulsion()
o = np.array([9.5, 10.5]); h = np.array([11, 12]); l = np.array([9, 10]); c = np.array([10, 11.5])
print(td.batch(o, h, l, c))  # [nan, 1.0]
```

### Node

```javascript
const ta = require('wickra');
const td = new ta.TdPropulsion();
td.update(9.5, 11, 9, 10);
console.log(td.update(10.5, 12, 10, 11.5)); // 1
```

### Streaming

```rust
use wickra::{Candle, Indicator, TdPropulsion};

let mut td = TdPropulsion::new();
for candle in feed {
    if let Some(s) = td.update(candle) { let _ = s; }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Continuation confirmation.** Use it to add to or hold a trend position when a
   thrust confirms momentum.
2. **Breakout quality.** A propulsion bar through resistance is a stronger break
   than a drift through it.
3. **Combine with Setup.** DeMark traders use propulsion to validate moves inside a
   Setup/Countdown.

## Common pitfalls

- **Continuation, not reversal.** Propulsion confirms the existing direction; do not
  read it as a turn.
- **Open dependence.** The open vs. prior close gate matters — gappy instruments
  behave differently.
- **One bar.** Pair with structure for context.

## References

Perl, J. (2008), *DeMark Indicators*, Bloomberg Press.

## See also

- [Indicator-TdSetup](/Indicators/Indicator-TdSetup) — the DeMark setup count.
- [Indicator-TdTrap](/Indicators/Indicator-TdTrap) — inside-bar breakout.
- [Indicator-Marubozu](/Indicators/Indicator-Marubozu) — full-body thrust bar.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
