# NakedPoc

> The nearest untested ("virgin") point of control — a heavily-traded prior-session
> price the market has not yet revisited, an outstanding magnet.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Market Profile |
| Input type | `Candle` (high / low / close / volume) |
| Output type | `f64` (price level) |
| Output range | price units |
| Default parameters | `(session_len = 20, bins = 24)` (Python) |
| Warmup period | `session_len` (then session-paced) |
| Interpretation | The closest unfilled POC — a likely target / S/R. |

## Formula

```
every `session_len` candles forms a session; its POC (heaviest-volume price) is
  recorded as "naked"
a naked POC becomes "tested" once a later candle's high-low range covers it
output = nearest still-naked POC to the close (or the close if all are revisited)
```

A point of control is a magnet — price tends to return to fair value. A *naked* POC
is one not yet revisited, so it carries an outstanding pull and is a
high-probability target and support/resistance. This tracker records each session's
POC, marks them tested as price trades through them, and reports the closest
outstanding one. Source: `crates/wickra-core/src/indicators/naked_poc.rs`.

## Parameters

| Name          | Type    | Default       | Valid range | Source | Description |
|---------------|---------|---------------|-------------|--------|-------------|
| `session_len` | `usize` | `20` (Python) | `>= 1`      | `naked_poc.rs:60` | Candles per session. |
| `bins`        | `usize` | `24` (Python) | `>= 1`      | `naked_poc.rs:60` | Profile buckets for the session POC. `0` for either errors with `Error::PeriodZero`. |

`params()` returns `(session_len, bins)`; `naked_count()` the number of outstanding
POCs; `value` returns the current nearest naked POC if ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/naked_poc.rs`:

```rust
use wickra::{Candle, Indicator, NakedPoc};
// NakedPoc: Input = Candle, Output = f64
const _: fn(&mut NakedPoc, Candle) -> Option<f64> = <NakedPoc as Indicator>::update;
```

A `Candle` in, an `Option<f64>` out (a price). Python `update(candle)` / `batch(high,
low, close, volume)`; Node `update(high, low, close, volume)` / `batch(...)`.

## Warmup

`warmup_period() == session_len`. The first POC is recorded at the first session
boundary (`first_emission_at_session_end` pins this).

## Edge cases

- **Records the POC.** A session clustered around a price records that POC
  (`records_session_poc` pins this).
- **Revisit marks tested.** A candle covering a naked POC removes it
  (`revisit_marks_poc_tested` pins this).
- **No naked → close.** With every POC revisited, the output is the close
  (`empty_naked_reports_close` pins this).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `n.reset()` clears the session, the naked list and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, NakedPoc};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut n = NakedPoc::new(4, 16)?;
    let c = |hi: f64, lo: f64, cl: f64, v: f64| Candle::new((hi+lo)/2.0, hi, lo, cl, v, 0).unwrap();
    n.batch(&[c(101.0, 99.0, 100.0, 5_000.0); 4]); // session POC ~100
    println!("nearest naked POC ≈ {:.1}", n.value().unwrap());
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

n = ta.NakedPoc(20, 24)
high = ...; low = ...; close = ...; volume = ...
print(n.batch(high, low, close, volume)[-1])
```

### Node

```javascript
const ta = require('wickra');
const n = new ta.NakedPoc(20, 24);
console.log('warmupPeriod:', n.warmupPeriod()); // 20
```

### Streaming

```rust
use wickra::{Candle, Indicator, NakedPoc};

let mut n = NakedPoc::new(20, 24).unwrap();
for candle in feed {
    if let Some(poc) = n.update(candle) {
        // price drifting toward the naked poc -> expect a magnet / reaction
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **Magnet target.** An untested POC above or below price is a likely destination —
   use it as a profit target or a reason to expect a reaction.
2. **Support/resistance.** Price approaching a naked POC often stalls or reverses on
   the first touch as the imbalance is repaired.
3. **Outstanding count.** A growing `naked_count` means many unfilled levels —
   plenty of structure for price to revisit.

## Common pitfalls

- **Session definition.** Set `session_len` to your real session length for
  meaningful POCs.
- **Touch = tested.** A POC is marked tested the instant a bar's range covers it,
  even briefly.
- **Fallback to close.** When no naked POC remains the output equals the close —
  read that as "no outstanding magnet".

## References

Steidlmayer, J. P. — Market Profile; the "naked/virgin POC" concept is widely used
by Market Profile and order-flow traders.

## See also

- [Indicator-CompositeProfile](/Indicators/Indicator-CompositeProfile) — composite POC and value area.
- [Indicator-VolumeProfile](/Indicators/Indicator-VolumeProfile) — the full profile.
- [Indicator-HighLowVolumeNodes](/Indicators/Indicator-HighLowVolumeNodes) — HVN/LVN levels.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
