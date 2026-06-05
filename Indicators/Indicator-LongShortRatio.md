# LongShortRatio

> Aggregate long size divided by aggregate short size — a crowd-positioning
> gauge straight off the venue's long/short feed.

## Quick reference

| Item                | Value                                                          |
|---------------------|----------------------------------------------------------------|
| Family              | Derivatives                                                    |
| Input type          | `DerivativesTick` — a perp / futures market tick               |
| Output type         | `f64` (ratio)                                                 |
| Output range        | `>= 0`; `0` when there are no shorts                          |
| Default parameters  | none                                                           |
| Warmup period       | `1`                                                            |
| Interpretation      | Crowd positioning / contrarian extreme                      |

## Formula

```
longShortRatio = longSize / shortSize        (0 when shortSize == 0)
```

Stateless and O(1). See
`crates/wickra-core/src/indicators/long_short_ratio.rs`.

## Parameters

None. Construct with `LongShortRatio::new()`.

## Inputs / Outputs

`Indicator<Input = DerivativesTick, Output = f64>`. The bindings expose the two
fields this indicator reads: `update(long_size, short_size)`. Python / Node
`batch` accept two equal-length arrays `(long_size, short_size)` and return a
1-D array; WASM is streaming-only.

## Warmup

`warmup_period() == 1`; emits on the first tick.

## Edge cases

- **No shorts.** When `short_size == 0` the ratio is undefined and the indicator
  reports `0.0`.
- **Accounts or size.** The same formula works whether the venue publishes
  account counts or aggregate position size — feed whichever you have, but
  consistently.

## Examples

### Rust

```rust
use wickra::{DerivativesTick, Indicator, LongShortRatio};

fn tick(long: f64, short: f64) -> DerivativesTick {
    DerivativesTick::new(0.0, 100.0, 100.0, 100.0, 0.0, long, short, 0.0, 0.0, 0.0, 0.0, 0)
        .unwrap()
}

let mut lsr = LongShortRatio::new();
assert_eq!(lsr.update(tick(600.0, 400.0)), Some(1.5));
```

### Python

```python
import wickra as ta

lsr = ta.LongShortRatio()
print(lsr.update(600.0, 400.0))  # 1.5
```

### Node

```js
const { LongShortRatio } = require('wickra');

const lsr = new LongShortRatio();
console.log(lsr.update(600, 400)); // 1.5
```

## Interpretation

A ratio above `1` means longs outweigh shorts; below `1` the reverse. Extremes
are a contrarian tell — an overwhelmingly long crowd is fuel for a long squeeze.
Track its drift rather than its absolute level, since the baseline differs by
venue and instrument.

## Common pitfalls

- **Zero reads as `0`, not `∞`.** A market with no shorts returns `0.0` by
  convention; treat that as "undefined", not "minimum".
- **Venue baselines differ.** Compare a venue's ratio to its own history, not
  across venues with different sampling.

## See also

- [TakerBuySellRatio](/Indicators/Indicator-TakerBuySellRatio) — aggressive-flow analogue.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
