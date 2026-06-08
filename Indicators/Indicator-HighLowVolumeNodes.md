# HighLowVolumeNodes

> The price levels of greatest (HVN) and least (LVN) acceptance in a rolling volume
> profile — magnets and rejection zones.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Market Profile |
| Input type | `Candle` (high / low / volume) |
| Output type | `HighLowVolumeNodesOutput { hvn, lvn }` |
| Output range | price levels |
| Default parameters | `(period = 20, bins = 24)` (Python) |
| Warmup period | `period` |
| Interpretation | HVN = magnet / strong S/R; LVN = fast-move / balance edge. |

## Formula

```
build a `bins`-bucket volume profile over the last `period` candles
  (each candle's volume spread across the bins its high-low range spans)
HVN = bin centre of the bucket with the most volume
LVN = bin centre of the traded bucket with the least volume
```

A **High Volume Node** is a heavily-traded, accepted price — a magnet and strong
support/resistance. A **Low Volume Node** is a rejected price that the market moved
through quickly, often marking the edge between balance areas. Source:
`crates/wickra-core/src/indicators/high_low_volume_nodes.rs`.

## Parameters

| Name     | Type    | Default       | Valid range | Source | Description |
|----------|---------|---------------|-------------|--------|-------------|
| `period` | `usize` | `20` (Python) | `>= 1`      | `high_low_volume_nodes.rs:73` | Rolling profile window. |
| `bins`   | `usize` | `24` (Python) | `>= 1`      | `high_low_volume_nodes.rs:73` | Price buckets. `0` for either errors with `Error::PeriodZero`. |

`params()` returns `(period, bins)`; `value` returns the current nodes if ready.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/high_low_volume_nodes.rs`:

```rust
use wickra::{Candle, Indicator, HighLowVolumeNodes, HighLowVolumeNodesOutput};
// HighLowVolumeNodes: Input = Candle, Output = HighLowVolumeNodesOutput
const _: fn(&mut HighLowVolumeNodes, Candle) -> Option<HighLowVolumeNodesOutput> =
    <HighLowVolumeNodes as Indicator>::update;
```

A `Candle` in, an `Option<HighLowVolumeNodesOutput>` out. The Python binding returns
an `(hvn, lvn)` tuple from `update` and an `(n, 2)` array from `batch(high, low,
volume)`; Node returns `{ hvn, lvn }` and a flat `Float64Array` of length `n*2`;
WASM mirrors the object with camelCase keys.

## Warmup

`warmup_period() == period`. The profile window must fill first
(`first_emission_at_warmup_period` pins this).

## Edge cases

- **HVN at the heavy cluster.** A clustered-volume price wins the HVN
  (`hvn_at_heavy_price` pins this).
- **Finite levels.** Both nodes are finite prices (`hvn_at_or_above_low` pins this).
- **Flat window.** A zero-span window puts both nodes at the price (guarded in the
  source).
- **Finiteness.** `Candle::new` rejects non-finite fields, so no in-method guard
  is needed.
- **Reset.** `h.reset()` clears the window and the last value
  (`reset_clears_state`).

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, HighLowVolumeNodes};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut h = HighLowVolumeNodes::new(6, 24)?;
    let c = |hi: f64, lo: f64, v: f64| Candle::new((hi+lo)/2.0, hi, lo, (hi+lo)/2.0, v, 0).unwrap();
    let mut candles: Vec<Candle> = (0..5).map(|_| c(101.0, 99.0, 5_000.0)).collect();
    candles.push(c(121.0, 119.0, 100.0));
    let out = h.batch(&candles).last().unwrap().unwrap();
    println!("HVN near heavy cluster: {}", out.hvn < 110.0);
    Ok(())
}
```

Output:

```
HVN near heavy cluster: true
```

### Python

```python
import numpy as np
import wickra as ta

h = ta.HighLowVolumeNodes(20, 24)
high = ...; low = ...; volume = ...
hvn, lvn = h.batch(high, low, volume).T
```

### Node

```javascript
const ta = require('wickra');
const h = new ta.HighLowVolumeNodes(20, 24);
console.log('warmupPeriod:', h.warmupPeriod()); // 20
```

### Streaming

```rust
use wickra::{Candle, Indicator, HighLowVolumeNodes};

let mut h = HighLowVolumeNodes::new(20, 24).unwrap();
for candle in feed {
    if let Some(n) = h.update(candle) {
        // price approaching n.hvn -> expect support/resistance; n.lvn -> expect a fast move
    }
}
```

Streaming `update` and `batch` are equivalent tick-for-tick
(`batch_equals_streaming` pins this).

## Interpretation

1. **HVN as S/R.** Expect price to stall and rotate around an HVN; fades back to it
   are mean-reversion setups.
2. **LVN as accelerant.** Breakouts move fast through LVNs; use them as targets or
   breakout triggers.
3. **Structure map.** HVNs and LVNs together outline the market's balance and
   imbalance zones.

## Common pitfalls

- **Bin resolution.** Too few bins blur nodes; too many fragment volume and create
  spurious LVNs.
- **Window choice.** Match the window to the structure you care about (intraday vs.
  swing).
- **Needs volume.** On synthetic volume the nodes are meaningless.

## References

Steidlmayer, J. P., & Dalton, J. F. — Market Profile theory; Dalton, J. F. (1993),
*Mind Over Markets*.

## See also

- [Indicator-VolumeProfile](/Indicators/Indicator-VolumeProfile) — the full profile.
- [Indicator-ValueArea](/Indicators/Indicator-ValueArea) — the 70% value area.
- [Indicator-NakedPoc](/Indicators/Indicator-NakedPoc) — untested points of control.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
