# Anchored VWAP (AVWAP)

> A cumulative VWAP whose accumulation begins at a user-chosen
> anchor bar rather than the session open. Useful for measuring
> the volume-weighted "fair price since X" where X is a significant
> event — earnings release, gap day, swing high, news shock.

## Quick reference

| Item                | Value                                                                |
|---------------------|----------------------------------------------------------------------|
| Family              | Volume                                                               |
| Input type          | `Candle` (uses `high`, `low`, `close`, `volume`)                     |
| Output type         | `f64` — VWAP since anchor                                            |
| Output range        | unbounded (price-units)                                              |
| Default parameters  | none — `AnchoredVwap::new()`                                         |
| Warmup period       | `1` after anchor set                                                 |
| Interpretation      | Volume-weighted "fair price" since anchor event                       |

## Formula

```
AVWAP_t = Σ_{i ≥ anchor} (typical_price_i · volume_i)
        / Σ_{i ≥ anchor} volume_i
```

The indicator emits `None` until the first anchored bar has been
ingested. `AnchoredVwap::set_anchor()` re-anchors at the **next**
bar that arrives, clearing the running sums — matching the
conventional "click-to-anchor" trader workflow. See
`crates/wickra-core/src/indicators/anchored_vwap.rs`.

## Parameters

None — `AnchoredVwap::new()` takes no arguments. The anchor is
set imperatively via `set_anchor()`.

## Inputs / Outputs

`Indicator<Input = Candle, Output = f64>`. Python:
`AnchoredVwap(...)` — anchor is typically set externally
before feeding bars; bindings expose `set_anchor()`.

## Warmup

`warmup_period() == 1`. Bar 1 (post-anchor) emits the first
value.

## Edge cases

- **Anchor not yet set.** Returns `None` until first
  `set_anchor()` call AND at least one subsequent bar.
- **Zero-volume bar after anchor.** Contributes nothing; running
  totals don't move. If every bar after the anchor has zero
  volume, AVWAP stays `None`.
- **Re-anchoring.** Clears running sums; next bar restarts the
  accumulation.
- **Reset.** Clears anchor, running sums, and the `has_emitted`
  flag.

## Examples

### Rust

```rust
use wickra::{AnchoredVwap, Candle, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut av = AnchoredVwap::new();
    av.set_anchor();
    for i in 0..10 {
        let b = 100.0 + i as f64;
        let c = Candle::new(b, b + 0.5, b - 0.5, b, 100.0, i)?;
        if let Some(v) = av.update(c) {
            println!("bar {i} AVWAP = {v:.3}");
        }
    }
    Ok(())
}
```

### Python

```python
import numpy as np
import wickra as ta

av = ta.AnchoredVwap()
av.set_anchor()
# ... feed bars
```

### Node

```javascript
const wickra = require('wickra');
const av = new wickra.AnchoredVwap();
av.setAnchor();
// ... feed candles
```

### Streaming

```rust
use wickra::{AnchoredVwap, Candle, Indicator};

let mut av = AnchoredVwap::new();
av.set_anchor();
let candle_stream: Vec<wickra::Candle> = Vec::new(); // your live OHLCV candle feed
fn is_new_significant_event(_bar: Candle) -> bool { false } // your re-anchor predicate
for bar in candle_stream {
    if let Some(v) = av.update(bar) {
        if bar.close > v { /* trading above the anchored fair price */ }
    }
    if is_new_significant_event(bar) {
        av.set_anchor();  // re-anchor at this bar
    }
}
```

## Interpretation

- **Fair price since anchor.** AVWAP at the bar of an earnings
  release tells you "is the stock trading above or below the
  weighted-average price since earnings?". Above = bull
  reaction; below = bear.
- **As dynamic S/R.** AVWAP from a major swing low often acts as
  support during pullbacks; AVWAP from a high acts as
  resistance.
- **Multiple anchors.** Many traders track 2-3 AVWAPs from
  different significant events; price relative to all of them
  defines the regime.

## Common pitfalls

- **Forgetting to set anchor.** Without `set_anchor()`, the
  indicator never emits. The default is no anchor.
- **Re-anchoring mid-bar.** Clears running sums; the next bar
  resets. Use sparingly.
- **Vs RollingVwap.** AVWAP is unbounded-memory; RollingVwap has
  a finite window. Pick AVWAP for "since X"; pick RollingVwap
  for "rolling N bars".

## References

- Brian Shannon, *Maximum Trading Gains with Anchored VWAP*
  (2022) — modern practitioner treatment of AVWAP-based
  trading systems.

## See also

- [Vwap](Indicator-Vwap) — session-cumulative cousin.
- [RollingVwap](Indicator-RollingVwap) — finite-window cousin.
- [Obv](Indicator-Obv) — volume direction sibling.
- [Indicators-Overview](Indicators-Overview) — full taxonomy.
