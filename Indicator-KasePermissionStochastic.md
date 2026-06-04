# KasePermissionStochastic

> Kase Permission Stochastic — Cynthia Kase's double-smoothed stochastic, used as
> a fast/slow "permission" gate for trades in the direction of a higher
> timeframe.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trend & Directional |
| Input type | `Candle` (uses high, low, close) |
| Output type | `KasePermissionStochasticOutput { fast, slow }` |
| Output range | `[0, 100]` per line; `50` when the window is flat |
| Default parameters | `length = 9`, `smooth = 3` via `classic()` |
| Warmup period (`warmup_period()`) | `length + 2·smooth − 2` |
| Interpretation | Fast over slow = permission long; fast under slow = permission short. |

## Formula

```
raw%K = 100 * (close - LL) / (HH - LL)     over `length`  (50 when HH == LL)
fast  = EMA(raw%K, smooth)
slow  = EMA(fast,  smooth)
```

The Permission Stochastic starts from the ordinary stochastic `%K` — the close's
position within the high/low range of the last `length` bars — then smooths it
once into the *fast* line and again into the *slow* line. Kase treats the pair as
a permission filter: the fast line above the slow line (and rising) gives
permission to take longs flagged by a higher-timeframe method, and the reverse
for shorts. A perfectly flat window (`HH == LL`) leaves `%K` undefined and
defaults to the neutral `50`.

Source: `crates/wickra-core/src/indicators/kase_permission_stochastic.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `length` | `usize` | 9       | `>= 1`      | `kase_permission_stochastic.rs:70` | Stochastic lookback. `0` errors with `Error::PeriodZero`. |
| `smooth` | `usize` | 3       | `>= 1`      | `kase_permission_stochastic.rs:70` | EMA period applied twice (fast, then slow). `0` errors. |

(Python class `wickra.KasePermissionStochastic(length, smooth)`; Node
`new ta.KasePermissionStochastic(length, smooth)`.)

## Inputs / Outputs

From `crates/wickra-core/src/indicators/kase_permission_stochastic.rs`:

```rust
use wickra::{Candle, Indicator, KasePermissionStochastic, KasePermissionStochasticOutput};
// KasePermissionStochastic: Input = Candle, Output = KasePermissionStochasticOutput
const _: fn(&mut KasePermissionStochastic, Candle) -> Option<KasePermissionStochasticOutput> =
    <KasePermissionStochastic as Indicator>::update;
```

Two outputs per bar; the indicator reads high/low/close. Node:
`update(high, low, close)` returns `{ fast, slow } | null`; `batch(h[], l[], c[])`
returns a flat `Array<number>` of length `n*2` (`[fast, slow, fast, slow, …]`,
`NaN` for warmup). Python: `update(candle)` returns `(fast, slow) | None`;
`batch(high, low, close)` returns an `(n, 2)` `ndarray`.

## Warmup

`warmup_period()` returns `length + 2·smooth − 2`: the raw `%K` is ready after
`length` bars, then each of the two EMAs seeds over `smooth` values. Pinned by
`accessors_and_metadata` (`warmup_period() == 13` for the classic set) and
`warmup_emits_at_expected_bar`.

## Edge cases

- **Top of range.** `top_of_range_is_high` pins the close at the top of a rising
  range so `raw%K ≈ 100`; both smoothed lines read above `80`.
- **Flat window.** `flat_window_defaults_to_neutral`: constant high/low/close →
  `HH == LL` → `raw%K = 50` → both lines converge to `50`.
- **Reset.** `reset_clears_state` clears the window and both EMAs.
- **Streaming/batch:** `batch_equals_streaming`.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, Indicator, KasePermissionStochastic};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut k = KasePermissionStochastic::new(4, 2)?;
    // A perfectly flat window leaves %K undefined -> neutral 50 on both lines.
    let bars: Vec<Candle> = (0..20)
        .map(|i| Candle::new(10.0, 10.0, 10.0, 10.0, 1.0, i).unwrap())
        .collect();
    let last = k.batch(&bars).into_iter().flatten().last().unwrap();
    println!("fast={} slow={}", last.fast, last.slow);
    Ok(())
}
```

Output:

```
fast=50 slow=50
```

With `HH == LL` the raw stochastic defaults to `50`, so both EMAs settle at `50`.

### Python

```python
import numpy as np
import wickra as ta

k = ta.KasePermissionStochastic(4, 2)
n = 20
flat = np.full(n, 10.0)
out = k.batch(flat, flat, flat)   # (20, 2): [fast, slow] rows, NaN for warmup
print(out[-1])                          # [50. 50.]
```

Output:

```
[50. 50.]
```

### Node

```javascript
const ta = require('wickra');
const k = new ta.KasePermissionStochastic(4, 2);
let last = null;
for (let i = 0; i < 20; i++) last = k.update(10, 10, 10);
console.log(last); // { fast: 50, slow: 50 }
```

Output:

```
{ fast: 50, slow: 50 }
```

### Streaming

```rust
use wickra::{Candle, Indicator, KasePermissionStochastic};

let mut k = KasePermissionStochastic::classic();
let mut last = None;
for i in 0..40 {
    let base = 100.0 + f64::from(i);
    last = k.update(Candle::new(base, base + 2.0, base - 2.0, base + 1.0, 1.0, i64::from(i))?);
}
println!("{last:?}");
# Ok::<(), Box<dyn std::error::Error>>(())
```

## Interpretation

The two lines turn the stochastic into a directional gate:

1. **Permission long.** Fast above slow and rising — momentum agrees with an
   up-side higher-timeframe signal; take the long.
2. **Permission short.** Fast below slow and falling — take the short.
3. **No permission.** Fast and slow tangled or flat near `50` — stand aside;
   the lower timeframe does not confirm.
4. **Overbought/oversold context.** Like any stochastic, readings near `100`/`0`
   add an extremity read on top of the cross.

## Common pitfalls

- **Using it alone.** It is a *permission* filter, designed to confirm a
  separate directional signal, not to generate entries by itself.
- **Double smoothing lag.** Two EMAs make the lines smooth but slow; the cross
  trails the raw stochastic, which is the intended trade-off (fewer whipsaws).
- **Flat-range neutrality.** In a dead-flat window both lines read `50` by
  construction — that is "no information", not a genuine mid-range signal.

## References

Cynthia Kase, *Trading with the Odds*, 1996 — the Kase Permission Stochastic
filter.

## See also

- [Indicator-Stochastic](Indicator-Stochastic) — the raw `%K`/`%D` this smooths twice.
- [Indicator-Ema](Indicator-Ema) — the smoothing applied to the fast and slow lines.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
